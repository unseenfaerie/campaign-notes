# Campaign Notes API

Manifest-driven Express API backed by SQLite. The domain manifest,
[../common/domainManifest.js](../common/domainManifest.js), defines entities,
fields, and relationships used by both routers.

## Install and run

From the workspace root:

```bash
npm install
npm --workspace api run start
```

From this directory, use `npm run start`. Run API tests with `npm run test`.
The default port is `3001`.

The database path is set by `DB_PATH` and defaults to `api/campaign.db`. Use
persistent storage for deployed databases.

## Data and deployment

From the API directory, validate seed data with `node scripts/validateSeed.js`.
Run `node scripts/seed.js` only in non-production environments; production
seeding requires `ALLOW_SEED=true`.

Create a consistent SQLite backup and prune old backups:

```bash
npm run backup
```

Copy backups to encrypted off-host storage and periodically verify they open as
separate SQLite databases.

Check or apply migrations:

```bash
npm run migrate -- status
npm run migrate -- latest
```

Before deploying, back up the database, stop or drain the old API, apply
migrations, start the new version, and verify `/health`. Migrations are
forward-only; recovery requires restoring a verified backup and deploying a
compatible application version.

## Offline campaign export

Create a multi-page offline wiki:

```bash
npm --workspace api run export:wiki -- /absolute/path/campaign-wiki
```

The destination must not already exist. Open `index.html` inside the generated
folder and keep the entire folder together when transferring it. Category
indexes are paginated and each entry and post has its own page, so the iPad
does not have to load the entire campaign at once. All links and styling are
local; no JavaScript, server, or internet connection is needed after export.
The best way to open a folder of linked HTML files on iOS 9 depends on the
installed apps: some document previews do not follow local links. Test the
transferred folder in an app that can browse local HTML files.

Create a self-contained HTML snapshot from the configured database:

```bash
npm --workspace api run export -- /absolute/path/campaign.html
```

To select a database or backup, add its path after the output path. The source
database must already use the current schema.

The export includes campaign entities, aliases, relationships and history, and
posts with author names. It excludes accounts, sessions, proposals, and audit
records. It is a read-only snapshot, not a backup, and must be regenerated to
include later changes.

## Configuration and authentication

For local development, create `.env` from the checked-in
[`.env.example`](.env.example). Configure
these variables before running outside local development:

- `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` are required in production.
- `ACCESS_TOKEN_TTL` defaults to `15m`; `REFRESH_TOKEN_TTL` to `30d`.
- `COOKIE_SECURE` should be `true` in production over HTTPS;
  `COOKIE_SAMESITE` defaults to `strict`.
- `REQUEST_BODY_LIMIT` defaults to `1mb`.
- `AUTH_RATE_LIMIT_WINDOW_MS` / `AUTH_RATE_LIMIT_MAX_REQUESTS` default to
  15 minutes / 10; `API_RATE_LIMIT_WINDOW_MS` / `API_RATE_LIMIT_MAX_REQUESTS`
  to 15 minutes / 300.
- `SHUTDOWN_TIMEOUT_MS` defaults to `30000`.

The API uses Helmet security headers, returns 413 for oversized request bodies,
and returns 429 with `Retry-After` when rate limited. Authentication requests
have a stricter per-IP limit. Rate limits are in-memory; multiple API processes
need shared storage.

On `SIGTERM` or `SIGINT`, the API stops accepting connections, waits up to
`SHUTDOWN_TIMEOUT_MS` for active requests, then closes SQLite. Configure the
process manager to send `SIGTERM` during deploys and restarts.

Default development credentials are defined in `scripts/seedUsers.defaults.js`.
Override them locally by copying `scripts/seedUsers.local.example.js` to
`scripts/seedUsers.local.js`. Change seeded passwords before using shared
environments.

## Routes

`GET /health` reports API health. Resource names and entity routes are derived
from the domain manifest.

### Generic data router

- `GET /api/data/resources` lists manifest resource keys.
- `GET /api/data/:resource` reads resource rows; query parameters filter by
  field values. `resource` is a manifest key such as `Item` or `Character`.

Use this router for table-shaped reads.

### Domain router

Entity routes support `POST /api/:entityRoute`, `GET /api/:entityRoute`,
`GET /api/:entityRoute/:id`, `PATCH /api/:entityRoute/:id`, and
`DELETE /api/:entityRoute/:id`. `GET /api/:entityRoute/:id/:relatedRoute`
loads associated records.

Entity creation, updates, and deletion require a DM access token. Players can
read and submit or amend proposals.

Players can submit a proposal with `POST /api/:entityRoute/:id/propose` and
amend their pending proposal with `PATCH` to the same route. Amendments merge
into the proposal; restoring every field withdraws it and releases the entity
lock. A changed or resolved proposal returns 409.

Relation records use a DM-controlled `visibility_direction` of
`first_to_second`, `second_to_first`, or `both`, relative to manifest member
order. New records default outward from the entity used to create them.
Migration 6 sets existing records to `both` for review. Players traverse
permitted directions within their viewing character's intelligence-based hop
limit; detail pages show outgoing relations only when targets are visible or
locked. Public entities remain independently visible. DMs can see and edit
both directions. Direction cannot be proposed.

Place containment is a simple self-relation with `child_id` as member 0 and
`parent_id` as member 1. Create it from either place with
`POST /api/places/:id/places?anchorMemberIndex=0` (the current place is the
child) or `anchorMemberIndex=1` (the current place is the parent). A place has
at most one parent, and containment cannot form a cycle. Core Data Parent and
Children links come from visible containment relations. Migration 8 moves
existing parent fields into bidirectional relations; review their visibility.
Resolve pending Place parent proposals before migrating. Creating a place and
assigning its parent are separate operations.

For self-relations, expanded records include `relationAnchorIndex`. Pass it as
`anchorMemberIndex` when operating on that record from the displayed page.
History records have their own direction, and history operations require the
applicable history-key selector.

### Authentication and admin routers

Authentication routes:

- `POST /api/auth/token` authenticates and issues an access token and refresh
  cookie.
- `POST /api/auth/refresh` rotates the refresh token.
- `POST /api/auth/logout` revokes the refresh session.
- `GET /api/auth/me` returns the authenticated principal.

Admin routes require an access token. Users can update their own username and
password. DM-only routes manage users, character-user anchors, and refresh
sessions:

- `PATCH /api/admin/me/username` and `PATCH /api/admin/me/password` update the
  current user.
- `GET /api/admin/users`, `POST /api/admin/users`,
  `PATCH /api/admin/users/:userId`, and `DELETE /api/admin/users/:userId`.
- `GET /api/admin/anchors/characters`.
- `GET /api/admin/users/:userId/anchors/characters`;
  `PUT` and `DELETE /api/admin/users/:userId/anchors/characters/:characterId`.
- `POST /api/admin/users/:userId/revoke-sessions`.

## Errors and domain changes

Common status codes: 400 for invalid input, 404 for unknown routes or records,
409 for constraint conflicts, and 500 for unexpected errors. Error responses
have the shape `{ "error": "message" }`.

Data fields and required values come from the manifest, so resource-specific
routes are not needed. Update
[../common/domainManifest.js](../common/domainManifest.js) to change entities,
fields, or relationships.
