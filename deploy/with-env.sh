#!/usr/bin/env bash
# Loads /etc/campaign-notes/api.env, then execs the given command with that
# environment applied. Use this for any ad-hoc production command (backup,
# one-off migrate/seed, debugging) so it sees the same DB_PATH/DB_BACKUP_DIR/
# etc. that the systemd service gets via EnvironmentFile=.
set -Eeuo pipefail

env_file=/etc/campaign-notes/api.env

if [[ ! -r "$env_file" ]]; then
    echo "with-env.sh: cannot read $env_file" >&2
    exit 1
fi

if [[ $# -eq 0 ]]; then
    echo "Usage: with-env.sh <command> [args...]" >&2
    exit 1
fi

set -a
# shellcheck source=/dev/null
source "$env_file"
set +a

exec "$@"
