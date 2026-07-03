# Campaign Notes API

Manifest-driven API for Campaign Notes. This package owns the backend runtime and generic CRUD endpoints for both entity tables and relation tables defined in [../common/domainManifest.js](../common/domainManifest.js).

## What This API Does

- Initializes SQLite schema from the domain manifest
- Exposes generic CRUD routes for manifest resources
- Validates and type-checks payloads/filters from manifest field definitions
- Supports entities and join relations with composite keys

Core files:

- [server.js](server.js): Express app and startup
- [routes/dataRouter.js](routes/dataRouter.js): HTTP endpoints for CRUD
- [genericCrudService.js](genericCrudService.js): manifest-driven data layer
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

## Generic Data Endpoints

Base path: `/api/data`

- `GET /api/data/resources`
- `GET /api/data/:resource`
- `GET /api/data/:resource/one`
- `POST /api/data/:resource`
- `PATCH /api/data/:resource`
- `DELETE /api/data/:resource`

`resource` must be a key from the manifest, for example:

- Entity: `Item`, `Character`, `Event`
- Relation: `CharacterItem`, `EventPlace`, `DeitySphere`

### 1) List Resources

```bash
curl http://localhost:3001/api/data/resources
```

### 2) Query Many

```bash
curl "http://localhost:3001/api/data/Item?id=fireball-wand"
```

With no query params, returns all rows for that resource.

### 3) Query One

```bash
curl "http://localhost:3001/api/data/Item/one?id=fireball-wand"
```

### 4) Insert

```bash
curl -X POST http://localhost:3001/api/data/Item \
  -H "Content-Type: application/json" \
  -d '{
    "id": "fireball-wand",
    "name": "Fireball Wand",
    "short_description": "A wand with a warm core."
  }'
```

### 5) Update

```bash
curl -X PATCH http://localhost:3001/api/data/Item \
  -H "Content-Type: application/json" \
  -d '{
    "where": { "id": "fireball-wand" },
    "updates": { "long_explanation": "Recovered from a ruined tower." }
  }'
```

### 6) Delete

```bash
curl -X DELETE http://localhost:3001/api/data/Item \
  -H "Content-Type: application/json" \
  -d '{
    "where": { "id": "fireball-wand" }
  }'
```

## Composite Key Example (Relation Resource)

Example relation with a composite key:

```bash
curl "http://localhost:3001/api/data/CharacterItem/one?character_id=releas-neb&item_id=rel-s-spellbook&acquired_date=may-10-200"
```

## Error Behavior

Current route error mapping:

- `400`: validation/type/shape errors
- `404`: unknown resource or record not found
- `409`: SQLite constraint conflicts
- `500`: unexpected errors

Error payload shape:

```json
{ "error": "message" }
```

## Notes

- Field names and required fields are derived from the manifest; there are no resource-specific route files needed.
- If you add or change resources in [../common/domainManifest.js](../common/domainManifest.js), endpoints update automatically.
