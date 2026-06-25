#!/usr/bin/env bash
# Restore a snapshot produced by snapshot.sh. REQUIRES the off-server age private key.
#
#   restore.sh <snapshot.age> <age-private-key-file>
#
# Restores the database (pg_dump --clean, so it drops+recreates objects) and the
# media tree IN PLACE — this OVERWRITES current data. The snapshot's .env is written
# to ~/folio-snapshot-env (chmod 600) for you to apply manually if needed.
set -euo pipefail

SNAP=${1:?usage: restore.sh <snapshot.age> <age-private-key-file>}
KEY=${2:?usage: restore.sh <snapshot.age> <age-private-key-file>}
BACKEND=/home/ubuntu/apps/folio.stevencox.org/backend
MEDIA=/var/www/folio/media

STAGE=$(mktemp -d); trap 'rm -rf "$STAGE"' EXIT
age -d -i "$KEY" "$SNAP" | zstd -d | tar -C "$STAGE" -x

echo "=== snapshot manifest ==="
cat "$STAGE/manifest.txt"
echo
read -rp "Restore DB + media from this snapshot? This OVERWRITES current data. [y/N] " ok
[ "$ok" = "y" ] || { echo "aborted."; exit 1; }

DBURL=$(grep -E '^DATABASE_URL=' "$BACKEND/.env" | cut -d= -f2-)
psql -v ON_ERROR_STOP=1 "$DBURL" -f "$STAGE/dump.sql"
mkdir -p "$MEDIA"
rsync -a --delete "$STAGE/media/" "$MEDIA/"

install -m 600 "$STAGE/env" "$HOME/folio-snapshot-env"
echo
echo "DB + media restored."
echo "Snapshot's .env written to ~/folio-snapshot-env (review/apply if this is a fresh server)."
echo "For an exact match, also: git -C $BACKEND/.. checkout <manifest code_commit>, rebuild+deploy the frontend."
echo "Then: sudo systemctl restart folio-backend.service"
