# 3ook.com

A Nuxt 3 PWA providing an AI reading companion and decentralized bookstore on Base blockchain. Features NFT book trading, text-to-speech, wallet integration, and subscription features.

**Tech stack:** Nuxt 3.20+ (Vue 3, TypeScript 5.8), Tailwind CSS via @nuxt/ui, wagmi/viem (Base chain), Pinia, TanStack Query, Firebase Admin, Airtable CMS.

## Setup

```bash
npm install
```

## Development

```bash
npm run dev              # Dev server on http://localhost:3000
npm run lint             # ESLint
npm run lint:fix         # Auto-fix lint issues
npm run typecheck        # Type check via vue-tsc
npm run test             # Vitest in watch mode
npm run test:run         # Run unit tests once (used in CI)
```

## Production Build

```bash
NODE_OPTIONS=--max-old-space-size=8192 npm run build
npm run preview          # Preview production build
```

> **Note:** Always set `NODE_OPTIONS=--max-old-space-size=8192` for builds to avoid OOM.

## Environment

- 45+ env vars — see `apphosting.mainnet.yaml` and `apphosting.sepolia.yaml` for full lists
- **Testnet:** `IS_TESTNET=TRUE` targets Base Sepolia with separate API endpoints
- **Mainnet:** `IS_TESTNET` omitted/false targets Base mainnet with production endpoints

## Deployment

Firebase App Hosting (Cloud Run):
- `apphosting.mainnet.yaml` — 3ook.com
- `apphosting.sepolia.yaml` — sepolia.3ook.com

## Documentation

- [`AGENTS.md`](./AGENTS.md) — architecture, conventions, and agent guidance
- [Nuxt documentation](https://nuxt.com/docs/getting-started/introduction) — framework details
