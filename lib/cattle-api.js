// lib/cattle-api.js — core compartido entre routes/api.js (Express local)
// y los handlers serverless de Vercel (api/*.js).
// CommonJS para compatibilidad con ambos entornos.

"use strict";

// ── HTTP helper ───────────────────────────────────────────────────────────────

async function fetchJson(url, options = {}) {
  if (typeof fetch !== "function") {
    const err = new Error("Este servidor requiere fetch nativo (Node 18+).");
    err.status = 500;
    throw err;
  }
  const res = await fetch(url, {
    ...options,
    headers: {
      accept: "application/json",
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
  return res.json();
}

// ── Dólar ─────────────────────────────────────────────────────────────────────

function normalizeDolar(p) {
  return {
    compra: typeof p?.compra === "number" ? p.compra : null,
    venta:  typeof p?.venta  === "number" ? p.venta  : null,
    fechaActualizacion: p?.fechaActualizacion || p?.fecha || null,
    fuente: p?.casa || p?.nombre || null,
  };
}

async function getDolares() {
  const [oficial, blue, mep] = await Promise.all([
    fetchJson("https://dolarapi.com/v1/dolares/oficial"),
    fetchJson("https://dolarapi.com/v1/dolares/blue"),
    fetchJson("https://dolarapi.com/v1/dolares/bolsa"),
  ]);
  return {
    oficial: normalizeDolar(oficial),
    blue:    normalizeDolar(blue),
    mep:     normalizeDolar(mep),
  };
}

const DOLAR_FALLBACK = {
  oficial: { compra: null, venta: 0, fechaActualizacion: null, fuente: "fallback" },
  blue:    { compra: null, venta: 0, fechaActualizacion: null, fuente: "fallback" },
  mep:     { compra: null, venta: 0, fechaActualizacion: null, fuente: "fallback" },
};

// ── Ganado ────────────────────────────────────────────────────────────────────

function getGanadoMock() {
  return {
    ok: true,
    fuente: "mock",
    mercado: "invernada",
    unidad: "USD/kg",
    precioUsdKg: 2.55,
    fecha: new Date().toISOString(),
    notas: "Fallback. No se pudieron obtener datos de ROSGAN o dólar.",
  };
}

async function getGanado(precomputedDolar = null) {
  try {
    const [rosgan, dolar] = await Promise.all([getRosgan(), precomputedDolar ? Promise.resolve(precomputedDolar) : getDolares()]);

    const cat = rosgan.invernada?.categorias?.find(
      (c) => c.titulo === "Novillos 1 a 2 años"
    );
    const precioRaza = cat?.razas?.find(
      (r) => r.titulo === "Braford y Brangus"
    )?.precio;

    const precioArsKg = (precioRaza > 0 ? precioRaza : null) ?? cat?.precio;
    if (!precioArsKg || precioArsKg <= 0) throw new Error("Precio invernada no disponible");

    const dolarOficial = dolar.oficial.venta;
    if (!dolarOficial || dolarOficial <= 0) throw new Error("Dólar oficial no disponible");

    const raza = precioRaza > 0 ? "Braford y Brangus" : null;

    return {
      ok: true,
      fuente: "ROSGAN – Mercado Ganadero BCR",
      mercado: "invernada",
      categoria: "Novillos 1 a 2 años",
      raza,
      unidad: "USD/kg",
      precioArsKg,
      precioUsdKg: Math.round((precioArsKg / dolarOficial) * 10000) / 10000,
      dolarOficial,
      fecha: rosgan.fecha_remate,
      anio: rosgan.anio,
      mes: rosgan.mes,
    };
  } catch (err) {
    console.error("[getGanado] error:", err.message, "— usando mock");
    return getGanadoMock();
  }
}

// ── ROSGAN ────────────────────────────────────────────────────────────────────

let _rosganCache = null;
let _rosganCacheTime = 0;
const ROSGAN_TTL = 60 * 60 * 1000; // 1 hora — el índice cambia una vez por mes

function masReciente(data) {
  if (!Array.isArray(data) || data.length === 0) return null;
  return data.slice().sort((a, b) =>
    b.anio_remate !== a.anio_remate
      ? b.anio_remate - a.anio_remate
      : b.mes_remate - a.mes_remate
  )[0];
}

async function _fetchAnio(year) {
  const data = await fetchJson(`https://www.rosgan.com.ar/api/precios-fede/${year}`);
  return masReciente(data?.data);
}

async function getRosgan() {
  const now = Date.now();
  if (_rosganCache && now - _rosganCacheTime < ROSGAN_TTL) {
    return _rosganCache;
  }

  const year = new Date().getFullYear();
  let entry = await _fetchAnio(year);
  if (!entry) entry = await _fetchAnio(year - 1);
  if (!entry) throw new Error("Sin datos disponibles");

  const result = {
    ok: true,
    fuente: "ROSGAN – Mercado Ganadero BCR",
    url: "https://www.rosgan.com.ar/indices",
    anio: entry.anio_remate,
    mes:  entry.mes_remate,
    fecha_remate: entry.fecha_remate,
    piri: entry.piri,
    pirc: entry.pirc,
    invernada: entry.tipos?.find((t) => t.titulo === "Invernada") ?? null,
    cria:      entry.tipos?.find((t) => t.titulo === "Cría" || t.titulo === "Cria") ?? null,
  };

  _rosganCache    = result;
  _rosganCacheTime = now;
  return result;
}

// ── Exports ───────────────────────────────────────────────────────────────────

module.exports = {
  fetchJson,
  normalizeDolar,
  getDolares,
  DOLAR_FALLBACK,
  getGanadoMock,
  getGanado,
  masReciente,
  getRosgan,
};
