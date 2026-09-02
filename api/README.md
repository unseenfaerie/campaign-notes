# Campaign Notes API

Manifest-driven API for Campaign Notes. This package owns the backend runtime for both:

- A generic manifest data router for entities and relation tables
- A domain router that exposes entity-centric CRUD and related-record lookup flows

Definitions come from [../common/domainManifest.js](../common/domainManifest.js).

## To Do

[x] finish all CRUD routes in domain router for entities and relations (create, get all, get one, update, delete)
[ ] enums for certain fields (character type)/more heavy duty validation
[ ] sort out booleans in manifest. i want them

## What This API Does

- Initializes SQLite schema from the domain manifest
- Exposes generic data routes for manifest resources
- Exposes domain routes for entity CRUD and associated record loading
- Validates and type-checks payloads and filters from manifest field definitions

Core files:

- [server.js](server.js): Express app and startup
- [routes/dataRouter.js](routes/dataRouter.js): Generic data endpoints under `/api/data`
- [routes/domainRouter.js](routes/domainRouter.js): Domain-oriented endpoints under `/api`
- [data/genericCrudService.js](data/genericCrudService.js): Manifest-driven data layer
- [data/db.js](data/db.js): DB connection and schema init orchestration
- [data/schemaBuilder.js](data/schemaBuilder.js): SQL generation from manifest
- [scripts/seed.js](scripts/seed.js): Example data seeding
- [scripts/seedUsers.defaults.js](scripts/seedUsers.defaults.js): Default seeded auth users
- [scripts/seedUsers.local.example.js](scripts/seedUsers.local.example.js): Local-only credentials template
- [scripts/validateSeed.js](scripts/validateSeed.js): Seed row-value count validator

## Install

From workspace root:

```bash
npm install
```

Or from this folder only:

```bash
cd api
npm install
```

## Run

From workspace root:

```bash
npm --workspace api run start
```

From this folder:

```bash
npm run start
```

Run tests:

```bash
npm run test
```

Run seed validation script:

```bash
node scripts/validateSeed.js
```

Run seed script:

```bash
node scripts/seed.js
```

The database path is controlled by `DB_PATH` and defaults to `api/campaign.db`.
Keep the configured database path on persistent storage in deployed environments.

Create a consistent SQLite backup and prune backups older than
`BACKUP_RETENTION_DAYS`:

```bash
npm run backup
```

Copy backups to encrypted off-host storage and periodically verify that one can
be opened as a separate SQLite database. Example seeding is blocked when
`NODE_ENV=production` unless `ALLOW_SEED=true` is set intentionally.

Check the current schema migration status:

```bash
npm run migrate -- status
```

Apply pending forward-only migrations before starting the new application
version:

```bash
npm run migrate -- latest
```

Deployments should create a backup, stop or drain the old API process, apply
migrations, start the new process, and then verify `/health`. Automatic
rollback is not supported; restore a verified backup and deploy a compatible
application version if recovery is required.

Optional local credential override (kept out of git):

```bash
cp scripts/seedUsers.local.example.js scripts/seedUsers.local.js
```

Then edit `scripts/seedUsers.local.js` with your local nonprod usernames/passwords.

Default port: `3001`

Health check:

```bash
curl http://localhost:3001/health
```

## Auth Configuration

Checked-in template:

- [api/.env.example](/home/faerie/Source/campaign-notes/api/.env.example)

For local development, create `api/.env` from that template.

Set these environment variables before running in non-local environments:

- `JWT_ACCESS_SECRET` (required for production)
- `JWT_REFRESH_SECRET` (required for production)
- `ACCESS_TOKEN_TTL` (default: `15m`)
- `REFRESH_TOKEN_TTL` (default: `30d`)
- `COOKIE_SECURE` (`true` in production over HTTPS)
- `COOKIE_SAMESITE` (default: `strict`)
- `REQUEST_BODY_LIMIT` (default: `1mb`)
- `AUTH_RATE_LIMIT_WINDOW_MS` / `AUTH_RATE_LIMIT_MAX_REQUESTS` (defaults: 15 minutes / 10)
- `API_RATE_LIMIT_WINDOW_MS` / `API_RATE_LIMIT_MAX_REQUESTS` (defaults: 15 minutes / 300)
- `SHUTDOWN_TIMEOUT_MS` (default: `30000`)

The API uses `helmet` security headers, rejects request bodies larger than
`REQUEST_BODY_LIMIT` with HTTP 413, and returns HTTP 429 with `Retry-After`
when a rate limit is exceeded. Login/token requests have a stricter per-IP
limit than ordinary API requests. The in-memory limiter is suitable for the
single-process deployment; shared storage is required before running multiple
API processes.

The API handles `SIGTERM` and `SIGINT` by stopping new HTTP connections,
waiting up to `SHUTDOWN_TIMEOUT_MS` for active requests, and then closing the
SQLite connection. Configure the process manager to send `SIGTERM` during
deploys and restarts.

Seeded development users (from `scripts/seedUsers.defaults.js` unless overridden by `scripts/seedUsers.local.js`):

- `dm-admin` / `change-me-dm-password`
- `player-one` / `change-me-player-password`

Change these passwords immediately in shared environments.

## Router Overview

- `GET /health`

- `POST /api/auth/token`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/auth/me`

- `PATCH /api/admin/me/username`
- `PATCH /api/admin/me/password`
- `GET /api/admin/users`
- `POST /api/admin/users`
- `PATCH /api/admin/users/:userId`
- `DELETE /api/admin/users/:userId`
- `GET /api/admin/anchors/characters`
- `GET /api/admin/users/:userId/anchors/characters`
- `PUT /api/admin/users/:userId/anchors/characters/:characterId`
- `DELETE /api/admin/users/:userId/anchors/characters/:characterId`
- `POST /api/admin/users/:userId/revoke-sessions`


- `GET /api/data/resources`
- `GET /api/data/:resource`

- `POST /api/:entityRoute`
- `GET /api/:entityRoute`
- `GET /api/:entityRoute/:id`
- `GET /api/:entityRoute/:id/:relatedRoute`
- `PATCH /api/:entityRoute/:id`
- `DELETE /api/:entityRoute/:id`

## Generic Data Router (`/api/data`)

Use this for table-shaped read operations against any manifest resource.

`resource` is the manifest key (examples: `Item`, `Character`, `CharacterItem`, `EventPlace`).

### `GET /api/data/resources`

List all available manifest resource keys.

```bash
curl http://localhost:3001/api/data/resources
```

### `GET /api/data/:resource`

Query rows by field values (or omit query params to return all rows).

```bash
curl "http://localhost:3001/api/data/Item?id=fireball-wand"
```

## Domain Router (`/api`)

Use this for domain-shaped access by entity route names from the manifest (examples: `characters`, `events`, `items`).

Current capabilities:

- Supports entity create/read/update/delete (`POST`, `GET`, `PATCH`, `DELETE`) endpoints
- Supports related-entity expansion via relation routes from `routeFromSource`

### `POST /api/:entityRoute`

Create an entity record by entity route.

```bash
curl -X POST http://localhost:3001/api/items \
  -H "Content-Type: application/json" \
  -d '{
    "id": "ember-staff",
    "name": "Ember Staff",
    "short_description": "A scorched ashwood staff."
  }'
```

### `GET /api/:entityRoute`

Query all entity records.

```bash
curl "http://localhost:3001/api/characters
```

### `GET /api/:entityRoute/:id`

Fetch a single entity record by id.

```bash
curl http://localhost:3001/api/characters/releas-neb
```

### `GET /api/:entityRoute/:id/:relatedRoute`

Fetch associated target records for a source entity.

```bash
curl http://localhost:3001/api/characters/releas-neb/items
```

Note: direct domain mutation routes (`POST`, `PATCH`, `DELETE`) require a `dm` role access token. Players have read-only access.

## Auth Router (`/api/auth`)

### `POST /api/auth/token`

Authenticate with username/password and receive an access token plus refresh cookie.

```bash
curl -X POST http://localhost:3001/api/auth/token \
  -H "Content-Type: application/json" \
  -d '{"username":"dm-admin","password":"change-me-dm-password"}'
```

### `POST /api/auth/refresh`

Rotate refresh token and receive a new access token.

```bash
curl -X POST http://localhost:3001/api/auth/refresh \
  --cookie "refresh_token=<refresh-token>"
```

### `POST /api/auth/logout`

Revoke current refresh session and clear refresh cookie.

```bash
curl -X POST http://localhost:3001/api/auth/logout \
  --cookie "refresh_token=<refresh-token>"
```

### `GET /api/auth/me`

Load current authenticated principal.

```bash
curl http://localhost:3001/api/auth/me \
  -H "Authorization: Bearer <access-token>"
```

## Admin Router (`/api/admin`)

All `/api/admin` routes require `Authorization: Bearer <access-token>`.

DM-only routes are marked below.

### `PATCH /api/admin/me/username`

Update your own username.

```bash
curl -X PATCH http://localhost:3001/api/admin/me/username \
  -H "Authorization: Bearer <access-token>" \
  -H "Content-Type: application/json" \
  -d '{"username":"new-handle"}'
```

### `PATCH /api/admin/me/password`

Update your own password.

```bash
curl -X PATCH http://localhost:3001/api/admin/me/password \
  -H "Authorization: Bearer <access-token>" \
  -H "Content-Type: application/json" \
  -d '{"currentPassword":"old-password","newPassword":"new-password-123"}'
```

### `GET /api/admin/users` (dm only)

List users.

```bash
curl http://localhost:3001/api/admin/users \
  -H "Authorization: Bearer <dm-access-token>"
```

### `POST /api/admin/users` (dm only)

Create user.

```bash
curl -X POST http://localhost:3001/api/admin/users \
  -H "Authorization: Bearer <dm-access-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "new-player",
    "username": "new-player",
    "password": "strong-pass-1",
    "role": "player",
    "disabled": false
  }'
```

### `PATCH /api/admin/users/:userId` (dm only)

Edit user fields (`username`, `role`, `disabled`, `password`).

```bash
curl -X PATCH http://localhost:3001/api/admin/users/player-one \
  -H "Authorization: Bearer <dm-access-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "player-one-updated",
    "disabled": false,
    "role": "player"
  }'
```

### `DELETE /api/admin/users/:userId` (dm only)

Delete user.

```bash
curl -X DELETE http://localhost:3001/api/admin/users/player-one \
  -H "Authorization: Bearer <dm-access-token>"
```

### `GET /api/admin/anchors/characters` (dm only)

List all character-user anchors.

```bash
curl http://localhost:3001/api/admin/anchors/characters \
  -H "Authorization: Bearer <dm-access-token>"
```

### `GET /api/admin/users/:userId/anchors/characters` (dm only)

List character anchors for one user.

```bash
curl http://localhost:3001/api/admin/users/player-one/anchors/characters \
  -H "Authorization: Bearer <dm-access-token>"
```

### `PUT /api/admin/users/:userId/anchors/characters/:characterId` (dm only)

Anchor a character to a user.

```bash
curl -X PUT http://localhost:3001/api/admin/users/player-one/anchors/characters/releas-neb \
  -H "Authorization: Bearer <dm-access-token>"
```

### `DELETE /api/admin/users/:userId/anchors/characters/:characterId` (dm only)

Remove a character anchor.

```bash
curl -X DELETE http://localhost:3001/api/admin/users/player-one/anchors/characters/releas-neb \
  -H "Authorization: Bearer <dm-access-token>"
```

### `POST /api/admin/users/:userId/revoke-sessions` (dm only)

Revoke all refresh sessions for a user.

```bash
curl -X POST http://localhost:3001/api/admin/users/player-one/revoke-sessions \
  -H "Authorization: Bearer <dm-access-token>"
```

### `PATCH /api/:entityRoute/:id`

Patch a single entity by route and id.

```bash
curl -X PATCH http://localhost:3001/api/characters/releas-neb \
  -H "Content-Type: application/json" \
  -d '{
    "short_description": "Updated summary text."
  }'
```

### `DELETE /api/:entityRoute/:id`

Delete a single entity by route and id.

```bash
curl -X DELETE http://localhost:3001/api/deities/achiel
```

## Error Behavior

Common route error mapping:

- `400`: validation/type/shape errors
- `404`: unknown route/resource or record not found
- `409`: SQLite constraint conflicts
- `500`: unexpected errors

Error payload shape:

```json
{ "error": "message" }
```

## Notes

- Data router field names and required fields are derived from the manifest; no resource-specific route files are needed.
- Domain router route names are derived from each entity `route` value and relation `routeFromSource` values.
- If you add or change resources in [../common/domainManifest.js](../common/domainManifest.js), both routers update accordingly.
