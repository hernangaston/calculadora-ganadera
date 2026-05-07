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

**API routes** (`routes/api.js`): Three endpoints:
- `GET /api/dolar` — fetches oficial/blue/mep rates from `dolarapi.com/v1/dolares/*` in parallel.
- `GET /api/ganado` — returns a **mock** cattle price (2.55 USD/kg). Intended to integrate ROSGAN/MAG in the future.
- `GET /api/precios` — combines both above into one response.

**Tools (HTML pages)**:
| Page | JS | Description |
|------|----|-------------|
| `vender.html` | `vender.js` | Sell-now vs. wait decision + balance forrajero |
| `productivo/simulador.html` | `productivo/simulador.js` | Recría + corral simulator (legacy, inline logic) |
| `productivo.html` | `productivo.js` | Planificador de invernada |
| `carga.html` | `carga.js` | Calculadora de carga animal |
| `costo.html` | `costo.js` | Costo de producción |
| `logistica.html` | `logistica.js` | Costo de flete |
| `opti-flete.html` | `opti-flete.js` | Optimizador de flete |

**Refactored simulator** (`public/js/`): A newer, modular version of the simulador splits concerns across three ES modules (loaded via `type="module"`):
- `api.js` — `getPrecios()` / `getDolar()` hitting the Express API
- `calculator.js` — pure functions: `compute()` (margin/cost math), `calcularFlete()` (truck sizing), `formatoAR()`
- `ui.js` — `wireManualOverride()` (slider ↔ manual-input toggle), `setDolarUI()`, `setLoading()`
- `app-simulador.js` — orchestration: loads market data, wires all inputs, calls `compute()`, renders Chart.js margin curve

The `productivo/simulador.js` is the older monolithic version of the same logic — it duplicates calculator and UI code inline.

**Manual override pattern**: Throughout the simulador, sliders have an optional "manual" input that overrides them. The UI widget (`.manual-override[data-field="X"]`) holds a checkbox `.manual-check`, a hidden number input `#X_manual`, and the range `#X`. `wireManualOverride()` (or its inline equivalent in the legacy file) manages the enable/disable state between them and syncs constraints.

**Dollar mode**: The simulador lets users select which exchange rate to use (oficial/blue/mep/manual) via radio buttons named `dolar_mode`. `getDolarVentaFromMode()` resolves the rate from the cached API response.

**Chart.js**: The margin-vs-purchase-price curve uses a custom `precioActualPlugin` that draws a dashed vertical line at the current price. The same plugin is duplicated in both the legacy and refactored simulador files.

**Currency formatting**: All ARS amounts use `formatoAR(n, decimales)` which calls `toLocaleString("es-AR")`.

**No bundler**: ES modules in `public/js/` are loaded natively by the browser with `<script type="module">`. Older pages use plain `<script>` tags with globals.
