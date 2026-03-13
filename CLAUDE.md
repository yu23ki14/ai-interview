# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AI Interview platform for collecting structured testimony data through conversational AI interviews. Initial use case: online advertisement scam experience collection for civic research and policy design. The system uses LLM for extraction/question generation and rule-based logic for safety/flow control. See `docs/ai-spec.md` and `docs/service-spec.md` for detailed specifications.

## Monorepo Structure

pnpm workspace monorepo with two apps:
- **`apps/backend`** — Cloudflare Workers API using Hono (OpenAPIHono + Zod), Drizzle ORM with D1 (SQLite), tested with `@cloudflare/vitest-pool-workers`
- **`apps/frontend`** — React Router v7 (file-based routing), TanStack Query, Tailwind CSS v4, shadcn/ui components, Orval for API client generation from OpenAPI spec

## Commands

### Root (run from project root)
- `pnpm dev` — start both frontend and backend dev servers in parallel
- `pnpm build` — build both apps
- `pnpm typecheck` — typecheck both apps
- `pnpm biome:check` — lint and format with Biome (auto-fix)
- `pnpm biome:format` — format only with Biome (auto-fix)

### Backend (`apps/backend`)
- `pnpm dev` — start Wrangler dev server (port 8787)
- `pnpm test` — run tests with Vitest (uses Cloudflare Workers pool)
- `pnpm test:watch` — run tests in watch mode
- `pnpm db:generate` — generate Drizzle migrations from schema
- `pnpm db:migrate:local` — apply D1 migrations locally
- `pnpm db:migrate:remote` — apply D1 migrations to remote
- `pnpm cf-typegen` — generate Cloudflare bindings types

### Frontend (`apps/frontend`)
- `pnpm dev` — start React Router dev server (port 5173)
- `pnpm build` — build for production
- `pnpm generate:api` — generate API client from backend OpenAPI spec (requires backend running on localhost:8787)

## Code Style

- **Formatter/Linter**: Biome (not ESLint/Prettier). CI runs `biome ci`.
- **Indent**: tabs
- **Quotes**: double quotes
- **Line width**: 100 characters (JS/TS)
- **Imports**: auto-organized by Biome

## Key Architecture Decisions

- Backend bindings: `DB` (D1Database) and `ENVIRONMENT` (string) are available via Hono context `c.env`
- DB schema lives in `apps/backend/src/db/schema.ts`, migrations output to `apps/backend/migrations/`
- Frontend API client is auto-generated via Orval using `react-query` client mode with a custom fetch wrapper at `apps/frontend/src/api/custom-fetch.ts`
- Backend tests use `cloudflare:test` module — access `env` and `SELF` from there for D1 and HTTP testing
- Docker Compose available for containerized dev (`docker-compose.yml`)
- Backend env vars go in `apps/backend/.dev.vars` (not committed)
