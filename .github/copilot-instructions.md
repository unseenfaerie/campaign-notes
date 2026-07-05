# Copilot Instructions for campaign-notes

These instructions apply to all Copilot chat and code-generation work in this repository.

## Project Vision

1. This this project consists of a frontend wiki website that consumes a backend api for logging information about my D&D world and campaign.

## Core Project Assumptions

1. This API is greenfield with no consumers yet.
- There are no downstream clients that require backward compatibility at this stage.
- Prefer ideal domain modeling, naming, payload shapes, and route design over preserving interim patterns.
- Breaking changes are allowed (including endpoint renames, schema changes, and broad refactors) when they improve long-term design.
- Do not optimize for migration safety unless explicitly requested.

2. Treat the domain manifest as a source of truth.
- `common/domainManifest.js` defines entities and relationships and should guide API/data design decisions.

3. Build current API work under the existing API structure.
- Prioritize changes in `api/` and shared domain metadata in `common/`.

## Working Preferences

- Favor clean, maintainable architecture over temporary compatibility layers.
- Surface opportunities for simplifying structure early, even if they require large refactors.
- When proposing alternatives, include the ideal option first.
