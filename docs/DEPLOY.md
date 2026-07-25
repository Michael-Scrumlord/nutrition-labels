# Deploy

Single-host VPS deploy. Everything runs in Docker behind Caddy; no managed
services. Targets Hetzner Cloud but works on any Linux box with Docker.

For the one-time setup tasks that live outside the repo (UptimeRobot
account, GitHub branch protection, AdSense publisher ID, lawyer review of
the privacy policy), see [../TODO.md](../TODO.md).

## One-time host setup

1. Provision a 4 GB / 2 vCPU VPS (Hetzner CX22 or similar).
2. Create a non-root `deploy` user with sudo + SSH key, disable root SSH
   and password auth in `/etc/ssh/sshd_config`.
3. Open exactly three ports:
   ```
   sudo ufw allow 22 && sudo ufw allow 80 && sudo ufw allow 443 && sudo ufw enable
   ```
4. Install Docker + the compose plugin from Docker's official apt repo.
5. Point your DNS A record at the host's IP. **Wait for propagation**
   (`dig +short your-domain.com` should return the host's IP) before
   the first deploy — otherwise Caddy can't complete the ACME challenge
   and you'll burn through Let's Encrypt rate limits.

## First deploy

```bash
# As the deploy user, in /opt
git clone <repo-url> nutritionlabels
cd nutritionlabels

# Populate the production env file
cp .env.example .env
# Edit .env: set DOMAIN to your real domain, ALLOWED_HOSTS to match,
# and RELEASE_SHA to $(git rev-parse --short HEAD).

# Fetch USDA source data (~180 MB extracted; one-time per host)
bash scripts/download_fdc.sh

# Bring everything up. db-init runs first (5–15 min on 2 vCPUs),
# builds nutrition.db on the named volume, then exits.
docker compose up --build -d

# Tail logs and watch Caddy obtain its certificate
docker compose logs -f
```

The first build also compiles Caddy with the `caddy-ratelimit` plugin
(see `caddy/Dockerfile`) — this adds ~2 minutes to the initial build.

## Day-to-day deploy

From your laptop:

```bash
ssh deploy@host "cd /opt/nutritionlabels && \
    git pull && \
    RELEASE_SHA=\$(git rev-parse --short HEAD) docker compose up --build -d"
```

Stick that in a shell alias or Makefile target. Total time per deploy is
~60 seconds once images are warm in the build cache.

## Backups

The SQLite DB lives on the `nutritionlabels_nutrition_db` Docker volume.
[`scripts/backup_db.sh`](../scripts/backup_db.sh) snapshots it to a
timestamped tarball under `/var/backups/nutritionlabels/` and prunes
anything older than 7 days.

Install as a daily cron (run as the `deploy` user, which must be in the
`docker` group):

```bash
sudo install -m 0755 /opt/nutritionlabels/scripts/backup_db.sh /usr/local/sbin/backup_db.sh
crontab -e
# Add:
0 3 * * * /usr/local/sbin/backup_db.sh >> /var/log/nl-backup.log 2>&1
```

**Off-host rotation is required.** A backup that lives only on the host
it's backing up is not a backup. Pair the local cron with `rclone copy`
to Backblaze B2 / S3 / another VPS, or `rsync` the directory off after
each run. Minimum acceptable setup: a second cron 30 minutes after the
first that pushes the latest tarball off-host.

## Edge rate limiting

**Known drift:** [Caddyfile](../Caddyfile) still declares a `rate_limit`
zone capping `/api/generate_label` at 10 req/minute via the
`caddy-ratelimit` plugin. That endpoint was retired — PDF generation moved
entirely client-side (see [architecture-overview.md](architecture-overview.md))
— so this rule now matches no live route and is a no-op. It's flagged here
rather than silently removed from `Caddyfile`, since that's an infra change
with its own review; if you're touching `Caddyfile` anyway, this block is
safe to delete.

The in-process `slowapi` limits in FastAPI (`GET /api/search` at 60/min,
`GET /api/food/{fdc_id}` at 120/min) are unaffected and remain the only
active rate limiting today.

## Monitoring

Wire UptimeRobot (free tier) to `https://your-domain/api/health` with a
5-minute interval and email alerts. The health endpoint probes the
SQLite DB, so a missing/corrupt volume will surface as a 503 (and a
fired alert) rather than silently degrading.

## Rollback

```bash
ssh deploy@host
cd /opt/nutritionlabels
git log --oneline -n 10                    # find the last-known-good SHA
git checkout <sha>
docker compose up --build -d
```

If the volume is the problem, restore from a tarball:

```bash
docker compose down
docker volume rm nutritionlabels_nutrition_db
docker volume create nutritionlabels_nutrition_db
docker run --rm \
    -v nutritionlabels_nutrition_db:/db \
    -v /var/backups/nutritionlabels:/backups \
    alpine tar xzf /backups/nutrition_db-<stamp>.tgz -C /
docker compose up -d
```
