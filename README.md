# Token Calculator

## Information

Token Calculator is a browser-based tool for estimating how far your money goes with AI models. Enter your available balance in your local currency and compare how many tokens it buys across multiple models side by side.

- Model pricing and FX rates come from a live, Firebase App Check–protected model catalog
- Adjustable usage composition (cache read / input / output mix) so estimates match real workloads
- Per-slot coverage estimate, plus input and output prices per 1M tokens in the active currency
- Multi-currency support (e.g. IDR, USD) with catalog-published rates and locale-aware formatting
- Runs entirely in the browser — no account required

## Tech Stack

- [React 19](https://react.dev) + TypeScript
- [Vite](https://vite.dev) for dev tooling and builds
- [Chakra UI 3](https://chakra-ui.com) for the component system and theming (light/dark color mode)
- [Firebase](https://firebase.google.com) (App Check) for securing the catalog endpoint
- [Axios](https://axios-http.com) for catalog transport

## Packages

Extra libraries beyond the React/Vite/Chakra framework itself:

- @chakra-ui/react
- firebase
- axios
- @lobehub/icons
- react-icons

## Scripts

```bash
npm run dev      # start the dev server
npm run build    # type-check and build for production
npm run lint     # run ESLint
npm run preview  # preview the production build
```
