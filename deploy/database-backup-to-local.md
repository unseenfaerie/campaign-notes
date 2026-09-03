# Download a Database Backup to a Local Machine

These instructions create a consistent SQLite backup on the VPS, download it
using the `deploy` SSH account, verify it locally, and remove the temporary
transfer copy from the VPS.

The production database is `/var/lib/campaign-notes/campaign.db`. The API's
backup command writes timestamped backups to
`/var/lib/campaign-notes/backups/` using the configured `DB_BACKUP_DIR`.

## 1. Create a backup on the VPS

Connect to the VPS as `root` or as an account with the required sudo access.
Run the backup as the `campaign-notes` service user:

```bash
sudo -u campaign-notes npm --prefix /opt/campaign-notes/current/api run backup
```

The command prints the exact path of the new backup. It will look like:

```text
Database backup created: /var/lib/campaign-notes/backups/campaign_backup_2026-09-03T12-34-56-000Z.db
```

Copy the path from that output into the commands below. Alternatively, list
backups and use the newest one:

```bash
ls -lt /var/lib/campaign-notes/backups
```

Set the path in a shell variable on the VPS. Replace the example filename with
the actual backup filename:

```bash
backup_path=/var/lib/campaign-notes/backups/campaign_backup_2026-09-03T12-34-56-000Z.db
```

## 2. Stage a temporary download copy

The backup directory is owned by `campaign-notes`, so `deploy` cannot normally
read files there. As `root`, copy the backup to the deploy user's home
directory and give the temporary file restrictive ownership and permissions:

```bash
transfer_path=/home/deploy/campaign-notes-backup.db

cp -- "$backup_path" "$transfer_path"
chown deploy:deploy "$transfer_path"
chmod 600 "$transfer_path"

stat -c '%n: mode=%a owner=%U group=%G size=%s' "$transfer_path"
```

Expected ownership and mode are `600 deploy deploy`. Do not make the file
world-readable or place it in `/home/deploy/public_html` or another served
directory.

## 3. Download it to the local machine

Run this from the repository's local machine, not from the VPS:

```bash
scp -i ~/.ssh/campaign-notes-deploy-real \
  deploy@167.99.1.250:/home/deploy/campaign-notes-backup.db \
  ~/campaign-notes-backup-$(date +%Y-%m-%d).db
```

If your key or VPS address differs, replace the `-i` path or host as needed.

Protect the local copy:

```bash
chmod 600 ~/campaign-notes-backup-$(date +%Y-%m-%d).db
```

If the date has changed between commands, use the actual downloaded filename:

```bash
ls -lt ~/campaign-notes-backup-*.db | head
chmod 600 ~/campaign-notes-backup-YYYY-MM-DD.db
```

## 4. Verify the local backup

SQLite's integrity check should return exactly `ok`:

```bash
sqlite3 ~/campaign-notes-backup-YYYY-MM-DD.db \
  'PRAGMA integrity_check;'
```

You can also confirm that the expected tables are present:

```bash
sqlite3 ~/campaign-notes-backup-YYYY-MM-DD.db '.tables'
```

The backup contains sensitive data, including campaign information, users,
password hashes, and possibly refresh sessions. Store it in an encrypted
location and do not commit it to Git or upload it to a public service.

## 5. Remove the temporary VPS copy

After verifying the local copy, return to the VPS and remove the temporary
staged file:

```bash
rm -f /home/deploy/campaign-notes-backup.db
```

The original timestamped backup remains in
`/var/lib/campaign-notes/backups/` and is still subject to the configured
backup retention policy.

## Optional: verify the downloaded file's checksum

For an additional transfer check, run this on the local machine:

```bash
sha256sum ~/campaign-notes-backup-YYYY-MM-DD.db
```

Before downloading, run this on the VPS against the staged file:

```bash
sha256sum /home/deploy/campaign-notes-backup.db
```

The two hashes should match. This is optional because `scp` already verifies
the encrypted transfer, but it can help confirm that the intended file was
copied.
