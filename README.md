# Token Calculator

Find out how many AI model tokens your money can buy.

Enter your available balance in your local currency and compare how many tokens it buys across several models, side by side. No account needed.  
https://token-calculator-43db8.web.app/

## Features

- **Compare models side by side:** see how far your balance goes on each model.
- **Live pricing and FX rates:** fetched from a model catalog, so numbers stay current.
- **Match your workload:** adjust the mix of cache read, input, and output tokens to fit how you actually use models.
- **Coverage estimate per slot:** see how much of your usage each model slot can cover.
- **Prices per 1M tokens:** input and output prices in the currency you pick.
- **Multiple currencies:** for example IDR and USD, with locale-aware formatting.
- **Model details:** the model picker shows info for each model, including max output tokens.
- **Light and dark mode.**

## Getting started

### Requirements

- Node.js `^20.19.0` or `>=22.12.0` (required by Vite 8)

Open the local URL that Vite prints.

### Configuration

The app reads its Firebase, reCAPTCHA Enterprise, and catalog endpoint settings from `.env.local`. The file `.env.example` lists every variable.

`VITE_APPCHECK_DEBUG_TOKEN` is for local development only. Leave it blank in production.

## Tech stack

- [React 19](https://react.dev) with TypeScript
- [Vite](https://vite.dev)
- [Chakra UI 3](https://chakra-ui.com) for components and theming
- [Firebase](https://firebase.google.com) (App Check) to protect the catalog endpoint
- [Axios](https://axios-http.com) for catalog requests
- Also: `@lobehub/icons`, `react-icons`
