# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm start          # Start the Express server at http://localhost:3000
```

No build step, no tests, no linter configured. Node 18+ is required (uses native `fetch`).

## Architecture

This is a multi-page vanilla JS + Express app — a suite of agricultural decision tools for Argentine cattle farming. Each tool is a self-contained HTML+JS pair served as static files, with a thin Express layer on top.

**Server** (`server.js`): Serves all files as static assets. Mounts `routes/api.js` at `/api`. Exposes `/health`.

### API — dual-target setup

The API runs in two different environments and both consume the same core module:

**`lib/cattle-api.js`** — single source of truth for all API logic (CommonJS):
- `getDolares()` — fetches oficial/blue/mep from `dolarapi.com/v1/dolares/*` in parallel and normalizes.
- `getGanadoMock()` — returns mock cattle price (2.55 USD/kg). Prepared to integrate ROSGAN/MAG.
- `getRosgan()` — fetches ROSGAN index with 1-hour in-memory cache. Falls back to prior year.
- `DOLAR_FALLBACK`, `normalizeDolar()`, `fetchJson()`, `masReciente()` — shared helpers.

**Local (`npm start`)** → `routes/api.js` (Express Router) — thin wrappers that call `lib/cattle-api.js`:
- `GET /api/dolar` — oficial/blue/mep exchange rates.
- `GET /api/ganado` — mock cattle price.
- `GET /api/precios` — combines dólar + ganado in one response.
- `GET /api/rosgan` — ROSGAN index (categories, razas, PIRI, PIRC).

**Production (Vercel)** → `api/dolar.js`, `api/ganado.js`, `api/precios.js`, `api/rosgan.js` — serverless function handlers, also thin wrappers over `lib/cattle-api.js`. Routed via `vercel.json` rewrites.

> When changing API logic (endpoints, shapes, data sources), edit **`lib/cattle-api.js`** only.
> The route files and handlers are intentionally minimal.

### Tools (HTML pages)

| Page | JS | Description |
|------|----|-------------|
| `vender.html` | `vender.js` | Sell-now vs. wait decision + balance forrajero |
| `productivo/simulador.html` | `public/js/app-simulador.js` | Recría + corral simulator (modular) |
| `productivo.html` | `productivo.js` | Planificador de invernada |
| `carga.html` | `carga.js` | Calculadora de carga animal |
| `costo.html` | `costo.js` | Costo de producción |
| `logistica.html` | `logistica.js` | Costo de flete |
| `opti-flete.html` | `opti-flete.js` | Optimizador de flete |

### Simulator modules (`public/js/`)

ES modules loaded natively by the browser (`type="module"`):

- `app-simulador.js` — orchestration: loads market data, wires all inputs, calls `calcularResultado()`, renders Chart.js margin curve.
- `api.js` — `getPrecios()` / `getRosgan()` hitting the Express API.
- `calculator.js` — `formatoAR()` (currency formatting).
- `ui.js` — `wireManualOverride()` (slider ↔ manual-input toggle), `setLoading()`.
- `core/feedlot.js` — pure calculation functions: `calcularResultado()`, `calcularFlete()`. No DOM, no fetch. Shared with `test/manual.js`.

**Manual override pattern**: sliders have an optional "manual" input that overrides them. The UI widget (`.manual-override[data-field="X"]`) holds a checkbox `.manual-check`, a hidden number input `#X_manual`, and the range `#X`. `wireManualOverride()` manages the enable/disable state and syncs constraints.

**Chart.js**: the margin-vs-purchase-price curve uses a custom `precioActualPlugin` (dashed vertical line at current price) and a linear x-axis with `{x, y}` data points. Defined in `app-simulador.js`.

**Currency formatting**: all ARS amounts use `formatoAR(n, decimales)` → `toLocaleString("es-AR")`.

**No bundler**: ES modules in `public/js/` are loaded natively. Older pages use plain `<script>` tags with globals.
