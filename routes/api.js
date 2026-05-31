// API routes: /dolar, /ganado, /precios, /rosgan
const express = require("express");
const router = express.Router();

async function fetchJson(url, options = {}) {
  if (typeof fetch !== "function") {
    const err = new Error("Este servidor requiere fetch nativo (Node 18+).");
    err.status = 500;
    throw err;
  }
  const res = await fetch(url, {
    ...options,
    headers: {
      "accept": "application/json",
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const err = new Error(`HTTP ${res.status} al pedir ${url}`);
    err.status = res.status;
    err.body = text;
    throw err;
  }

  return await res.json();
}

function pickDolarRates(payload) {
  // DolarAPI suele devolver objetos por endpoint.
  // Normalizamos a { oficial, blue, mep } con { venta, compra, fechaActualizacion? }
  const normalize = (p) => ({
    compra: typeof p?.compra === "number" ? p.compra : null,
    venta: typeof p?.venta === "number" ? p.venta : null,
    fechaActualizacion: p?.fechaActualizacion || p?.fecha || null,
    fuente: p?.casa || p?.nombre || null,
  });

  return {
    oficial: normalize(payload.oficial),
    blue: normalize(payload.blue),
    mep: normalize(payload.mep),
  };
}

router.get("/dolar", async (req, res) => {
  try {
    // DolarAPI: endpoints comunes
    // - https://dolarapi.com/v1/dolares/oficial
    // - https://dolarapi.com/v1/dolares/blue
    // - https://dolarapi.com/v1/dolares/bolsa (MEP)
    const [oficial, blue, mep] = await Promise.all([
      fetchJson("https://dolarapi.com/v1/dolares/oficial"),
      fetchJson("https://dolarapi.com/v1/dolares/blue"),
      fetchJson("https://dolarapi.com/v1/dolares/bolsa"),
    ]);

    res.json({
      ok: true,
      dolar: pickDolarRates({ oficial, blue, mep }),
    });
  } catch (err) {
    res.status(502).json({
      ok: false,
      error: "No se pudo obtener el dólar desde la API",
      details: {
        status: err.status || null,
      },
      fallback: {
        oficial: { compra: null, venta: 0, fechaActualizacion: null, fuente: "fallback" },
        blue: { compra: null, venta: 0, fechaActualizacion: null, fuente: "fallback" },
        mep: { compra: null, venta: 0, fechaActualizacion: null, fuente: "fallback" },
      },
    });
  }
});

let rosganCache = null;
let rosganCacheTime = 0;
const ROSGAN_TTL = 60 * 60 * 1000;

function masReciente(data) {
  if (!Array.isArray(data) || data.length === 0) return null;
  return data.slice().sort((a, b) =>
    b.anio_remate !== a.anio_remate
      ? b.anio_remate - a.anio_remate
      : b.mes_remate - a.mes_remate
  )[0];
}

router.get("/rosgan", async (req, res) => {
  const now = Date.now();
  if (rosganCache && now - rosganCacheTime < ROSGAN_TTL) {
    return res.json(rosganCache);
  }
  try {
    const year = new Date().getFullYear();
    let entry = await fetchJson(`https://www.rosgan.com.ar/api/precios-fede/${year}`).then(d => masReciente(d?.data));
    if (!entry) entry = await fetchJson(`https://www.rosgan.com.ar/api/precios-fede/${year - 1}`).then(d => masReciente(d?.data));
    if (!entry) throw new Error("Sin datos");

    const result = {
      ok: true,
      fuente: "ROSGAN – Mercado Ganadero BCR",
      url: "https://www.rosgan.com.ar/indices",
      anio: entry.anio_remate,
      mes: entry.mes_remate,
      fecha_remate: entry.fecha_remate,
      piri: entry.piri,
      pirc: entry.pirc,
      invernada: entry.tipos?.find((t) => t.titulo === "Invernada") ?? null,
      cria:      entry.tipos?.find((t) => t.titulo === "Cria")      ?? null,
    };

    rosganCache = result;
    rosganCacheTime = now;
    res.json(result);
  } catch {
    res.status(502).json({ ok: false, error: "No se pudo obtener datos de ROSGAN" });
  }
});

router.get("/ganado", async (req, res) => {
  // Preparado para ROSGAN/MAG. Por ahora mock estable.
  // Nota: usamos USD/kg para que el selector de dólar tenga impacto directo.
  res.json({
    ok: true,
    fuente: "mock",
    mercado: "invernada",
    unidad: "USD/kg",
    precioUsdKg: 2.55,
    fecha: new Date().toISOString(),
    notas: "Mock inicial. Preparado para integrar ROSGAN/MAG.",
  });
});

router.get("/precios", async (req, res) => {
  try {
    const [dolarResp, ganadoResp] = await Promise.all([
      (async () => {
        const [oficial, blue, mep] = await Promise.all([
          fetchJson("https://dolarapi.com/v1/dolares/oficial"),
          fetchJson("https://dolarapi.com/v1/dolares/blue"),
          fetchJson("https://dolarapi.com/v1/dolares/bolsa"),
        ]);
        return { ok: true, dolar: pickDolarRates({ oficial, blue, mep }) };
      })(),
      (async () => ({
        ok: true,
        fuente: "mock",
        mercado: "invernada",
        unidad: "USD/kg",
        precioUsdKg: 2.55,
        fecha: new Date().toISOString(),
      }))(),
    ]);

    res.json({
      ok: true,
      dolar: dolarResp.dolar,
      ganado: {
        fuente: ganadoResp.fuente,
        unidad: ganadoResp.unidad,
        precioUsdKg: ganadoResp.precioUsdKg,
        fecha: ganadoResp.fecha,
      },
    });
  } catch (err) {
    res.status(502).json({
      ok: false,
      error: "No se pudieron obtener precios",
    });
  }
});

module.exports = router;

