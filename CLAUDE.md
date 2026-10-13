# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Next dev server (Turbopack), http://localhost:3000
npm run build        # production build
npm start            # production server (after build)
npm run check        # tsc --noEmit + eslint — MANDATORY before delivering anything
npm run lint         # eslint . (no-console is an error)
npm run format       # prettier --write .
```

There is **no test framework**. Verification is `npm run check`, `npm run build`, and hitting the
API route against every exchange:

```bash
curl "http://localhost:3000/api/orderbook?exchange=bitfinex&symbol=tBTCUSD&market=spot"
```

## Architecture

Next.js 16 App Router, React 19, Tailwind CSS 3. No database, no secrets, no API keys — only
public exchange REST endpoints.

**Data flow.** `app/page.tsx` (client component) → `GET /api/orderbook` (`app/api/orderbook/route.ts`,
`force-dynamic`) → `fetchOrderBook` dispatcher in `lib/exchanges/index.ts` → one adapter per
exchange in `lib/exchanges/<name>.ts`. Every adapter maps the exchange's own response format to
the shared `OrderBookData` contract in `lib/types.ts`. The route proxies on the server: no CORS,
no client IP exposed to the exchanges.

**Single source of truth** for what each exchange supports is `lib/types.ts`:
`SUPPORTED_MARKETS`, `EXCHANGE_ASSETS` and `toExchangeSymbol` (exchange-native symbols:
`BTCUSDT`, `BTC-USD`, `tBTCUSD`, `XBTUSD`, `BTC-USDT-SWAP`). The UI disables markets an exchange
does not have.

**Exchange switching.** `page.tsx` derives `activeAsset` / `activeMarket` at render time from the
selected exchange, so a request is never sent with a pair the exchange lacks (e.g. `tBNBUSD` or
Bitfinex futures). `requestIdRef` drops responses of superseded requests — a late error must not
overwrite a fresh order book. Keep both guards when touching `load()`.

**Aggregation** (`lib/aggregate.ts`) runs on the client: bids round down, asks round up; a level
cheaper than the step keeps its own price instead of collapsing into a phantom `0` bucket. At most
`DISPLAY_ROWS` (50) rows per side are rendered. The heatmap bar is per-level volume, deliberately
not cumulative.

**Settings** persist in `localStorage` under the `orderbook:` prefix (`lib/storage.ts`).

**Configuration** is the committed `.env` (public defaults only). `NEXT_PUBLIC_*` values are
inlined at build time. Binance depth is clamped per market (futures max 1000).

## Conventions

- Prettier: single quotes, semicolons, no trailing commas, width 100, LF. A pre-commit hook
  (husky + lint-staged) runs ESLint and Prettier on staged files.
- ESLint: typescript-eslint `strict` + `no-console`.
- UI text and code comments are in Russian; README is in English.
- Respond to the user in Russian; keep answers concise.

## Operational cautions

- The repository (github.com/lpcms/crypto-orderbook) is public — never commit secrets; local
  overrides go to `.env.local` (git-ignored).
- Binance and Bybit block US IP addresses. `vercel.json` pins Vercel functions to `fra1`;
  self-hosted servers must also be outside the US.
- Exchange limits: Bitfinex `len` max 250, Bybit spot 200 / linear 500, OKX `sz` max 400,
  Kraken `count` 500, Coinbase level 2 is the full aggregated book.
