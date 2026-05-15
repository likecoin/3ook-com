# 3ook.com

**Read. Listen. Own.** A Nuxt 3 PWA for a third-generation bookstore ecosystem: thousands of Chinese ebooks with Cantonese, Mandarin, and English custom-voice narration, where books are bought once and owned permanently in the reader's wallet. Merges AI-enhanced reading with Web3 ownership on the Base blockchain, plus wallet integration and Plus subscription features.

**Tech stack:** Nuxt 3.20+ (Vue 3, TypeScript 5.8), Tailwind CSS via @nuxt/ui, wagmi/viem (Base chain), Pinia, TanStack Query, Firebase Admin, Airtable CMS.

## Setup

```bash
npm install
```

## Development

```bash
npm run dev              # Dev server on http://localhost:3000
npm run lint             # ESLint (4 known v-html warnings are expected)
npm run lint:fix         # Auto-fix lint issues
npm run typecheck        # Type check via vue-tsc (~30 seconds)
npm run test             # Vitest in watch mode (Nuxt environment)
npm run test:run         # Vitest one-shot (used in CI)
```

## CI Pipeline

GitHub Actions runs on push/PR: `npm ci` → `npm run test:run` → `npm run lint` → `npm run typecheck` → `npm run build`. All must pass. Tests live in `test/unit/` (Vitest + `@nuxt/test-utils`, `happy-dom`); there is no end-to-end suite yet.

## Production Build

```bash
NODE_OPTIONS=--max-old-space-size=8192 npm run build
npm run preview          # Preview production build
```

> **Note:** Always set `NODE_OPTIONS=--max-old-space-size=8192` for builds to avoid OOM.

## Environment

- 45+ env vars — see `apphosting.mainnet.yaml` and `apphosting.sepolia.yaml` for full lists
- **Testnet:** `IS_TESTNET=TRUE` targets Base Sepolia with separate API endpoints and Airtable bases
- **Mainnet:** `IS_TESTNET` omitted/false targets Base mainnet with production endpoints
- **Critical runtime var:** `NUXT_SESSION_PASSWORD` (min 32 chars)
- Keep env vars sorted alphabetically in `.env.example` and `apphosting.*.yaml`

## Deployment

Firebase App Hosting (Cloud Run):
- `apphosting.mainnet.yaml` — 3ook.com
- `apphosting.sepolia.yaml` — sepolia.3ook.com

## Documentation

- [`AGENTS.md`](./AGENTS.md) — architecture, conventions, and agent guidance
- [Nuxt documentation](https://nuxt.com/docs/getting-started/introduction) — framework details
