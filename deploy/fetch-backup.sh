#!/usr/bin/env bash
# Creates a fresh production backup, downloads it locally, verifies it, and
# cleans up the remote staging copy. See database-backup-to-local.md for the
# manual step-by-step version this automates.
set -Eeuo pipefail

script_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &> /dev/null && pwd)
local_config="$script_dir/fetch-backup.local.sh"

# VPS_HOST/DEPLOY_KEY are environment-specific, so they live in this gitignored
# file instead of being hardcoded here. Copy fetch-backup.local.sh.example to
# get started.
if [[ -f "$local_config" ]]; then
    # shellcheck source=/dev/null
    source "$local_config"
fi

if [[ -z "${VPS_HOST:-}" || -z "${DEPLOY_KEY:-}" ]]; then
    echo "fetch-backup: VPS_HOST and DEPLOY_KEY must be set (copy $script_dir/fetch-backup.local.sh.example to $local_config and fill it in, or export them yourself)" >&2
    exit 1
fi

REMOTE_TRANSFER=/home/deploy/campaign-notes-backup.db
LOCAL_DEST="${LOCAL_DEST:-$HOME/campaign-notes-backup-$(date +%Y-%m-%d).db}"

echo "Creating backup on $VPS_HOST and staging it for download..."
ssh root@"$VPS_HOST" bash -s <<'REMOTE'
set -Eeuo pipefail
backup_path=$(sudo -u campaign-notes /usr/local/sbin/with-env.sh \
  npm --prefix /opt/campaign-notes/current/api run backup \
  | sed -n 's/^Database backup created: //p')

if [[ -z "$backup_path" ]]; then
    echo "fetch-backup: could not determine backup path from npm output" >&2
    exit 1
fi

cp -- "$backup_path" /home/deploy/campaign-notes-backup.db
chown deploy:deploy /home/deploy/campaign-notes-backup.db
chmod 600 /home/deploy/campaign-notes-backup.db
REMOTE

echo "Downloading to $LOCAL_DEST..."
scp -i "$DEPLOY_KEY" "deploy@$VPS_HOST:$REMOTE_TRANSFER" "$LOCAL_DEST"
chmod 600 "$LOCAL_DEST"

echo "Verifying local backup integrity..."
integrity_result=$(sqlite3 "$LOCAL_DEST" 'PRAGMA integrity_check;')
if [[ "$integrity_result" != "ok" ]]; then
    echo "fetch-backup: integrity check failed: $integrity_result" >&2
    exit 1
fi

echo "Removing remote staging copy..."
ssh root@"$VPS_HOST" rm -f "$REMOTE_TRANSFER"

echo "Backup downloaded and verified: $LOCAL_DEST"
