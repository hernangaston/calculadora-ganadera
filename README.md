# Margen Ganadero

Simulador web para decidir si una invernada es rentable **antes** de comprar la hacienda.

**En producción:** [margenganadero.com](https://margenganadero.com)

<!-- Agregar captura: docs/captura.png -->
<!-- ![Margen Ganadero](docs/captura.png) -->

## El problema

Un productor que va a comprar terneros para engordar necesita saber cuánto puede pagar por kilo sin perder plata. Ese cálculo combina precio de compra y de venta, comisiones, días de recría a campo y de terminación en corral, aumento diario de peso, fletes y tipo de cambio. Hasta ahora se resolvía con planillas que llevaban horas y había que rehacer cada vez que cambiaba un precio.

## Qué hace

- Calcula el margen por cabeza y el margen total de la operación, con el desglose de costos.
- Muestra una curva de margen según el precio de compra y marca el **precio máximo rentable** (punto de equilibrio).
- Precarga precios de mercado: índices ganaderos de Rosgan y cotizaciones del dólar (oficial, blue y MEP).
- Calcula el flete según la distancia y el tipo de camión (jaula doble, simple o chasis).
- Compara hasta 3 escenarios lado a lado, resalta el mejor y el peor valor de cada fila, y los exporta a PDF.
- Muestra un panel de noticias del sector a partir de feeds RSS.

## Stack

| Capa | Tecnología |
| --- | --- |
| Frontend | JavaScript (ES modules nativos, sin framework ni bundler), HTML5, CSS3, Chart.js 4.4.9 |
| Backend | Node.js 24; funciones serverless en Vercel; Express para desarrollo local |
| APIs externas | [dolarapi.com](https://dolarapi.com), Rosgan, feeds RSS de medios del agro |
| Deploy | Vercel, con deploy automático desde `main` |

## Decisiones técnicas

- **Un solo código para dos entornos.** La lógica de las APIs vive en `lib/cattle-api.js` y los handlers HTTP en `lib/http-handlers.js`. Las funciones de `api/*.js` (Vercel) y las rutas de Express (`routes/api.js`) solo los reexportan.
- **Caché en el servidor con deduplicación.** El dólar se cachea 60 s, Rosgan 1 h y las noticias 2 h. Las requests concurrentes comparten la misma promesa, y si una fuente externa falla se sirve el último dato válido.
- **Timeouts de 8 s** en las llamadas externas, para que una fuente colgada no bloquee la función serverless.
- **Cálculo puro separado de la UI.** `public/js/core/feedlot.js` no toca el DOM ni hace fetch, así que se testea desde Node.
- **Seguridad:** headers CSP (sin `unsafe-inline` en scripts), HSTS, `X-Frame-Options` y `Referrer-Policy`; Chart.js cargado con SRI; los datos externos se escapan antes de insertarlos en el HTML.

## Estructura

```
api/            Funciones serverless de Vercel (dolar, ganado, precios, rosgan, noticias)
lib/            Lógica de APIs externas, caché y handlers HTTP compartidos
routes/         Router de Express para desarrollo local
public/         Frontend: index.html, estilos y módulos JS
public/js/core/ Cálculo de márgenes y fletes (sin DOM)
test/           Tests del cálculo
server.js       Servidor local con headers de seguridad
vercel.json     Rutas y headers de producción
```

## Correr en local

Requiere Node.js 24.

```bash
npm install
npm start
# http://localhost:3000
```

## Tests

```bash
node test/manual.js
```

26 casos sobre el cálculo de márgenes y fletes (incluye distancia cero, distancia negativa y el corte de tarifa de flete a los 200 km).

## Pendientes

- Correr los tests con un runner (Jest o `node --test`) y en CI.
- Configurar ESLint y Prettier.
