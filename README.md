New architecture:
Database - backend/campaign.db. 
    - Create the database with backend/db.js
    - Seed with backend/seed.js
Service Layer - backend/services/*.js
    - Manages ALL db operations done by the API.
    - Keep these fairly dumb and basic, the thinking should be done by the logic defined in the routes.
    - Final db sanitizing can be done here
    - Services for each main entity type, plus each combination that exists in the join table
    - For join table services, we are only retrieving information from the join table itself and not adding data from the other entity's main table (eg for character-item relationships, when we get "/api/characters/cormac/items/cormac-s-spellbook", we only get information about the relationship between the two from the join table, no info from the item table directly) [SHOULD I CHANGE THIS LOL]
Backend API - backend/server.js
    - Run with node
    - CRUD routes for each main entity type (character, item, etc.) "/api/character/", "/api/item/{id}", etc are hosted in the index.js of that entity's folder under routes
    - CRUD routes for each join table for main entity type are hosted under the main entity's folder, named their own entity type. For routes pertaining to detiy relationships from a character's pov, you would look for "backend/routes/characters/deities.js"
API Layer - frontend/src/api/*.js
    - All logic to retrieve and prepare material to be displayed on the front end goes here (this includes prettifying dates, transforming any data)
    - The base address that all routes are formed with is defined once in frontend/src/utils/api.js
Vue Frontend - fontend/src/app.vue, frontend/src/views, fontend/src/components
    - Using the functions provided by the API layer, display information to the user.

Environment setup:
    - Install: node, npm, sqlite3
    - Tools: VSCode, DB Browser for SQLite, Postman