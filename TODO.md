# TODO — Manual Setup & Pre-Launch

Things that can't be done in code or that require your account / credentials.
Group by when they need to happen.

---

## Before turning on CI branch protection

There are 9 pre-existing test failures in the search module that pre-date
Batch A. CI will be **red on first push** until these are addressed. Branch
protection on `master` (see below) only makes sense once CI is green.

Failures, all in `backend/`:

- `tests/test_routes.py::test_search_returns_results[asyncio]` —
  `sqlite3.OperationalError`. The in-memory test fixture in
  [backend/tests/conftest.py](backend/tests/conftest.py) creates
  `food_macros` and `food_portions` but not the `food_search` FTS5 virtual
  table that `/api/search` queries.
- `tests/test_routes.py::test_search_returns_results[trio]` — same root cause.
- 7 `tests/test_search.py::test_*` failures —
  `KeyError: 'data_type'`. The `SAMPLE_FOODS` dicts in that file lack the
  `data_type` key that `app/search.py:35` reads.

**Two paths to fix:**
1. **Add `food_search` + the `data_type` column to the test fixture** (the
   right answer — keeps coverage). Roughly: in `conftest.py`, create the FTS5
   virtual table after `food_macros`, populate it with `INSERT INTO
   food_search(rowid, description) SELECT fdc_id, description FROM food_macros`,
   and add `data_type` strings to `SAMPLE_FOODS` in `test_search.py`.
2. **Skip them temporarily** by adding `--deselect` flags in
   `.github/workflows/ci.yml`. Fast but hides real coverage gaps.

Recommend option 1. Estimated effort: ~30 min.

---

## GitHub setup (after CI is green)

### Enable branch protection on `master`
1. Repo → **Settings** → **Branches** → **Add branch protection rule**.
2. Branch name pattern: `master`.
3. Check **Require status checks to pass before merging**.
4. Search and select all three CI jobs: `backend-test`, `frontend-build`,
   `docker-build`.
5. Check **Require branches to be up to date before merging** (forces a
   rebase before merging stale PRs).
6. Optional but recommended: **Do not allow bypassing the above settings**
   (applies the rule to admins too — saves you from yourself at 1 a.m.).
7. Save.

### Verify the workflow ran at least once
Push any commit to `Development` first so the three jobs register with
GitHub. The branch protection UI only lets you select checks GitHub has
seen run before.

---

## Production monitoring

### UptimeRobot
1. Sign up free at <https://uptimerobot.com>.
2. **+ Add New Monitor** → Monitor Type: **HTTP(s)** → URL:
   `https://YOUR-DOMAIN/api/health` → Monitoring Interval: **5 minutes** → save.
3. **My Settings** → **Alert Contacts** → add at minimum your email; SMS
   and the mobile-app push are both worth it.
4. Back on the monitor, **Edit** → check the alert contact you just added.
5. Verify alerting works by stopping the backend container on the host:
   `docker compose stop backend` → wait 10 minutes → you should get an
   email. `docker compose start backend` → "resolved" email follows.

Free tier limits: 50 monitors, 5-min interval, email/SMS/push alerts. Plenty.

---

## Pre-launch checklist (from earlier audit)

These are one-time tasks that block AdSense / TLS / users-actually-finding-the-site.

### Domain + DNS
- [ ] Buy / claim the production domain.
- [ ] Point its A record at the Hetzner host's IP.
- [ ] Verify with `dig +short your-domain.com` before deploying — Caddy's
      Let's Encrypt challenge will fail otherwise and may rate-limit you.

### Server-side config
- [ ] On the Hetzner host, populate `/opt/nutritionlabels/.env`:
  - `DOMAIN` → the real domain (currently `nutritionlabels.example.com`
    in `.env`).
  - `ALLOWED_HOSTS` → JSON array with your real domain plus `localhost`.
  - `RELEASE_SHA` → wire to `$(git rev-parse --short HEAD)` in your
    deploy command (see [docs/DEPLOY.md](docs/DEPLOY.md)).

### Backups
- [ ] Install `scripts/backup_db.sh` as a daily cron on the host
      (instructions in [docs/DEPLOY.md](docs/DEPLOY.md)).
- [ ] **Set up off-host backup rotation** (rclone to B2/S3 or rsync to
      another host). A backup that lives only on the host being backed
      up is not a backup.

### AdSense (only when ready to monetize)
- [ ] Apply at AdSense, get your `ca-pub-XXXXXXXXXXXXXXXX` publisher ID.
- [ ] Uncomment + populate the `<meta name="google-adsense-account">`
      tag in [frontend/index.html:21-23](frontend/index.html:21).
- [ ] Replace the placeholder block in [frontend/dist/ads.txt](frontend/dist/ads.txt)
      with the single real line:
      `google.com, pub-XXXXXXXXXXXXXXXX, DIRECT, f08c47fec0942fa0`.
- [ ] In your build environment / CI: set `VITE_ADSENSE_PUBLISHER_ID` and
      `VITE_ADSENSE_SIDEBAR_SLOT` env vars before `npm run build`.

### Legal
- [ ] Get [PrivacyPage.tsx](frontend/src/pages/PrivacyPage.tsx) reviewed
      by a lawyer before serving EU/UK/CH traffic with AdSense enabled.
      The file's own comment flags this.

---

## Later (not blocking)

- [ ] **Add CD** (auto-deploy on push to master) once you've manually
      deployed enough times to find it annoying. Requires putting an SSH
      key for `deploy@hetzner` in GitHub Actions secrets — meaningful
      blast-radius decision; not worth doing on day one.
- [ ] **Drop `'unsafe-inline'` from `script-src`** in
      [frontend/security-headers.conf](frontend/security-headers.conf).
      Requires reworking AdSense to use programmatic ad injection from a
      hashed bundle file. Tracked from the original audit (#17).
- [ ] **Latency monitoring** — UptimeRobot free tier only checks status
      codes. If `/api/health` starts taking 4s because the SQLite DB is
      fragmenting, you won't know. Defer until you have real users.
- [ ] **Per-food portion units** in the unit-conversion feature — the
      food detail endpoint already returns `portions` (e.g. "1 tbsp =
      14.2 g"). Wiring those into the unit picker would be a nice
      follow-up after the simple g/oz/lb/kg/ml version ships.
