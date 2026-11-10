#!/usr/bin/env bash
# Dumps the K-WAIS database. Run from cron, e.g. daily at 02:30:
#   30 2 * * * /home/ubuntu/kwais/deploy/backup.sh >> /home/ubuntu/kwais-backups/backup.log 2>&1
set -euo pipefail
cd "$(dirname "$0")/.."

dir="${BACKUP_DIR:-$HOME/kwais-backups}"
keep_days="${BACKUP_KEEP_DAYS:-14}"
mkdir -p "$dir"

file="$dir/kwais-$(date +%Y%m%d-%H%M).dump"
docker compose -f docker-compose.ec2.yml exec -T db pg_dump -U kwais --format=custom kwais > "$file"
find "$dir" -name 'kwais-*.dump' -mtime +"$keep_days" -delete
echo "$(date -Is) saved $file ($(du -h "$file" | cut -f1))"
