# AGENTS.md

This file provides guidance to AI coding agents when working with code in this repository.

## Project Overview

**3ook.com** (formerly liker-land-v3) — A Nuxt 3 PWA providing an AI reading companion and decentralized bookstore on Base blockchain. Features NFT book trading, text-to-speech, wallet integration, and subscription features.

**Tech stack:** Nuxt 3.20+ (Vue 3, TypeScript 5.8), Tailwind CSS via @nuxt/ui, wagmi/viem (Base chain), Pinia, TanStack Query, Firebase Admin, Airtable CMS.

## Build & Development Commands

```bash
npm install              # Install dependencies (runs nuxt prepare via postinstall)
npm run dev              # Dev server on http://localhost:3000
npm run lint             # ESLint (4 known v-html warnings are expected)
npm run lint:fix         # Auto-fix lint issues
npm run typecheck        # Type check via vue-tsc (~30 seconds)
npm run test             # Vitest in watch mode (Nuxt environment)
npm run test:run         # Vitest one-shot (used in CI)
NODE_OPTIONS=--max-old-space-size=8192 npm run build  # Production build (~5 min)
npm run preview          # Preview production build
```

**Critical:** Always set `NODE_OPTIONS=--max-old-space-size=8192` for builds — they will OOM without it.

## CI Pipeline

GitHub Actions runs on push/PR: `npm ci` → `npm run test:run` → `npm run lint` → `npm run typecheck` → `npm run build`. All must pass.

Tests live in `test/unit/` and use Vitest with `@nuxt/test-utils` (Nuxt environment, `happy-dom`). There is no end-to-end suite yet.

## Architecture

### Nuxt 3 Conventions
- **Auto-imports** enabled for composables, components, and utils — no manual import needed
- File-based routing in `/pages/`
- Server API routes in `/server/api/` (Nitro) — filenames encode method: `*.get.ts`, `*.post.ts`, `*.delete.ts`
- Layouts: `default` and `reader`

### State & Data Layer
- **Pinia stores** (`/stores/`) — global state across account, bookstore, bookshelf, NFT, subscription, etc.
- **TanStack Query** — server state caching
- **Composables** (`/composables/`) — feature composables encapsulating business logic, named `use-*.ts`
- **Top-level utility folders** — `/utils/` (client-only helpers), `/constants/` (analytics keys, pricing, categories), `/types/` (client-only `.d.ts`)
- **Shared between client + server** — `/shared/utils/` ([LikeCoin API](https://github.com/likecoin/likecoin-api-public) client, indexer clients), `/shared/schemas/` (Valibot schemas), `/shared/types/` (`.d.ts`)

### Server Backend (`/server/`)
- `/server/api/` — REST endpoints for auth, book lists, store products, TTS, user settings
- `/server/utils/` — Airtable CMS client, Firebase/Firestore, Minimax TTS, cloud storage
- `/server/schemas/` — Valibot schemas for request validation. Convention: new endpoints validate input via a schema here (or in `/shared/schemas/` if reused on the client)
- `/server/plugins/validate-env.ts` — Nitro startup gate that fails loudly when critical env vars are missing
- Auth flow: Magic Link (email/social) or wallet signature → server session (30-day cookie). _Server-side token persistence is a work in progress._

### Web3 Layer
- Wagmi config in `/wagmi.ts` — Base mainnet or Base Sepolia (controlled by `IS_TESTNET` env var)
- Contract ABIs in `/contracts/` — LIKE token, veLIKE, NFT class, collective, staking, rewards
- Connectors: MetaMask, Coinbase Wallet, WalletConnect, Magic Link
- Smart contract composables: `composables/use-*-contract.ts` (LikeCoin, veLIKE, veLIKE rewards, collective, NFT class, stake position)

### Internationalization
- Locales: **zh-Hant** (default), **en** — lazy-loaded JSON in `/i18n/locales/`
- Flat key structure, sorted keys
- Use `useI18n()`, `useLocalePath()`, `useLocaleRoute()` for i18n in components

### Key Integrations
- **Airtable** — CMS for bookstore products, tags, publications
- **Firebase** — Firestore for user data/book lists, Cloud Storage for TTS cache
- **Minimax** — Text-to-speech (server-side generation)
- **Stripe** — Plus subscription checkout (`use-subscription-checkout`) and Stripe Connect for authors
- **Sentry** — Error tracking (warnings about missing auth token are non-blocking)
- **PostHog** — Product analytics; UTM/attribution capture lives in `plugins/posthog-attribution.client.ts`
- **Intercom** — Customer support

### Native App Bridge
The web app also runs inside an iOS/Android React Native WebView shell ([likecoin/3ook-com-app](https://github.com/likecoin/3ook-com-app)). Helpers in `/utils/native-bridge.ts` expose:
- `isNativeWebView()` — true when hosted by the native shell
- `isNativeFeatureSupported(feature)` — feature detection via `window.__nativeBridge.features`
- `postToNative({ type, ... })` — send a message to the host via `window.ReactNativeWebView.postMessage`

Some features (Intercom, downloads, etc.) hand off to the native SDK when available. **When changing UI, navigation, or third-party integrations, check the native paths** — bugs here only surface in production native builds.

### Environment
- 45+ env vars — see `apphosting.mainnet.yaml` and `apphosting.sepolia.yaml` for full lists
- **Testnet:** `IS_TESTNET=TRUE` → Base Sepolia, separate API endpoints, separate Airtable bases
- **Mainnet:** `IS_TESTNET` omitted/false → Base mainnet, production endpoints
- Critical runtime var: `NUXT_SESSION_PASSWORD` (min 32 chars)

### Deployment
- Firebase App Hosting (Cloud Run)
- Configs: `apphosting.mainnet.yaml` (3ook.com), `apphosting.sepolia.yaml` (sepolia.3ook.com)

## Code Conventions

### Style & Tooling
- **Commit messages** — [Gitmoji](https://github.com/carloscuesta/gitmoji) prefix (e.g., 💬, 🚸, 📈, 👔)
- **ESLint** — `@nuxt/eslint` with stylistic rules enabled
- **Runtime config** — access env vars via `useRuntimeConfig()`, never hardcode
- **Env vars** — keep variables sorted alphabetically in `.env.example` and `apphosting.*.yaml` files

### Nuxt
- **Route middleware** — `/middleware/query.global.ts` persists UTM/tracking params across navigation
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
