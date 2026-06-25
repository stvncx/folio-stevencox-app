# Backups

Encrypted, full-system restore points for **folio.stevencox.org** (same design as
the notes app).

## What a snapshot contains
- `dump.sql` — `pg_dump --clean` of `folio_db` (all content)
- `media/` — `/var/www/folio/media`
- `env` — `backend/.env` (SECRET_KEY, DB creds, ANTHROPIC_API_KEY, etc.)
- `manifest.txt` — metadata, including the **code commit** the snapshot pairs with

Bundled (`tar` + `zstd`) and **age-encrypted** to the public key in
`age-recipient.txt`. The matching **private key is off-server** (Steven's password
manager) — the SAME key used for the notes app. Without it, snapshots cannot be
decrypted, by anyone.

## Where snapshots live
Orphan **`backups`** branch of this repo on GitHub. `snapshot.age` is overwritten
each run; git history holds every restore point. `manifest.txt` is committed in
plaintext (no secrets). Server worktree: `/home/ubuntu/apps/folio-backups`.

## Take a snapshot now
```
/home/ubuntu/apps/folio.stevencox.org/backup/snapshot.sh
```
A systemd timer (`folio-backup.timer`) also runs it **daily at 10:10 UTC**.

## Restore a set point
1. Pick the point:
   ```
   git -C /home/ubuntu/apps/folio-backups log --oneline
   git -C /home/ubuntu/apps/folio-backups checkout <commit>   # gets that snapshot.age
   ```
2. Decrypt + restore (needs your private key file):
   ```
   /home/ubuntu/apps/folio.stevencox.org/backup/restore.sh \
       /home/ubuntu/apps/folio-backups/snapshot.age  /path/to/your-age-key.txt
   ```
3. For an exact match, also check out the manifest's code commit on `main`,
   rebuild+deploy the frontend, and `sudo systemctl restart folio-backend.service`.

## Keys
- Encryption recipient (public, safe to commit): `age-recipient.txt`
- **Private key: OFF-SERVER ONLY** (shared with the notes app). If lost, backups
  are unrecoverable.
