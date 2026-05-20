#!/usr/bin/env bash
# backup_db.sh — snapshot the nutrition_db Docker volume to a tarball.
#
# Run as a daily cron on the production host. Each invocation produces one
# timestamped archive under BACKUP_DIR and prunes anything older than
# RETENTION_DAYS.
#
# Suggested crontab line (run as the deploy user):
#   0 3 * * * /opt/nutritionlabels/scripts/backup_db.sh >> /var/log/nl-backup.log 2>&1
#
# IMPORTANT — a backup that only lives on the same host it's backing up is
# not really a backup. Pair this with off-host rotation (rclone to B2 / S3
# / another VPS). See docs/DEPLOY.md.

set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/var/backups/nutritionlabels}"
VOLUME_NAME="${VOLUME_NAME:-nutritionlabels_nutrition_db}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"

mkdir -p "$BACKUP_DIR"

STAMP="$(date +%F-%H%M)"
OUT="$BACKUP_DIR/nutrition_db-${STAMP}.tgz"

echo "[$(date -Iseconds)] starting backup of volume '${VOLUME_NAME}' → ${OUT}"

# Mount the volume read-only into a throwaway alpine container and tar it.
# The volume name follows docker compose's `<project>_<volume>` convention;
# verify with `docker volume ls` if this script can't find it.
docker run --rm \
    -v "${VOLUME_NAME}:/db:ro" \
    -v "${BACKUP_DIR}:/out" \
    alpine \
    tar czf "/out/$(basename "$OUT")" -C / db

SIZE="$(du -h "$OUT" | cut -f1)"
echo "[$(date -Iseconds)] wrote ${OUT} (${SIZE})"

# Prune old backups. -mtime +N means "modified more than N*24h ago".
DELETED="$(find "$BACKUP_DIR" -maxdepth 1 -name 'nutrition_db-*.tgz' -mtime "+${RETENTION_DAYS}" -print -delete | wc -l | tr -d ' ')"
echo "[$(date -Iseconds)] pruned ${DELETED} backups older than ${RETENTION_DAYS} days"
