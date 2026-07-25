# AGENTS.md

This file provides guidance to AI coding agents when working with code in this repository.

## Project Overview

**3ook.com** (formerly liker-land-v3) — A Nuxt 3 PWA providing an AI reading companion and decentralized bookstore on Base blockchain. Features NFT book trading, text-to-speech, wallet integration, and subscription features.

## Build & Lint Notes

**Critical:** Always set `NODE_OPTIONS=--max-old-space-size=8192` for builds — they will OOM without it.

`npm run lint` emits 4 known `v-html` warnings — these are expected.

## Testing

Tests live in `test/unit/` and use Vitest with `@nuxt/test-utils` (Nuxt environment, `happy-dom`). There is no end-to-end suite yet.

## Architecture

### Server Backend (`/server/`)
- `/server/schemas/` — Valibot schemas for request validation. Convention: new endpoints validate input via a schema here (or in `/shared/schemas/` if reused on the client)
- `/server/plugins/validate-env.ts` — Nitro startup gate that fails loudly when critical env vars are missing
- Auth flow: Magic Link (email/social) or wallet signature → server session (30-day cookie). _Server-side token persistence is a work in progress._

### Web3 Layer
- Wagmi config in `/wagmi.ts` — Base mainnet or Base Sepolia (controlled by `IS_TESTNET` env var)

### Internationalization
- Flat key structure, sorted keys
- Use `useI18n()`, `useLocalePath()`, `useLocaleRoute()` for i18n in components

### Key Integrations
- **Sentry** — Error tracking (warnings about missing auth token are non-blocking)
- **PostHog** — Product analytics; UTM/attribution capture lives in `app/plugins/posthog-attribution.client.ts`

### Native App Bridge
The web app also runs inside an iOS/Android React Native WebView shell ([likecoin/3ook-com-app](https://github.com/likecoin/3ook-com-app)); helpers live in `app/utils/native-bridge.ts`.

Some features (Intercom, downloads, etc.) hand off to the native SDK when available. **When changing UI, navigation, or third-party integrations, check the native paths** — bugs here only surface in production native builds.

### Environment
- 45+ env vars — see `apphosting.mainnet.yaml` and `apphosting.sepolia.yaml` for full lists
- **Testnet:** `IS_TESTNET=TRUE` → Base Sepolia, separate API endpoints, separate Airtable bases
- **Mainnet:** `IS_TESTNET` omitted/false → Base mainnet, production endpoints
- Critical runtime var: `NUXT_SESSION_PASSWORD` (min 32 chars)

## Code Conventions

### Style & Tooling
- **Commit messages** — [Gitmoji](https://github.com/carloscuesta/gitmoji) prefix (e.g., 💬, 🚸, 📈, 👔)
- **ESLint** — `@nuxt/eslint` with stylistic rules enabled
- **Runtime config** — access env vars via `useRuntimeConfig()`, never hardcode
- **Env vars** — keep variables sorted alphabetically in `.env.example` and `apphosting.*.yaml` files
- **Comments** — keep concise, at most 3 lines. Avoid breaking lines mid-sentence; break at punctuation when needed.

### Nuxt
- **Route middleware** — `app/middleware/query.global.ts` persists UTM/tracking params across navigation
- **CSP** — configured via `nuxt-security` in `nuxt.config.ts`, update allowlists when adding external services

### Vue Templates
- **Text rendering** — prefer `v-text` directive over mustache interpolation: `<span v-text="'Text'" />` not `<span>{{ 'Text' }}</span>`

### Nuxt UI
- **Colors** — use Nuxt UI semantic color classes (`text-muted`, `bg-elevated`), not hardcoded colors (`text-gray-500`, `bg-white`)
- **Icons** — use [Material Symbols](https://github.com/google/material-design-icons) `i-material-symbols` with rounded style (e.g., `i-material-symbols-search-rounded`)
- **UModal** — for standard dialogs, prefer built-in `title`/`description` props with `#body`/`#footer` slots. Use `#content` only when the modal needs full layout control (e.g., custom chrome, fullscreen, or non-dialog layouts). Use `:ui` prop to customize slot classes (e.g., `body`, `footer`, `content`) instead of wrapping content in extra divs.

### Naming Conventions

#### Variables
- **Acronyms** (multi-word initialisms) stay uppercase: `bookURL`, `isPDF`
- **Abbreviations** (shortened single words) follow normal camelCase: `bookId`, `maxLen`
- First word is always lowercase: `url`, `id`, `pdf`
- **Booleans** — prefix with `is`/`has`/`should`/`must`: `isDeleted` not `deleted`, `hasLoggedIn` not `loggedIn`

#### Functions
- Always start with a verb: `handleClick` not `onClick`
- `fetch*` — async, calls an API, requires `await`
- `get*` — synchronous getter, no `await`
