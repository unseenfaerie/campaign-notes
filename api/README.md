# Campaign Notes API

Manifest-driven API for Campaign Notes. This package owns the backend runtime for both:

- A generic manifest CRUD router for entities and relation tables
- A domain router that exposes entity-centric read flows and simple entity creation

Definitions come from [../common/domainManifest.js](../common/domainManifest.js).

## To Do

- finish all routes in domain router
- enums for certain fields (character type)/more heavy duty validation
- sort out booleans in manifest. i want them

## What This API Does

- Initializes SQLite schema from the domain manifest
- Exposes generic CRUD routes for all manifest resources
- Exposes domain routes for entity lookup and associated record loading
- Validates and type-checks payloads and filters from manifest field definitions

Core files:

- [server.js](server.js): Express app and startup
- [routes/dataRouter.js](routes/dataRouter.js): Generic CRUD endpoints under `/api/data`
- [routes/domainRouter.js](routes/domainRouter.js): Domain-oriented endpoints under `/api`
- [genericCrudService.js](genericCrudService.js): Manifest-driven data layer
- [db.js](db.js): DB connection and schema init orchestration
- [schemaBuilder.js](schemaBuilder.js): SQL generation from manifest

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

Default port: `3001`

Health check:

```bash
curl http://localhost:3001/health
```

## Router Overview

- `GET /health`


- `GET /api/data/resources`
- `GET /api/data/:resource`
- `POST /api/data/:resource`
- `PATCH /api/data/:resource`
- `DELETE /api/data/:resource`


- `POST /api/:entityRoute`
- `GET /api/:entityRoute`
- `GET /api/:entityRoute/:id`
- `GET /api/:entityRoute/:id/:relatedRoute`

## Generic Data Router (`/api/data`)

Use this for table-shaped CRUD operations against any manifest resource.

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

### `POST /api/data/:resource`

Insert a row into a resource table.

```bash
curl -X POST http://localhost:3001/api/data/Item \
  -H "Content-Type: application/json" \
  -d '{
    "id": "fireball-wand",
    "name": "Fireball Wand",
    "short_description": "A wand with a warm core."
  }'
```

### `PATCH /api/data/:resource`

Update rows matching `where`.

```bash
curl -X PATCH http://localhost:3001/api/data/Item \
  -H "Content-Type: application/json" \
  -d '{
    "where": { "id": "fireball-wand" },
    "updates": { "long_explanation": "Recovered from a ruined tower." }
  }'
```

### `DELETE /api/data/:resource`

Delete rows matching `where`.

```bash
curl -X DELETE http://localhost:3001/api/data/Item \
  -H "Content-Type: application/json" \
  -d '{
    "where": { "id": "fireball-wand" }
  }'
```

## Domain Router (`/api`)

Use this for domain-shaped access by entity route names from the manifest (examples: `characters`, `events`, `items`).

Current progress:

- Supports entity create (`POST`) and read (`GET`) endpoints
- Supports related-entity expansion via relation routes from `routeFromSource`
- Does not yet expose update/delete domain routes

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

Query entity records by optional filters.

```bash
curl "http://localhost:3001/api/characters?name=Releas%20Neb"
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

## Error Behavior

Common route error mapping:

- `400`: validation/type/shape errors
- `404`: unknown route/resource or record not found
- `409`: SQLite constraint conflicts (primarily generic data router)
- `500`: unexpected errors

Error payload shape:

```json
{ "error": "message" }
```

## Notes

- Data router field names and required fields are derived from the manifest; no resource-specific route files are needed.
- Domain router route names are derived from each entity `route` value and relation `routeFromSource` values.
- If you add or change resources in [../common/domainManifest.js](../common/domainManifest.js), both routers update accordingly.
