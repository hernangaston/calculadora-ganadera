# Contexto de sesión — Calculadora Ganadera

## 1. Proyecto

**Nombre:** Calculadora Ganadera  
**Propósito:** Suite de herramientas de decisión para ganadería bovina argentina (invernada, venta, flete, carga animal, costo de producción).  
**URL producción:** https://ganaderia-murex.vercel.app  
**Hosting:** Vercel (serverless functions + static files). Repositorio: `hernangaston/calculadora-ganadera` en GitHub. Deploy automático desde `main`.

---

## 2. Stack

- **Backend:** Node.js 24, Express 4.18 (solo para desarrollo local)
- **Frontend:** Vanilla JS (ES modules nativos), HTML5, CSS3 — sin bundler, sin framework
- **Gráficos:** Chart.js vía CDN (`<script src="https://cdn.jsdelivr.net/npm/chart.js">`)
- **APIs externas:** `dolarapi.com` (tipos de cambio), `rosgan.com.ar/api/precios-fede` (índice ganadero)
- **Deploy:** Vercel serverless functions para la API; static file serving para el frontend

---

## 3. Arquitectura de archivos

```
server.js                   Servidor Express local. Monta routes/api.js en /api, sirve estáticos.
routes/api.js               Express Router — wrappers finos sobre lib/cattle-api.js (4 rutas).
lib/cattle-api.js           ★ ÚNICA fuente de verdad de la lógica de API (CommonJS). Exporta:
                              getDolares(), getRosgan() [caché 1h], getGanadoMock(),
                              DOLAR_FALLBACK, fetchJson(), normalizeDolar(), masReciente().
api/dolar.js                Handler serverless Vercel — wrapper sobre getDolares().
api/ganado.js               Handler serverless Vercel — wrapper sobre getGanadoMock().
api/precios.js              Handler serverless Vercel — combina getDolares() + getGanadoMock().
api/rosgan.js               Handler serverless Vercel — wrapper sobre getRosgan().
vercel.json                 Rewrites /api/* → handlers serverless. outputDirectory: ".".

productivo/simulador.html   ★ Herramienta principal. Layout 3 columnas (resultados | gráfico | sliders).
productivo/simulador.css    Estilos del simulador. CSS variables en :root. Responsive mobile-first.
public/js/app-simulador.js  Orquestación del simulador: carga API, conecta sliders, llama a
                              calcularResultado(), renderiza Chart.js.
public/js/core/feedlot.js   Cálculo puro (sin DOM, sin fetch). Exporta calcularResultado()
                              y calcularFlete(). Shared con test/manual.js.
public/js/api.js            Fetch del frontend → /api/precios, /api/rosgan, /api/dolar.
                              Fallback directo a dolarapi.com si /api/* no responde (GitHub Pages).
public/js/ui.js             wireManualOverride() (slider ↔ input manual), setLoading().
public/js/calculator.js     formatoAR(n, decimales) — formato ARS con toLocaleString("es-AR").

nav.js                      Inserta botón "← Volver al inicio" al final de <main> en todas las páginas.
styles.css                  Estilos globales compartidos. NO tocar desde simulador.css.

vender.js / vender.html     Herramienta: decisión vender ahora vs esperar + balance forrajero.
productivo.js / .html       Planificador de invernada (versión legacy, inline).
carga.js / carga.html       Calculadora de carga animal.
costo.js / costo.html       Costo de producción.
logistica.js / logistica.html  Costo de flete.
opti-flete.js / opti-flete.html  Optimizador de flete.

test/manual.js              Tests manuales de calcularResultado() — correr con node test/manual.js.
```

---

## 4. Decisiones tomadas

- **lib/cattle-api.js es la única fuente de verdad de API.** Toda lógica de fetch, normalización y caché vive ahí. `routes/api.js` y `api/*.js` son wrappers HTTP finos. No duplicar lógica en ellos.
- **Dual-target sin cambiar el modelo de deploy:** el mismo código sirve en Express local y en Vercel serverless. No colapsar a un solo entrypoint.
- **Sin bundler.** ES modules cargados nativamente en el browser. Los archivos `public/js/core/*` tienen `package.json` con `{ "type": "module" }` para usarlos también desde Node.
- **Caché de ROSGAN en memoria** (module-level, TTL 1h) en `lib/cattle-api.js`. El índice cambia una vez por mes — no se justifica Redis ni storage externo.
- **Eje X del gráfico:** tipo `linear` con datos `{x, y}` (no category). Usar `stepSize: 1000` + `maxTicksLimit: 8` + callback `$${(val/1000).toFixed(0)}k`. No volver a array paralelo labels/data.
- **calcularFlete()** retorna `{ jaulaDoble, jaulaSimple, chasis, costoFlete, seguroFlete, descripcion }`. Los tres campos numéricos se muestran en filas separadas en el HTML.
- **Layout simulador desktop:** 3 columnas fijas (`360px | minmax(520px,1fr) | 380px` en ≥1200px). No romper con cambios de CSS que afecten `.simulador-layout`.
- **Mobile:** variables primero (order:1), resultados segundo (order:2), gráfico tercero (order:3, visible). Botón "Volver al inicio" fijo al fondo vía `.mobile-nav-bar` (nav.js inserta el botón en el grid — no se mueve, se oculta con CSS y se duplica en el bar fijo).
- **ROSGAN auto-set:** al cargar, `precioCompra` se setea al PIRI y `precioVenta` al precio Braford/Brangus de Novillos 1-2 años. Los sliders expanden su `max` si el valor ROSGAN lo excede.
- **Shapes de respuesta de API fijos** (no romper clientes existentes):
  - `/dolar`: `{ ok, dolar:{ oficial, blue, mep } }`
  - `/ganado`: `{ ok, fuente, mercado, unidad, precioUsdKg, fecha, notas }`
  - `/precios`: `{ ok, dolar, ganado:{ fuente, unidad, precioUsdKg, fecha } }`
  - `/rosgan`: `{ ok, fuente, url, anio, mes, fecha_remate, piri, pirc, invernada, cria }`

---

## 5. Estado actual de la UI

**Simulador de Invernada** (`productivo/simulador.html`) — herramienta principal, completamente rediseñada:

- **Columna izquierda (resultados):** card principal con badge de rentabilidad + margen/cabeza (2rem) + margen total (1.4rem) · ROSGAN colapsable `<details>` con fecha en el summary · card de costos (label/valor en dos columnas) · card de pesos (fondo verde suave) · dos cards de logística apiladas (Flete compra / Flete venta), cada una con filas Jaula doble / Jaula simple / Chasis / Costo / Seguro.
- **Columna central:** panel de tipos de cambio (Blue/Oficial/MEP) + canvas Chart.js (curva margen vs precio compra, eje X en $Xk, línea vertical "Precio actual").
- **Columna derecha (sliders):** form con headers de sección uppercase (`COMPRA`, `RECRÍA A CAMPO`, `TERMINACIÓN EN CORRAL`, `VENTA`, `LOGÍSTICA`). Varios sliders tienen override manual (checkbox + input).
- **Mobile:** sliders primero, resultados después, gráfico al final (280px). Nav bar fijo verde al fondo. Sliders táctiles height 36px.
- **Favicon:** emoji 🐄 inline SVG. OG tags presentes.

**Otras herramientas** (vender, productivo, carga, costo, logistica, opti-flete): funcionales pero sin el rediseño de UI del simulador.

---

## 6. Pendientes

1. **Integración real de precios ganado** — `getGanadoMock()` retorna 2.55 USD/kg hardcodeado. Pendiente integrar ROSGAN/MAG como fuente de precio de venta en USD.
2. **Rediseño de otras herramientas** — vender, productivo, carga, costo, logistica, opti-flete siguen con UI antigua. El simulador es el único con el nuevo diseño de cards.
3. **Tests automatizados** — `test/manual.js` requiere correrlo a mano con `node`. No hay CI ni runner automático.
4. **Linter / formatter** — no hay ESLint ni Prettier configurado.
5. **Caché de dólar** — `getRosgan()` tiene caché pero `getDolares()` no. Si el volumen lo justifica, agregar TTL corto (5-10 min) en `lib/cattle-api.js`.

---

## 7. Comando para correr local

```bash
npm start
# → http://localhost:3000
# → simulador: http://localhost:3000/productivo/simulador.html
```
