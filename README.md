# Token Calculator

Find out how many AI model tokens your money can buy.

Enter your available balance in your local currency and compare how many tokens it buys across several models, side by side. No account needed.  
https://token-calculator-43db8.web.app/

## Features

- **Compare up to five models side by side:** see how far your balance goes on each model (`MAX_SELECTED` in `src/lib/modelCatalog.ts`).
- **Live pricing and FX rates:** fetched from a model catalog, so numbers stay current. Until the catalog publishes a rate, a currency falls back to the fixed `perUSD` figure in `src/lib/pricing.ts`, and the last good rate table is cached in `localStorage` under `exchangeRates`.
- **Match your workload:** sliders for cache read, input, and output shares in the usage composition dialog, so the blend reflects how you actually call models.
- **Coverage estimate per slot:** see how much of your usage each model slot can cover.
- **Prices per 1M tokens:** input, output, and cache read prices in the currency you pick.
- **Edit a price inline:** each price row in the model info popover has a pencil. Type a different rate, then save (check icon or Enter) or cancel (cross icon or Escape). Overrides are held in memory for the current session only — nothing is persisted or sent anywhere — and the picker, the slots, and the coverage math all use the edited price, which is flagged with an `edited` badge.
- **Multiple currencies:** IDR and USD, defined in `CURRENCIES` (`src/lib/pricing.ts`) with locale-aware formatting and per-currency decimal rules.
- **Model details:** provider, context window, max output, modalities, release date, and knowledge cutoff in the picker's info popover. A fact with no published value drops its row instead of showing "—".
- **Usage analytics:** Firebase Analytics (GA4) collects the SDK's automatic events (`page_view`, `session_start`, …). It stays completely off when not configured. `trackEvent` in `src/lib/analytics.ts` is the hook for custom feature events; no call sites use it yet.
- **Light and dark mode,** applied before first paint by the inline script in `index.html` so the stored theme never flashes.

## Getting started

### Requirements

- Node.js `^20.19.0` or `>=22.12.0` (required by Vite 8)

### Run it

```bash
npm install
cp .env.example .env.local   # then fill in the values — see Configuration
npm run dev
```

Open the local URL that Vite prints.

The app fails closed instead of half-starting: unset Firebase values raise an error card naming the variables (`configErrorMessage` in `src/lib/firebase.ts`), and a missing `VITE_AI_MODELS_URL` throws before the first request (`src/lib/models.ts`).

Other scripts:

```bash
npm run build     # tsc -b && vite build, output in dist/
npm run preview   # serve the production build locally
npm run lint      # eslint .
npm test          # vitest run
```

### Configuration

The app reads its Firebase, reCAPTCHA Enterprise, and catalog endpoint settings from `.env.local`. The file `.env.example` lists every variable.

`VITE_AI_MODELS_URL` has to be an absolute `https:` URL. A relative value would send the App Check token to whatever origin the page is on, so `resolveModelsEndpoint` rejects it; plain `http:` is accepted only for a loopback host, and only in dev, so the Firebase emulator stays usable.

Analytics needs one extra optional variable: set `VITE_FIREBASE_MEASUREMENT_ID` to the GA4 Measurement ID from Firebase Console → Analytics. It only takes effect when Analytics is enabled for the Firebase project; left blank, the app runs exactly as before with no tracking (see `src/lib/analytics.ts`). To watch events locally, open Analytics → DebugView in the console and add `debug_mode: true` to a test event.

`VITE_APPCHECK_DEBUG_TOKEN` is for local development only — a production build drops the code that reads it entirely (see the `import.meta.env.DEV` guard in `src/lib/firebase.ts`), so there is nothing to switch off in prod.

- **Leave it blank** and App Check mints a token for you: the first load in a browser prints `Firebase App Check debug token: <uuid>`, and the SDK stores it in IndexedDB, so reloads reuse the same one.
- **Register it** before it works — an unregistered token is rejected by the token exchange. Firebase Console → App Check → Apps, or `firebase appcheck:debugtokens:create <uuid> --project <project-id> --app <app-id>`.
- **Then pin it** in `.env.local`, so another browser or profile reuses your token instead of generating yet another one.
- **Treat the dev console as sensitive.** While debug mode is on the SDK logs the token on *every* load, pinned tokens included — so don't screenshot or screen-record a dev console, and keep the registered token out of git (`.env.local` is gitignored). Revoke it when you are done: `firebase appcheck:debugtokens:delete`.

### Tests

`npm test` runs the suites in `src/tests/`: `pricing.test.ts` covers the money and token math (currency parsing, FX fallbacks, the blended per-1M rate, coverage, price overrides), and `securityHeaders.test.ts` checks the Firebase Hosting headers against what the app actually loads. The headers suite skips itself when `firebase.json` is absent — which it is in a fresh clone, see Deployment.

## Deployment

```bash
npm run build && firebase deploy --only hosting   # Hosting serves dist/
```

`firebase.json`, `.firebaserc`, and `.firebase` are gitignored, so the hosting config — including the CSP and the rest of the security headers — lives outside the repo. Copy it in or recreate it before deploying, otherwise the header guards in `npm test` silently skip.

One coupling to respect: the CSP authorizes the inline theme bootstrap in `index.html` by SHA-256 hash, so changing that script without updating the header leaves the deployed site painting light until Chakra restores the stored color mode. `src/tests/securityHeaders.test.ts` is the canonical list of both that hash and the `connect-src` origins — read its header comment before adding an endpoint.

The About popover prints the app version, injected at build time from `package.json` as `__APP_VERSION__` (see `vite.config.ts`), so bump `version` when you ship.

## Tech stack

- [React 19](https://react.dev) with [TypeScript](https://www.typescriptlang.org) (`tsc -b` runs in the build)
- [Vite](https://vite.dev) 8 for dev server and bundling
- [Chakra UI 3](https://chakra-ui.com) for components and theming
- [Firebase](https://firebase.google.com) JS SDK — App Check (reCAPTCHA Enterprise) to protect the catalog endpoint, Analytics for usage measurement
- [Vitest](https://vitest.dev) for tests
- [Axios](https://axios-http.com) for catalog requests
- Also: `@lobehub/icons` for the provider marks (`src/components/ProviderMark.tsx`), `react-icons` for UI glyphs (`src/components/icons.tsx`)
