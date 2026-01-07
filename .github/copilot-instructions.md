# Copilot Instructions for 3ook-com

## Repository Overview

**3ook.com** (formerly liker-land-v3) is a Nuxt 3-based web application that provides an AI reading companion and decentralized bookstore on Base blockchain. The project is a Progressive Web App (PWA) with text-to-speech capabilities, NFT book trading, wallet integration, and subscription features.

**Tech Stack:**
- Framework: Nuxt 3.20+ (Vue 3, TypeScript)
- Runtime: Node.js 20+ (specified in package.json engines)
- Build Tool: Vite 7
- Styling: Tailwind CSS via @nuxt/ui
- Web3: wagmi/viem for blockchain integration (Base/Base Sepolia)
- Backend: Nitro server, Firebase Admin, Airtable CMS
- Key Libraries: epub.js, pdf.js, Sentry, PostHog, Pinia

**Project Size:** ~29MB, 196 source files (.ts/.vue/.js)

## Critical Build Information

### Memory Requirements
**ALWAYS** set `NODE_OPTIONS=--max-old-space-size=8192` when building. The build will fail with heap out of memory errors without this setting. The CI workflow and production deployment configs already include this.

### Build Commands (Verified)

**Install dependencies:**
```bash
npm ci  # Takes ~2 minutes, preferred for CI
# OR
npm install  # For local development
```

**Lint:**
```bash
npm run lint  # Uses ESLint with @nuxt/eslint-config
npm run lint:fix  # Auto-fix lint issues
```
- Currently has 4 v-html XSS warnings in `/pages/store/[nftClassId]/index.vue` (expected, not blocking)
- Exit code 0 even with warnings

**Type Check:**
```bash
npm run typecheck  # Uses vue-tsc via nuxt typecheck
```
- Runs quickly (~30 seconds)
- Exit code 0 indicates success

**Build:**
```bash
NODE_OPTIONS=--max-old-space-size=8192 npm run build  # Takes ~5 minutes
```
- Builds both client and server bundles
- Generates PWA assets and service worker
- May show chunk size warnings (expected)
- Will show Sentry warnings if SENTRY_AUTH_TOKEN not set (non-blocking)
- **SUCCESS INDICATOR:** Look for "Nitro" success message and `.output` directory creation

**Development Server:**
```bash
npm run dev  # Starts on http://localhost:3000
```
- May show font provider warnings in environments without internet access (non-blocking)
- Vite HMR enabled
- Uses `nuxt prepare` postinstall hook

**Preview Production Build:**
```bash
npm run preview  # After build
```

**Other Commands:**
```bash
npm run generate  # Static site generation
npm run generate:pwa-assets  # Generate PWA icons
```

## CI/CD Pipeline

**GitHub Actions:** `.github/workflows/ci.yml`
- Triggers: push, pull_request
- Node version: 20
- Steps (in order):
  1. Checkout code
  2. Setup Node.js with npm cache
  3. `npm ci` (install dependencies)
  4. `npm run lint` (must pass)
  5. `npm run typecheck` (must pass)
  6. `npm run build` with `NODE_OPTIONS=--max-old-space-size=8192` (must pass)

**Deployment:** Firebase App Hosting
- Mainnet: `apphosting.mainnet.yaml`
- Testnet: `apphosting.sepolia.yaml`
- Both configs include `NODE_OPTIONS=--max-old-space-size=8192` for builds

## Project Architecture

### Directory Structure

**Root Configuration Files:**
- `nuxt.config.ts` - Main Nuxt configuration (modules, runtimeConfig, security)
- `app.config.ts` - UI theme configuration
- `tsconfig.json` - Extends `.nuxt/tsconfig.json`
- `eslint.config.mjs` - ESLint with Nuxt preset, stylistic rules enabled
- `firebase.json` - Firestore rules configuration
- `wagmi.ts` - Web3 wallet configuration (Base/Base Sepolia chains)
- `pwa-assets.config.ts` - PWA icon generation
- `sentry.client.config.ts` - Client-side error tracking

**Application Code:**
- `/pages/` - File-based routing
  - `/account/` - User account pages (index, deposit, staking, subscription, wallet)
  - `/store/` - Bookstore pages (index, [nftClassId], claim)
  - `/reader/` - Book reading pages (epub, pdf)
  - `/shelf/` - User bookshelf
  - `/plus/` - Subscription features
  - `/gift/` - Gift functionality
- `/components/` - 50+ Vue components (see list below)
- `/layouts/` - Page layouts (default, reader)
- `/composables/` - 50+ Vue composables for business logic
- `/stores/` - Pinia stores (account, bookstore, bookshelf, nft, staking, etc.)
- `/middleware/` - Global middleware (query.global.ts)
- `/plugins/` - Nuxt plugins (wagmi, gtag, farcaster, polyfill, uet)
- `/server/` - Server-side code
  - `/api/` - API endpoints (login, register, store, book-list, reader/tts, etc.)
  - `/utils/` - Server utilities (airtable, firebase, firestore, tts-azure, tts-minimax)
- `/utils/` - Shared utilities
- `/types/` - TypeScript type definitions
- `/constants/` - Application constants
- `/shared/` - Shared types and utilities
- `/contracts/` - Smart contract ABIs
- `/i18n/` - Internationalization (en, zh-Hant)
- `/assets/` - Static assets (CSS, images)
- `/public/` - Public static files

**Key Components:** AppHeader, AppFooter, AppLogo, BookCover, BookshelfItem, BookstoreItem, PDFReader, TTSPlayerModal, PaywallModal, LoginModal, StakingControl, PricingPlanSelect

**Key Composables:** use-book-info, use-likecoin-session-api, use-text-to-speech, use-subscription, use-wallet-connect, use-governance-data, use-nft-class-staking-data

### Environment Configuration

**Required Environment Variables:**
- See `.env.example` for full list (45+ variables)
- Critical for build: None (all have defaults or are optional)
- Critical for runtime: `NUXT_SESSION_PASSWORD` (min 32 chars), API keys for Magic Link, WalletConnect, Airtable, Azure TTS, etc.

**Testnet vs Mainnet:**
- Set `IS_TESTNET=TRUE` for Base Sepolia (testnet)
- Omit or set `IS_TESTNET=FALSE` for Base Mainnet
- Different token addresses, RPC URLs, and endpoints

## Code Style & Conventions

**Linting:** ESLint with `@nuxt/eslint-config`
- Stylistic rules enabled
- Auto-fix available via `npm run lint:fix`
- Currently allows 4 v-html warnings (XSS risk acknowledged)

**TypeScript:** Strict typing via Nuxt's built-in vue-tsc integration

**Internationalization:**
- i18n-ally VSCode settings in `.vscode/settings.json`
- Source language: zh-Hant (Traditional Chinese)
- Locales: en, zh-Hant
- Flat key style, sorted keys

**Nuxt Best Practices:**
- Use auto-imports for composables, components, utils
- Use `definePageMeta` for page-level configuration
- Use server API routes in `/server/api/` for backend logic
- Use runtime config for environment variables

## Common Issues & Workarounds

### Build Failures

**Memory Issues:**
- **Symptom:** "FATAL ERROR: Reached heap limit Allocation failed - JavaScript heap out of memory"
- **Fix:** Set `NODE_OPTIONS=--max-old-space-size=8192` before build command

**Sentry Warnings:**
- **Symptom:** "No auth token provided. Will not create release."
- **Impact:** Non-blocking, source maps won't be uploaded
- **Fix:** Set `SENTRY_AUTH_TOKEN` environment variable (optional for local builds)

### Development Server

**Font Provider Errors:**
- **Symptom:** Multiple "Could not initialize provider" errors for Google Fonts, Bunny, etc.
- **Impact:** Non-blocking, local icon collections are used
- **Cause:** Network restrictions or no internet access
- **Fix:** These are warnings only, dev server will start successfully

**Port Conflicts:**
- Default port: 3000
- Override: `npm run dev -- --port 3001`

### Type Checking

**Auto-generated Types:**
- Nuxt generates types in `.nuxt/tsconfig.json` during `nuxt prepare`
- Run `npm install` or `npm run dev` once to generate types if missing

## Testing Strategy

**Current State:** No test infrastructure (no .test/.spec files in project root)

**Manual Validation:**
- Build the application: `NODE_OPTIONS=--max-old-space-size=8192 npm run build`
- Preview locally: `npm run preview`
- Check CI status: All three steps (lint, typecheck, build) must pass

## Security Considerations

**Content Security Policy:**
- Configured in `nuxt.config.ts` via `nuxt-security` module
- Strict CSP with allowlists for external services
- Frame embedding allowed for Base/Farcaster integration

**XSS Risks:**
- Known v-html usage in `/pages/store/[nftClassId]/index.vue` (4 instances)
- These are for markdown rendering and considered acceptable risk

**Dependencies:**
- 10 known vulnerabilities after npm ci (2 low, 4 moderate, 4 high)
- Run `npm audit` for details
- Consider `npm audit fix` but test thoroughly after

## Tips for Efficient Development

**Always:**
1. Run `npm ci` after pulling changes (dependencies may have changed)
2. Set `NODE_OPTIONS=--max-old-space-size=8192` for production builds
3. Run lint and typecheck before pushing: `npm run lint && npm run typecheck`
4. Check CI status after pushing

**Search Strategy:**
- Component locations: `/components/*.vue`
- API endpoints: `/server/api/**/*.{get,post,delete}.ts`
- Business logic: `/composables/use-*.ts`
- State management: `/stores/*.ts`

**Common Files to Check:**
- `nuxt.config.ts` - Module configuration, runtime config
- `package.json` - Scripts, dependencies
- `.github/workflows/ci.yml` - CI pipeline
- `.env.example` - Required environment variables

**Helpful Commands:**
```bash
# Find all components
find components -name "*.vue"

# Find all API endpoints
find server/api -name "*.ts"

# Find all composables
find composables -name "*.ts"

# Search for TODO/FIXME
grep -r "TODO\|FIXME\|HACK" --include="*.ts" --include="*.vue" .
```

## Trust These Instructions

These instructions are comprehensive and verified. Only search for additional information if:
- You need to understand specific implementation details
- These instructions are incomplete for your task
- You encounter errors not documented here

When in doubt, reference the files mentioned in this document rather than searching blindly.
