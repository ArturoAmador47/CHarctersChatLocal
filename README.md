# ChatCharacters

A desktop app for chatting with custom AI characters, powered by [OpenRouter](https://openrouter.ai/) for LLM inference. Built with SvelteKit 5 + Tailwind, packaged as a native app with [Tauri](https://tauri.app/).

Characters and chat history are stored in [Supabase](https://supabase.com/) (Postgres) — no backend code of its own; the client talks to Supabase directly. LLM responses stream from OpenRouter's OpenAI-compatible API using your own API key.

## Features

- **Custom characters** — create characters with a name, avatar (emoji or image), description, personality, background, and system prompt.
- **Per-character model config** — pick any OpenRouter-hosted model, temperature, max tokens, and how many prior messages to include as context, independently for each character.
- **Streaming chat** — responses stream token-by-token from OpenRouter.
- **Persistent storage** — characters and message history persist in Supabase/Postgres, shared between the browser dev build and the desktop build.

## Prerequisites

- [Node.js](https://nodejs.org/) and [pnpm](https://pnpm.io/)
- [Rust](https://www.rust-lang.org/tools/install) + platform build tools (required by Tauri — see the [Tauri prerequisites guide](https://tauri.app/start/prerequisites/))
- An [OpenRouter](https://openrouter.ai/) account and API key
- A [Supabase](https://supabase.com/) project (free tier is fine)

## Getting started

Install dependencies from the repo root (this is a pnpm workspace):

```bash
pnpm install
```

Run [`supabase/schema.sql`](supabase/schema.sql) once in your Supabase project's SQL Editor to create the `characters` and `messages` tables (and their Row Level Security policies).

Create a `.env` file in `CHarctersChatLocal/` (see `.env.example`):

```
API_KEY=sk-or-v1-...

VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

Use the **publishable** key (Project Settings → API Keys), not the secret key — the secret key must never be shipped into this app, since it bypasses Row Level Security and this is a client-only app with no server to keep it hidden.

`.env` is git-ignored — never commit it.

Then, from `CHarctersChatLocal/`:

```bash
# Run in the browser (Vite dev server)
pnpm dev

# Run as a native desktop app (Tauri)
pnpm tauri:dev
```

## Building

```bash
# Build the web bundle only
pnpm build

# Build the native desktop app (installer/binary for your OS)
pnpm tauri:build
```

## Project structure

```
src/
  lib/
    api/        # OpenRouter API client
    components/ # Svelte UI components (chat, character cards/forms, sidebar, model selector)
    db/         # Storage abstraction: Supabase client + adapter
    stores/     # Svelte 5 runes-based state (characters, chat, models)
    types.ts    # Shared TypeScript types
  routes/       # SvelteKit pages (character list/create/edit, chat views)
src-tauri/      # Tauri (Rust) desktop shell config
supabase/
  schema.sql    # Table definitions + RLS policies to run in the Supabase SQL Editor
```

## Notes

- The OpenRouter API key and the Supabase URL/publishable key are all bundled into the client at build time (`envPrefix` in `vite.config.ts` exposes `API_KEY` and `VITE_*`) — fine for a local desktop app, but be aware none of these are server-side secrets. Never put the Supabase **secret** key in this project.
- `supabase/schema.sql` currently grants full read/write to anyone holding the publishable key (no per-user auth yet) — fine for single-user/trusted use, but tighten the RLS policies (e.g. scope to `auth.uid()`) before letting other people use the app against your project.
- Character avatar images are stored as base64 JPEG (max 200×200) alongside the character record.
