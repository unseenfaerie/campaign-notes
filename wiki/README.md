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
- The DM's Proposal Inbox navigation shows a pending count, refreshed on navigation,
  after review, when returning to the tab, and every minute while the tab is visible.
- Generic entity list pages for each route.
- Generic entity detail page using GET /api/:entityRoute/:id/full.
- Edit entity core data or all exposition fields in place. Players can keep
  amending their own pending entity proposal until it is reviewed; restoring all
  proposed fields to their accepted values withdraws the proposal.
- Collapsible relation sections with support for simple and metadata-bearing connections.
- Character, deity, item, organization and place connections that previously
  required historical dates now have an optional timeline. DMs can add,
  reorder and remove entries and add or change dates later. Character-to-character
  relationships are independent and always run from their origin to their target.
- DMs can create and manage relations from either member's detail page, including incoming
  relations, and set visibility direction for other connection types.
  New relations default to outward from the current page.
- Detail pages group outgoing and bidirectional connections under Outgoing Related Data. DMs see
  incoming-only connections separately under Incoming Related Data; players see only outgoing
  connections.

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
