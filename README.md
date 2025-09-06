
## Campaign Notes Architecture

### Database
- SQLite file: `backend/campaign.db`
- Create with `backend/db.js`, seed with `backend/seed.js`

### ((honorable mention: db services layer))
- Purely database utility. Execute basic SQL.

### Service Layer (`backend/services/`)
- All business logic, validation (beyond field existence), and error handling are centralized here.
- Main entity services use a generic `entityDataService` for CRUD, enforcing schema and ID validation and returning standardized results (e.g., `{ id }` for create, `{ deleted: { id } }` for delete).
- Join table services (e.g., spellSpheres, itemSpells) use a generic `simpleJoinTableService`, `relationshipJoinTableService`, or `historicalJoinTableService` for all CRUD and bulk operations:
    - Foreign key existence is enforced before creating a linkage.
    - Deleting a linkage or bulk deleting returns a standardized object (e.g., `{ deleted: { ...ids } }` or `{ deleted: { ...where }, deletedCount }`).
    - All join table services are thin wrappers over the generic service.

### Backend API (`backend/routes/`)
- All routes are thin: they only validate required parameters and forward requests to the service layer.
- For CRUD and join table operations, routes return the result of the service call directly, ensuring consistent API responses.
- CRUD routes for each main entity type (character, item, etc.) are hosted in the `index.js` of that entity's folder under routes.
- CRUD routes for each join table for a main entity type are hosted under the main entity's folder, named for the related entity (e.g., `backend/routes/spells/items.js`).

### API Layer (`frontend/src/api/`)
- All logic to retrieve and prepare material to be displayed on the front end goes here (this includes prettifying dates, transforming any data).
- The base address that all routes are formed with is defined once in `frontend/src/utils/api.js`.

### Vue Frontend
- Uses the API layer to display information to the user.
- Main files: `frontend/src/App.vue`, `frontend/src/views/`, `frontend/src/components/`

### Environment setup
- Install: node, npm, sqlite3
- Tools: VSCode, DB Browser for SQLite, Postman