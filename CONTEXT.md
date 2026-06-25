# Contexto de sesión — Margen Ganadero

## 1. Proyecto

**Nombre:** Margen Ganadero  
**Propósito:** Herramienta de decisión para ganadería bovina argentina — simulador de márgenes, costos y logística de invernada.  
**URL producción:** https://margenganadero.com  
**Hosting:** Vercel (serverless functions + static files). Repositorio: `hernangaston/calculadora-ganadera` en GitHub. Deploy automático desde `main`.

---

## 2. Stack

- **Backend:** Node.js 24, Express 4.18 (solo para desarrollo local)
- **Frontend:** Vanilla JS (ES modules nativos), HTML5, CSS3 — sin bundler, sin framework
- **Analytics:** `@vercel/analytics` v2.0.1 — script tag `/_vercel/insights/script.js` en `index.html` (equivalente a `inject()`, funciona sin bundler)
- **Gráficos:** Chart.js v4.4.9 vía CDN con SRI (`integrity="sha384-b0GXujLkk9eYYSmcSfoyZbfyElGAQnDyY0skCHSG6w3JgTMFnz11ggrTAr7seu9f"`). Versión exacta pinneada en `public/index.html`. No usar `@4` flotante.
- **APIs externas:** `dolarapi.com` (tipos de cambio), `rosgan.com.ar/api/precios-fede` (índice ganadero)
- **Deploy:** Vercel serverless functions para la API; static file serving para el frontend

---

## 3. Arquitectura de archivos

```
server.js                   Servidor Express local. Monta routes/api.js en /api, sirve estáticos desde public/.
                              Middleware de seguridad: X-Content-Type-Options, Referrer-Policy,
                              X-Frame-Options, Permissions-Policy, CSP (sin 'unsafe-inline' en script-src).
routes/api.js               Express Router — 5 rutas: router.get("/X", handler) → lib/http-handlers.js.
lib/cattle-api.js           ★ ÚNICA fuente de verdad de la lógica de API (CommonJS). Exporta:
                              getDolares() [caché 60s + dedup + stale-on-error],
                              getRosgan() [caché 1h + dedup + stale-on-error], getGanado(),
                              getGanadoMock() [fallback], DOLAR_FALLBACK, fetchJson() [timeout 8s],
                              fetchText() [RSS, UA navegador, redirect:follow, timeout 8s],
                              normalizeDolar(), masReciente(), getNoticias() [caché 2h + dedup + stale-on-error].
lib/http-handlers.js        Handlers HTTP compartidos (CommonJS). Exporta: dolarHandler,
                              ganadoHandler, preciosHandler, rosganHandler, noticiasHandler. Usado por
                              routes/api.js (Express) y api/*.js (Vercel) — única fuente
                              de la lógica de respuesta HTTP.
api/dolar.js                Handler serverless Vercel — re-exporta dolarHandler.
api/ganado.js               Handler serverless Vercel — re-exporta ganadoHandler.
api/precios.js              Handler serverless Vercel — re-exporta preciosHandler.
api/rosgan.js               Handler serverless Vercel — re-exporta rosganHandler.
api/noticias.js             Handler serverless Vercel — re-exporta noticiasHandler.
vercel.json                 Rewrites /api/* → handlers serverless. outputDirectory: "public".
                              Headers de seguridad (CSP, HSTS, X-Frame-Options, etc.) aplicados a /(.*).

public/index.html           ★ Única página. Layout 3 columnas (resultados | gráfico | sliders).
public/simulador.css        Estilos del simulador. CSS variables en :root. Responsive mobile-first.
public/styles.css           Estilos globales compartidos. NO tocar desde simulador.css.
public/js/app-simulador.js  Orquestación: carga API, conecta sliders, llama a
                              calcularResultado(), renderiza Chart.js, renderiza panel novedades.
public/js/core/feedlot.js   Cálculo puro (sin DOM, sin fetch). Exporta calcularResultado()
                              y calcularFlete(). Compartido con test/manual.js.
public/js/api.js            Fetch del frontend → /api/precios, /api/rosgan, /api/dolar, /api/noticias.
                              Fallback directo a dolarapi.com si /api/dolar o /api/precios no responde.
                              getNoticias() sin fallback: si falla el panel se oculta silenciosamente.
public/js/ui.js             wireManualOverride() (slider ↔ input manual), setLoading().
public/js/calculator.js     formatoAR(n, decimales) — formato ARS con toLocaleString("es-AR").

test/manual.js              Tests manuales de calcularResultado() — correr con node test/manual.js.
                            26 tests, 0 fallos (verificado 22/06/2026). Usar adpvCampo/adpvCorral,
                            no adpv (parámetro obsoleto ignorado silenciosamente).
```

---

## 4. Decisiones tomadas

- **lib/cattle-api.js es la única fuente de verdad de lógica de negocio.** Toda lógica de fetch, normalización y caché vive ahí. No duplicar lógica en otros archivos.
- **lib/http-handlers.js es la única fuente de verdad de los handlers HTTP.** Contiene los 4 handlers (`dolarHandler`, `ganadoHandler`, `preciosHandler`, `rosganHandler`). `routes/api.js` y `api/*.js` son re-exports de una línea — no tienen lógica propia.
- **Dual-target sin cambiar el modelo de deploy:** el mismo código sirve en Express local y en Vercel serverless. No colapsar a un solo entrypoint.
- **Sin bundler.** ES modules cargados nativamente en el browser. Los archivos `public/js/core/*` tienen `package.json` con `{ "type": "module" }` para usarlos también desde Node.
- **Caché en memoria en `lib/cattle-api.js`** (module-level): ROSGAN TTL 1h (el índice cambia una vez por mes), dólar TTL 60s. Ambas con **dedup de requests concurrentes** (se cachea la promesa in-flight — una carga de página dispara `getRosgan` por dos caminos: `/api/rosgan` y `/api/precios`) y **stale-on-error** (si el upstream falla y hay caché vencida, se sirve el dato viejo en vez de 502). No se justifica Redis ni storage externo.
- **`fetchJson()` (server) tiene timeout de 8s** vía `AbortSignal.timeout` — un upstream colgado no bloquea la función serverless hasta el timeout de plataforma.
- **Eje X del gráfico:** tipo `linear` con datos `{x, y}` (no category). Usar `stepSize: 1000` + `maxTicksLimit: 8` + callback `$${(val/1000).toFixed(0)}k`. No volver a array paralelo labels/data.
- **Curva de margen:** 25 puntos con paso adaptativo `(max-min)/24` (mínimo 1) sobre el rango ±30% del precio de compra — no volver a paso fijo de $500 (daba ~4 puntos). En updates por slider usar `chartMargen.update("none")` (sin animación).
- **Reset del simulador:** después de `form.reset()` hay que llamar `setManualEnabled(false)` en cada override y ocultar los badges ROSGAN — `form.reset()` desmarca checkboxes sin disparar `change`, y si no se re-sincroniza el slider queda `disabled`.
- **Escapar HTML de datos externos:** todo string de la API ROSGAN que se inyecte vía `innerHTML` pasa por `escapeHTML()` (`app-simulador.js`).
- **`renderMarket()` no va dentro de `actualizar()`** — el panel de tipos de cambio no depende de los sliders; se renderiza una vez al resolver `loadMarket()`.
- **Comparador — empates:** si la mejor y la peor celda de una fila tienen el mismo valor, no se resalta ninguna (guard `best !== worst`).
- **calcularFlete()** retorna `{ jaulaDoble, jaulaSimple, chasis, costoFlete, seguroFlete, descripcion, arranque, tarifaDoble, tarifaSimple, tarifaChasis }` — **siempre**, incluso cuando `distancia === 0` (early return completo con todos los campos en 0/constantes). Las tarifas están extraídas al objeto `TARIFAS` en `feedlot.js` (single source of truth). `arranque` es 0 cuando `distancia >= 200` (intencional — el arranque desaparece en viajes largos). Las cards de logística muestran: Jaula doble/simple/Chasis con la tarifa/km entre paréntesis (ej. "2 ($3.900,00/Km.)"), Costo, Arranque (visible aunque sea 0), Seguro.
- **Tarifas de flete vigentes (Pepa, Knubel y Ferrero SRL — 02/06/2026):**
  - Corte de arranque: `km < 200` (antes era `<= 300`)
  - Jaula doble: arranque $130.000 + $3.900/km. Seguro fijo: $90.000/viaje.
  - Jaula simple: arranque $115.000 + $3.200/km. Seguro fijo: $80.000/viaje.
  - Chasis: arranque $98.000 + $2.800/km. Seguro fijo: $70.000/viaje.
  - Seguro: fijo por cantidad de camiones (`doble*90000 + simple*80000 + chasis*70000`), ya no es porcentual sobre el costo.
- **La discontinuidad de `fleteCamion()` a los 200 km es intencional — NO "corregirla".** A 199 km cuesta más que a 200 km porque el arranque desaparece en `km >= 200`. Confirmado por el usuario (10/06/2026): así funciona la tarifa en la práctica; en viajes largos el arranque se negocia en el momento y no hay forma de automatizar esa negociación. Cualquier code review futura va a marcar esto como bug — no lo es.
- **Layout desktop:** 3 columnas fijas (`360px | minmax(520px,1fr) | 380px` en ≥1200px). No romper con cambios de CSS que afecten `.simulador-layout`.
- **Mobile:** variables primero (order:1), resultados segundo (order:2), gráfico tercero (order:3, visible). Sin nav bar — el simulador es la única pantalla.
- **ROSGAN auto-set:** al cargar, `precioCompra` se setea al PIRI y `precioVenta` al precio Braford/Brangus de Novillos 1-2 años. Los sliders expanden su `max` si el valor ROSGAN lo excede.
- **`getGanado(precomputedDolar = null)`** — acepta dólar pre-fetcheado para evitar doble fetch en `preciosHandler`. Si se pasa, no llama a `getDolares()` internamente. Categoría: `Novillos 1 a 2 años`, raza: `Braford y Brangus` (fallback al precio general de la categoría si la raza es 0). `precioUsdKg = precioArsKg / dolar.oficial.venta`. Si falla cualquier fuente, retorna `getGanadoMock()` y loguea el error. `getGanadoMock()` se mantiene solo como fallback — no eliminar.
- **`calcularResultado()`** retorna ahora `costoCompra` como campo explícito — es `pesoCompra * precioCompraEfectivo * animales` (incluye comisión compra). Se muestra como primera fila de la card de costos.
- **`preciosHandler`** precalienta dólar y ROSGAN en paralelo con `Promise.all([getDolares(), getRosgan()])`, luego llama `getGanado(dolar)` reutilizando las cachés ya tibias — reduce la latencia en caché fría de ~16s a ~8s (el más lento de los dos), bien por debajo del timeout de 6s del frontend.
- **`getRosgan()`** busca el tipo `"Cría"` o `"Cria"` (ambas formas) para compatibilidad con la API ROSGAN.
- **Fallback de año en `_fetchRosgan()`**: el intento del año actual está en try/catch — si falla con error HTTP (404/500) o devuelve array vacío, cae a `year - 1`. Solo lanza "Sin datos disponibles" si ambos años fallan.
- **`wireManualOverride()`** en `ui.js` nunca retorna `null` — si los elementos DOM están ausentes retorna un objeto neutro `{ getValue:()=>0, setAutoValue:()=>{}, ... }`. No rompe `leerInputs()` ni ningún caller.
- **`precioEquilibrio`** en el gráfico se calcula por interpolación lineal entre los dos puntos que cruzan margen=0. Fallback a argmin si la curva no cruza cero en el rango.
- **`loadRosgan()`** catch block llama `actualizar(ui, overrides)` para que la UI no quede en estado cero si falla la carga de ROSGAN.
- **`marketStatus`** (`#marketStatus`) existe en el HTML (dentro de `.api-summary-head`) y está referenciado en `buildUIRefs()` — muestra "Cargando datos de mercado…" durante la carga del dólar.
- **Shapes de respuesta de API fijos** (no romper clientes existentes):
  - `/dolar`: `{ ok, dolar:{ oficial, blue, mep } }`
  - `/ganado`: `{ ok, fuente, mercado, categoria, raza, unidad, precioArsKg, precioUsdKg, dolarOficial, fecha, anio, mes }`
  - `/precios`: `{ ok, dolar, ganado:{ fuente, unidad, precioUsdKg, fecha } }`
  - `/rosgan`: `{ ok, fuente, url, anio, mes, fecha_remate, piri, pirc, invernada, cria }`

---

## 5. Estado actual de la UI

**Margen Ganadero** (`index.html`) — única pantalla:

- **Header (`simulador-header`):** diseño tipo isologo. Fondo verde oscuro (`#1B4332`). Flex row: toro SVG vectorizado inline a la izquierda (90px desktop, 52px mobile) + texto a la derecha. Padding `.simulador-brand`: `24px 30px`. El SVG usa `viewBox="150 280 720 480"` (recortado al área del animal). Clases: `.simulador-brand`, `.brand-logo`, `.brand-texto`, `.brand-subtitulo` ("ASISTENTE DE DECISIÓN", color `#6EE7B7`), `.brand-titulo` ("Margen Ganadero", 28px, color `#ECFDF5`). El `<h1>` tiene clase `.brand-titulo` — mantiene semántica SEO.
- **Mobile — header:** en ≤700px, padding 14px 16px, gap 14px, SVG 52px, `.brand-titulo` 20px.
- **Columna izquierda (resultados):** card principal con badge de rentabilidad + margen/cabeza (2rem) + margen total (1.4rem) · ROSGAN colapsable `<details>` con fecha en el summary · card de costos (label/valor en dos columnas) · card de pesos (fondo verde suave) · dos cards de logística apiladas (Flete compra / Flete venta), cada una con filas Jaula doble / Jaula simple / Chasis / Costo / Seguro.
- **Card de costos** (`.resultado-costos`): filas Costo compra → Costo producción → Comisión compra → **Costo total** (línea separadora sólida). La comisión de venta ya NO aparece aquí — se mueve a la card de margen (ver abajo).
- **Card de margen** (`.resultado-principal`): margen/cabeza destacado (sin cambios) + desglose condicional del margen total. Si `comisionVentaTotal > 0`, aparece `#margenDesglose` con dos filas: "Margen (antes com. venta)" = `res.margen + res.comisionVentaTotal` y "Com. venta" = `−res.comisionVentaTotal` (clase `.resultado-descuento-row`), seguidas del `#margenTotal` (neto, el mismo valor de siempre). Si comisión venta = 0, el bloque está `display:none` y la card se ve igual que antes. El cálculo de `feedlot.js` no cambia — solo se descompone el margen ya calculado en el front.
- **Columna central:** panel de tipos de cambio (Blue/Oficial/MEP) + **panel Novedades del sector** (ver abajo) + canvas Chart.js (curva margen vs precio compra, eje X en $Xk, línea vertical "Precio actual") + comparador de escenarios (ver abajo).
- **Panel "Novedades del sector"** (`.novedades-panel`): card verde igual a las demás, ubicada entre Tipos de cambio y el canvas. Carga vía `loadNoticias()` en `main()` (no bloquea simulador). Muestra 3 `<details>` colapsables, uno por categoría (Producción / Economía / Tecnología). Cada summary muestra un pill de categoría + el título. Al abrir: resumen texto plano + "Leer más →" (target _blank rel noopener) + fuente + fecha. Si una categoría no tiene noticias: estado dashed gris "Sin novedades hoy". Todo string externo pasa por `escapeHTML()`. Endpoint: `GET /api/noticias` → `{ ok, fuente:"RSS agro", actualizado, noticias:{ produccion, economia, tecnologia } }`, cada categoría es `{ titulo, link, fuente, fecha, resumen }` o null.
- **`getNoticias()` (cattle-api.js):** caché 2h + dedup in-flight + stale-on-error. Feeds RSS activos (verificados 24/06/2026): Infocampo ganadería (`/category/ganaderia/feed/`, 200), Bichos de Campo ganadería (`/category/ganaderia/feed/`, 200), Agroverdad ganadería (`/category/ganaderia/feed` sin barra, 301→200). Descartados: ValorCarne (403 Cloudflare), TodoAgro (timeout/down). `fetchText()` manda UA de Chrome y `Accept: application/rss+xml`; `redirect:"follow"`. Feeds en paralelo con `Promise.allSettled` — un feed caído no tumba el panel. Parseo por regex sobre `<item>…</item>` estándar RSS 2.0 (WordPress). Sanitización: strip tags HTML, decode entidades, truncar a 250 chars. Clasificación por keywords en 3 categorías (produccion/economia/tecnologia); prioridad a mayor cantidad de matches; deduplicación por link entre categorías; ventana 72h en pasada 1, fallback sin ventana en pasada 2. `NOTICIAS_FEEDS` es constante editable al tope de `lib/cattle-api.js`.
- **Columna derecha (sliders):** 5 secciones (`COMPRA`, `RECRÍA A CAMPO`, `TERMINACIÓN EN CORRAL`, `VENTA`, `LOGÍSTICA`), cada una en un `<div class="slider-card">` (misma card que columna izquierda: fondo blanco, radius, sombra). Cada `.slider-section-header` tiene barra vertical menta (`border-left: 3px solid var(--menta)`) y texto en `--verde-oscuro`. Cada label es flex con `output` como pill verde suave (`--verde-suave`, `--verde-oscuro`, border-radius 999px) alineado a la derecha. Varios sliders tienen override manual (ver abajo).
- **Sliders custom (cross-browser):** `appearance: none` + webkit/moz pseudo-elements. Track 6px, border-radius 999px, fondo `--track-bg`. Thumb 19px (22px en ≤700px), círculo `--verde`, borde blanco, sombra suave. Relleno de progreso: JS setea `--val` en cada elemento (`syncSliderProgress()`, llamado en cada `actualizar()`); CSS usa `linear-gradient(90deg, var(--verde) var(--val), var(--track-bg) var(--val))` en webkit; Firefox usa `::-moz-range-progress` nativo. `:focus-visible` muestra anillo `var(--menta)`.
- **Override manual:** `.manual-check` visualmente oculto (position:absolute, opacity:0, 1px); `.manual-toggle` se ve como pill/botón con ícono `✎` + texto; activo con clase `is-manual` (fondo y borde verde). `.manual-input` compacto (max-width 140px). NO cambiar ids ni la API de wireManualOverride().
- **`.rosgan-set-badge`:** pill menta (`background: var(--menta)`, `color: var(--verde-oscuro)`).
- **CSS vars nuevas en `:root`:** `--verde-oscuro: #1B4332`, `--verde-suave: #E8F5E9`, `--menta: #6EE7B7`, `--menta-suave: #A7F3D0`, `--track-bg: #C8E6C9`.
- **Mobile:** sliders primero, resultados después, gráfico al final (280px). Sliders táctiles height 36px.
- **Mobile — tipos de cambio:** en mobile (≤480px) el grid de Blue/Oficial/MEP es de 3 columnas (`1fr 1fr 1fr`) en lugar de 1 columna. Fuentes reducidas (`.api-k` 0.72rem, `.api-v` 0.9rem, `.api-meta` 0.7rem).
- **Fechas cortas:** `formatFecha()` en `app-simulador.js` retorna solo `HH:MM` si la fecha es hoy, o `DD/MM` si es otro día.
- **Comparador — montos compactos:** los valores monetarios del comparador usan `formatoCompacto(n)` — en mobile (≤700px) muestra `$XXXk` o `$X.XM` en lugar del número completo; en desktop muestra el valor completo.
- **Footer (`.site-footer`):** fondo `--verde-oscuro`, flex centrado. Muestra "Margen Ganadero" (color `--menta`) + enlace de contacto. El `<a id="footerContacto">` tiene fallback text "Escribinos" en HTML; JS en `main()` arma `href="mailto:contacto@margenganadero.com"` y `textContent` en runtime (anti-spam: la dirección no aparece en el HTML estático).
- **Favicon:** toro vectorizado inline como data-URI SVG (mismo path que el logo del header, viewBox="150 280 720 480"). Toro `#A7F3D0` (verde menta) sobre fondo transparente. Versión **toro completo** (no silueta simplificada): el path usa un único color plano sin detalles internos, por lo que a 16px rinde una silueta orgánica legible. OG tags presentes.

### Comparador de escenarios

Ubicado en `section.graficos`, debajo del canvas. Todo en memoria JS — sin localStorage, sin backend.

**Estado:** `const escenarios = [null, null, null]` (módulo-level en `app-simulador.js`). Índices 0=A, 1=B, 2=C.

**Funciones en `app-simulador.js`:**
- `guardarEscenario(idx)` — snapshot de `state.inputs` + resultado de `calcularResultado()` → `escenarios[idx]`, llama `renderComparador()`.
- `limpiarEscenario(idx)` — `escenarios[idx] = null`, llama `renderComparador()`.
- `renderComparador()` — reconstruye la tabla en `#comparadorBody`. Resalta en verde la celda mejor y en rojo la peor por fila (solo entre escenarios con datos). Idempotente — se puede llamar en cualquier momento.

**HTML (`index.html`):** `section.comparador#comparador` con:
- `.solo-print#printHeader` — encabezado visible solo en impresión (título + `#printFecha`)
- `.comparador-header` (h2 + `.comparador-botones` con 3 `button.btn-escenario[data-idx]` + `#btnExportarPdf.btn-pdf`)
- `p.comparador-vacio#comparadorVacio`
- `div#comparadorBody` (tabla)
- `div#comparadorDiferencias` (resumen textual de diferencias)

**CSS (`simulador.css`):** clases `.comparador`, `.comparador-header`, `.comparador-botones`, `.btn-escenario`, `.comparador-vacio`, `.comparador-tabla`, `.mejor` (verde), `.peor` (rojo), `.btn-limpiar-escenario`. `.btn-pdf` (verde oscuro #1B4332, texto blanco). `.solo-print` (display:none en pantalla). `.comparador-diferencias-inner` (fondo verde suave, borde izquierdo). `@media print` (ver abajo). Responsive ≤700px.

**Campos comparados:** margenCabeza, margen, costoTotal, costoProduccion, comisionCompraTotal, comisionVentaTotal, pesoFinal, kgProducidos, diasTotales.

**Exportación PDF (`#btnExportarPdf`):**
- Visible SOLO cuando `escenarios.every(e => e !== null)` (los 3 cargados). Se oculta si se limpia cualquiera.
- Al hacer click: setea `#printFecha` con `new Date().toLocaleDateString("es-AR")` y llama `window.print()`. Sin dependencias externas.
- `@media print` en `simulador.css`: oculta `.simulador-header`, `.resultados`, `.variables`, todo en `.graficos` salvo `.comparador`; oculta `.comparador-botones`, `#btnExportarPdf`, `.btn-limpiar-escenario`; muestra `.solo-print`; fuerza `print-color-adjust: exact` en `.mejor`/`.peor` (verde/rojo); `@page { size: A4; margin: 1.5cm }`.
- `.solo-print#printHeader` muestra solo "Margen Ganadero" + fecha — sin repetir "Comparar escenarios", que ya aparece en el `<h2>` de la sección.

**Bloque de diferencias (`renderDiferencias()`):** se renderiza en `#comparadorDiferencias` siempre que haya ≥2 escenarios. Genera 2–3 líneas de prosa: mejor margen/cabeza (y ventaja sobre el peor), mejor margen total si difiere, y rango de inputs clave que difieran (días totales, precio compra, precio venta). Visible en pantalla y en print.

---

## 6. Pendientes

1. **Tests automatizados** — `test/manual.js` requiere correrlo a mano con `node`. No hay CI ni runner automático.
2. **Linter / formatter** — no hay ESLint ni Prettier configurado.
3. **Rewrites no-op en `vercel.json`** — source = destination en los 4. Se dejaron por no arriesgar el routing sin probar deploy; candidatos a eliminar.

## 7. Seguridad aplicada (22/06/2026)

- **Headers en Express (`server.js`):** middleware manual (sin helmet) que setea en todas las respuestas: `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: DENY`, `Permissions-Policy: geolocation=(), microphone=(), camera=()`, `Content-Security-Policy` (ver abajo). Ya existía `app.disable("x-powered-by")`.
- **Headers en Vercel (`vercel.json`):** sección `"headers"` con `source: "/(.*)"`. Los mismos headers que Express más `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload` (HSTS — solo tiene sentido en HTTPS, por eso no va en Express local).
- **CSP vigente:** `default-src 'self'; script-src 'self' https://cdn.jsdelivr.net; connect-src 'self' https://dolarapi.com; img-src 'self' data:; style-src 'self' 'unsafe-inline'; font-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self';`
  - `script-src`: `'self'` (módulos JS propios) + `https://cdn.jsdelivr.net` (Chart.js). **Sin `'unsafe-inline'`** — la app no tiene handlers inline ni `onclick=`.
  - `connect-src`: `'self'` (APIs internas + Vercel Analytics `/_vercel/insights/`) + `https://dolarapi.com` (fallback directo desde el browser si `/api/*` no responde).
  - `style-src 'unsafe-inline'`: necesario — Chart.js aplica estilos inline al canvas.
  - `img-src data:`: necesario — el favicon es un SVG data-URI inline.
  - ROSGAN se llama desde el servidor (lib/cattle-api.js), no desde el browser → no necesita aparecer en `connect-src`.
- **SRI en Chart.js:** `<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.9/dist/chart.umd.min.js" integrity="sha384-b0GXujLkk9eYYSmcSfoyZbfyElGAQnDyY0skCHSG6w3JgTMFnz11ggrTAr7seu9f" crossorigin="anonymous">`. Versión pinnada a 4.4.9 (último 4.4.x estable). El hash fue calculado con `curl | openssl dgst -sha384 -binary | openssl base64 -A`.
- **Exposición de archivos fuente:** `index.html`, `styles.css`, `simulador.css` movidos a `public/`. Express ahora hace `express.static(path.join(__dirname, "public"))` y sirve `public/index.html` en `/`. `vercel.json` usa `outputDirectory: "public"`. Resultado: `server.js`, `lib/`, `routes/`, `test/`, `*.md`, `package.json`, `vercel.json` no son accesibles vía HTTP — no están dentro del static root.
- **Escaping:** `renderDiferencias()` y las vistas de print usan solo labels hardcodeados ("A"/"B"/"C") y `formatoAR()` de números. No hay strings de API externa en esos innerHTML. ROSGAN ya usaba `escapeHTML()`. Sin cambios adicionales.
- **npm audit:** 0 vulnerabilidades (verificado 22/06/2026).

---

## 8. Comando para correr local

```bash
npm start
# → http://localhost:3000
```
