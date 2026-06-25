#!/usr/bin/env bash
# Encrypted full-system snapshot of folio.stevencox.org, pushed to the orphan
# 'backups' branch on GitHub. Bundles the DB dump + media + .env, compressed and
# age-encrypted to a key whose PRIVATE half lives off-server (see README.md).
# Each run is one commit on 'backups' = one restore point.
set -euo pipefail
export PATH=/usr/local/bin:/usr/bin:/bin:${PATH:-}

# Prevent overlapping runs (the daily timer and any manual run).
exec 9>/tmp/folio-backup.lock
flock -n 9 || { echo "another snapshot is already running"; exit 0; }

LAST_SUCCESS=/home/ubuntu/.folio-backup-last-success
APP=/home/ubuntu/apps/folio.stevencox.org
BACKEND="$APP/backend"
WORKTREE=/home/ubuntu/apps/folio-backups        # git worktree checked out to 'backups'
MEDIA=/var/www/folio/media
RECIPIENT=$(tr -d '[:space:]' < "$APP/backup/age-recipient.txt")

DBURL=$(grep -E '^DATABASE_URL=' "$BACKEND/.env" | cut -d= -f2-)
TS=$(date -u +%Y%m%d-%H%M%S)
CODE=$(git -C "$APP" rev-parse HEAD)

STAGE=$(mktemp -d)
trap 'rm -rf "$STAGE"' EXIT

pg_dump --clean --if-exists "$DBURL" > "$STAGE/dump.sql"
mkdir -p "$STAGE/media"
[ -d "$MEDIA" ] && cp -a "$MEDIA/." "$STAGE/media/" 2>/dev/null || true
cp "$BACKEND/.env" "$STAGE/env"
cat > "$STAGE/manifest.txt" <<EOF
snapshot:    $TS
created_utc: $(date -u +%FT%TZ)
host:        $(hostname)
code_commit: $CODE
db:          folio_db
dump_bytes:  $(wc -c < "$STAGE/dump.sql")
media_files: $(find "$STAGE/media" -type f | wc -l)
EOF

# bundle -> compress -> encrypt (private key needed to reverse this lives off-server)
tar -C "$STAGE" -cf - dump.sql media env manifest.txt \
  | zstd -19 -q \
  | age -r "$RECIPIENT" -o "$WORKTREE/snapshot.age"
cp "$STAGE/manifest.txt" "$WORKTREE/manifest.txt"   # plaintext metadata; no secrets

cd "$WORKTREE"
git add snapshot.age manifest.txt
if git diff --cached --quiet; then
  date -u +%FT%TZ > "$LAST_SUCCESS"
  echo "no changes since last snapshot; nothing to commit"
  exit 0
fi
git commit -q -m "snapshot $TS (code ${CODE:0:10}, $(wc -c < snapshot.age)B)"
GIT_SSH_COMMAND='ssh -o StrictHostKeyChecking=no' git push -q origin backups
date -u +%FT%TZ > "$LAST_SUCCESS"
echo "snapshot $TS pushed ($(wc -c < snapshot.age) bytes encrypted)"
