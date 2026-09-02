# DigitalOcean Deployment

This deployment targets one DigitalOcean VPS:

- Caddy terminates HTTPS and serves `wiki/dist`.
- Caddy proxies `/api/*` to the API on `127.0.0.1:3001`.
- systemd runs one API process as the `campaign-notes` user.
- SQLite and local backups live under `/var/lib/campaign-notes`.
- GitHub Actions performs CI automatically and production deployment only from a manual run or `v*.*.*` tag.

## Provisioning

Install Ubuntu LTS, Node.js 22, Caddy, SQLite tooling, and `curl`. Create a
dedicated `campaign-notes` service user and a separate `deploy` SSH user.

Create these directories:

```bash
sudo install -d -o campaign-notes -g campaign-notes -m 750 \
  /opt/campaign-notes/releases \
  /opt/campaign-notes/incoming \
  /var/lib/campaign-notes/backups
```

Install `deploy/campaign-notes.service` into `/etc/systemd/system/`. Install
`deploy/campaign-notes-activate` at `/usr/local/sbin/` with mode `750`, owned by
`root:root`, and configure a narrow sudo rule allowing `deploy` to run that
activation script.

Install `deploy/Caddyfile` after replacing `campaign.example.com` with the
real DNS name. Point the domain's A record at the VPS before starting Caddy.

## API environment

Create `/etc/campaign-notes/api.env` with mode `600` and owner
`campaign-notes:campaign-notes`. Use production secrets and persistent paths:

```env
NODE_ENV=production
PORT=3001
JWT_ACCESS_SECRET=<random 32+ character secret>
JWT_REFRESH_SECRET=<different random 32+ character secret>
COOKIE_SECURE=true
COOKIE_SAMESITE=strict
CORS_ORIGINS=https://campaign.example.com
TRUST_PROXY=true
DB_PATH=/var/lib/campaign-notes/campaign.db
DB_BACKUP_DIR=/var/lib/campaign-notes/backups
```

Do not commit this file, the database, or production backups.

## GitHub secrets

Configure these repository/environment secrets:

- `VPS_HOST`: VPS hostname or IP
- `VPS_USER`: `deploy`
- `VPS_SSH_KEY`: private key for the deploy user
- `SMOKE_BASE_URL`: `https://campaign.example.com`

Add the VPS host key to the repository or replace the workflow's
`ssh-keyscan` step with a pinned `known_hosts` value before treating this as a
high-assurance deployment.

## Release flow

CI runs on pull requests and pushes to `main`:

```bash
npm ci
npm run release:verify
npm run release:package
```

Production deployment runs manually from GitHub Actions or when a version tag
such as `v1.0.0` is pushed. The activation script extracts an immutable release,
installs production dependencies, stops the old API, lets startup apply pending
migrations, atomically switches the `current` symlink, restarts systemd, and
checks `/health`. A failed activation restores the previous symlink and service.

Create a database backup before deployment:

```bash
sudo -u campaign-notes npm --prefix /opt/campaign-notes/current/api run backup
```

Copy backups to encrypted off-host storage and perform a restore drill before
the first public release. The activation script does not seed example data.

## First deployment checklist

1. Create the VPS, service user, deploy user, firewall rules, and persistent directories.
2. Point DNS at the VPS and install Caddy.
3. Create `/etc/campaign-notes/api.env` and verify its permissions.
4. Install and enable the systemd service and activation script.
5. Configure GitHub environment secrets.
6. Run CI and trigger a manual deployment.
7. Verify HTTPS, direct navigation to a nested wiki URL, login, refresh, logout, DM access, and player visibility.
8. Run and verify an off-host backup.