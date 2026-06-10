# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm start            # Start the Express server at http://localhost:3000
node test/manual.js  # Run the 26 manual tests for calcularResultado()
```

No build step, no linter configured. Node 18+ is required (uses native `fetch` and `AbortSignal.timeout`); `package.json` pins `engines` to 24.x.

## Architecture

This is a single-page vanilla JS + Express app — **Margen Ganadero**, a margin simulator for Argentine cattle farming (invernada). `index.html` is the only page; there is no bundler and no framework.

**Server** (`server.js`): Serves all files as static assets. Mounts `routes/api.js` at `/api`. Exposes `/health`.

### API — dual-target setup

The API runs in two environments and both consume the same core modules:

**`lib/cattle-api.js`** — single source of truth for all API logic (CommonJS):
- `getDolares()` — fetches oficial/blue/mep from `dolarapi.com/v1/dolares/*` in parallel. In-memory cache (60s TTL) + in-flight dedup + serves stale data if upstream fails.
- `getRosgan()` — fetches ROSGAN index. In-memory cache (1h TTL) + in-flight dedup + stale-on-error. Falls back to prior year if current year has no data.
- `getGanado(precomputedDolar)` — combines ROSGAN price + dólar oficial; falls back to `getGanadoMock()` on any failure.
- `fetchJson()` — shared HTTP helper with an 8s timeout (`AbortSignal.timeout`).

**`lib/http-handlers.js`** — single source of truth for the HTTP handlers (`dolarHandler`, `ganadoHandler`, `preciosHandler`, `rosganHandler`).

**Local (`npm start`)** → `routes/api.js` (Express Router) — one-line `router.get()` wiring to the handlers:
- `GET /api/dolar` — oficial/blue/mep exchange rates.
- `GET /api/ganado` — cattle price (ROSGAN + dólar, mock fallback).
- `GET /api/precios` — combines dólar + ganado in one response.
- `GET /api/rosgan` — ROSGAN index (categories, razas, PIRI, PIRC).

**Production (Vercel)** → `api/dolar.js`, `api/ganado.js`, `api/precios.js`, `api/rosgan.js` — serverless handlers that re-export from `lib/http-handlers.js`. Routed via `vercel.json` rewrites.

> When changing API logic (endpoints, shapes, data sources), edit **`lib/cattle-api.js`** (business logic) or **`lib/http-handlers.js`** (HTTP responses) only. The route files and `api/*.js` handlers are intentionally one-liners.

### Frontend modules (`public/js/`)

ES modules loaded natively by the browser (`type="module"`):

- `app-simulador.js` — orchestration: loads market data, wires all inputs, calls `calcularResultado()`, renders the Chart.js margin curve, scenario comparator (A/B/C, in-memory), ROSGAN panel.
- `api.js` — `getPrecios()` / `getRosgan()` / `getDolar()` hitting the Express API, with a direct dolarapi.com fallback for static hosting.
- `calculator.js` — `formatoAR()` (currency formatting, `toLocaleString("es-AR")`).
- `ui.js` — `wireManualOverride()` (slider ↔ manual-input toggle), `setLoading()`.
- `core/feedlot.js` — pure calculation functions: `calcularResultado()`, `calcularFlete()`. No DOM, no fetch. Shared with `test/manual.js` (has its own `package.json` with `"type": "module"`).

**Manual override pattern**: sliders have an optional "manual" input that overrides them. The UI widget (`.manual-override[data-field="X"]`) holds a checkbox `.manual-check`, a number input `#X_manual`, and the range `#X`. `wireManualOverride()` manages the enable/disable state and syncs constraints. After `form.reset()` the state must be re-synced via `setManualEnabled(false)` (reset does not fire `change` events) — the Reset button handler already does this.

**Chart.js**: pinned to v4 via CDN (`chart.js@4`). The margin-vs-purchase-price curve uses a custom `precioActualPlugin` (dashed vertical line at current price), a linear x-axis with `{x, y}` data points, an adaptive step (25 points across the ±30% range), and `update("none")` on slider input (no animation). Defined in `app-simulador.js`.

**Security note**: any string coming from the ROSGAN API that is injected via `innerHTML` must go through `escapeHTML()` in `app-simulador.js`.

**Important**: `CONTEXT.md` holds session context — decisions taken, freight rates, API response shapes, and UI state. Read it and keep it updated when making changes.
