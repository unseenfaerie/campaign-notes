# Campaign Notes Wiki Frontend

Vue 3 + TypeScript frontend for browsing manifest-driven campaign data from the API.

## Features

- Login flow against auth endpoints:
	- POST /api/auth/token
	- POST /api/auth/refresh
	- GET /api/auth/me
	- POST /api/auth/logout
- Access token storage in localStorage.
- Automatic Bearer auth header on API content requests.
- Left navigation for entity routes.
- Generic entity list pages for each route.
- Generic entity detail page using GET /api/:entityRoute/:id/full.
- Collapsible relation sections with support for simple, relationship, and history relation payload shapes.

## Environment

Create wiki/.env.local when you need a non-default API URL:

VITE_API_BASE_URL=http://localhost:3001/api

Default if not provided: http://localhost:3001/api

## Scripts

From workspace root:

- npm run api:start
- npm run wiki:start
- npm run wiki:build

Or from wiki directly:

- npm run dev
- npm run build
- npm run preview

## Route Map

- /login
- /:entityRoute
- /:entityRoute/:id

All routes except /login require auth.
