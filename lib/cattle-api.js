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
    // Evita que un upstream colgado bloquee la función hasta el timeout de plataforma
    signal: AbortSignal.timeout(8000),
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

async function _fetchDolares() {
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

let _dolarCache = null;
let _dolarCacheTime = 0;
let _dolarInflight = null;
const DOLAR_TTL = 60 * 1000; // 1 minuto

async function getDolares() {
  if (_dolarCache && Date.now() - _dolarCacheTime < DOLAR_TTL) return _dolarCache;
  if (_dolarInflight) return _dolarInflight;

  _dolarInflight = _fetchDolares()
    .then((dolares) => {
      _dolarCache = dolares;
      _dolarCacheTime = Date.now();
      return dolares;
    })
    .catch((err) => {
      if (_dolarCache) return _dolarCache; // dato viejo antes que error
      throw err;
    })
    .finally(() => {
      _dolarInflight = null;
    });

  return _dolarInflight;
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

async function _fetchRosgan() {
  const year = new Date().getFullYear();
  let entry = null;
  try {
    entry = await _fetchAnio(year);
  } catch (_) {
    // año actual no disponible (error HTTP 404/500); intentar año anterior
  }
  if (!entry) entry = await _fetchAnio(year - 1);
  if (!entry) throw new Error("Sin datos disponibles");

  return {
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
}

let _rosganInflight = null;

async function getRosgan() {
  if (_rosganCache && Date.now() - _rosganCacheTime < ROSGAN_TTL) {
    return _rosganCache;
  }
  if (_rosganInflight) return _rosganInflight;

  _rosganInflight = _fetchRosgan()
    .then((result) => {
      _rosganCache    = result;
      _rosganCacheTime = Date.now();
      return result;
    })
    .catch((err) => {
      if (_rosganCache) return _rosganCache; // dato viejo antes que error
      throw err;
    })
    .finally(() => {
      _rosganInflight = null;
    });

  return _rosganInflight;
}

// ── Noticias (RSS agro) ───────────────────────────────────────────────────────

// Feeds verificados con UA de navegador. ValorCarne=403 Cloudflare,
// TodoAgro=timeout/down → descartados. Agroverdad redirige (sin barra final).
const NOTICIAS_FEEDS = [
  { url: "https://www.infocampo.com.ar/category/ganaderia/feed/", fuente: "Infocampo" },
  { url: "https://bichosdecampo.com/category/ganaderia/feed/",    fuente: "Bichos de Campo" },
  { url: "https://agroverdad.com.ar/category/ganaderia/feed",     fuente: "Agroverdad" },
];

const NOTICIAS_TTL = 2 * 60 * 60 * 1000; // 2 horas

const _KWORDS = {
  produccion: [
    "produccion", "invernada", "recria", "feedlot", "engorde", "pasturas",
    "destete", "paricion", "nutricion", "forraje", "sanidad", "manejo",
    " kg", "rodeo", "ganadero", "bovino", "vacuno", "novillo", "ternero",
    "kilos", "faena", "peso",
  ],
  economia: [
    "precio", "mercado", "exportacion", "dolar", "consumo", "demanda",
    "retenciones", "valor", "china", "liniers", "cañuelas", "rosgan",
    "ingreso", "rentabilidad", "costo", "negocio", "hacienda",
  ],
  tecnologia: [
    "tecnologia", "innovacion", "biotecnologia", "genetica", "agtech",
    "software", "app", "trazabilidad", "drones", "satelital",
    "inteligencia artificial", " ia ", "datos", "digital", "sistema",
    "plataforma", "sensor",
  ],
};

async function fetchText(url) {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(8000),
    redirect: "follow",
    headers: {
      "User-Agent":
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "Accept": "application/rss+xml, application/xml;q=0.9, */*;q=0.8",
    },
  });
  if (!res.ok) {
    const err = new Error(`HTTP ${res.status} al pedir ${url}`);
    err.status = res.status;
    throw err;
  }
  return res.text();
}

function _stripCDATA(s) {
  return s.replace(/^<!\[CDATA\[/, "").replace(/\]\]>$/, "").trim();
}

function _extractTag(inner, tag) {
  const m = inner.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return m ? _stripCDATA(m[1].trim()) : "";
}

function _stripHtml(s) {
  return s
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g,  "&").replace(/&lt;/g,   "<").replace(/&gt;/g,   ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g,  "'").replace(/&nbsp;/g, " ")
    .replace(/&#\d+;/g, "").replace(/&[a-z]+;/gi, "")
    .replace(/\s+/g, " ").trim();
}

function _truncate(s, n = 250) {
  return s.length <= n ? s : s.slice(0, n).trimEnd() + "…";
}

function _parseRSSItems(xml, fuenteName) {
  const items = [];
  for (const raw of (xml.match(/<item>([\s\S]*?)<\/item>/g) || [])) {
    const inner  = raw.slice(6, -7);
    const title  = _stripHtml(_extractTag(inner, "title"));
    const link   =
      _stripCDATA((inner.match(/<link>([\s\S]*?)<\/link>/) || [])[1] || "").trim() ||
      _stripCDATA(_extractTag(inner, "guid")).trim();
    const pubDate = _extractTag(inner, "pubDate");
    const desc    = _stripHtml(_extractTag(inner, "description"));
    if (!title || !link) continue;
    items.push({
      titulo:  title,
      link,
      fuente:  fuenteName,
      fecha:   pubDate ? new Date(pubDate).toISOString() : null,
      resumen: _truncate(desc),
    });
  }
  return items;
}

function _classifyItem(item) {
  const texto = (item.titulo + " " + item.resumen).toLowerCase();
  let best = null, bestScore = 0;
  for (const [cat, kws] of Object.entries(_KWORDS)) {
    const score = kws.filter((kw) => texto.includes(kw)).length;
    if (score > bestScore) { bestScore = score; best = cat; }
  }
  return bestScore > 0 ? best : null;
}

function _pickNoticias(allItems) {
  const now   = Date.now();
  const WIN72 = 72 * 60 * 60 * 1000;
  const noticias  = { produccion: null, economia: null, tecnologia: null };
  const usedLinks = new Set();

  // Pasada 1: items con fecha en ventana 72h
  for (const item of allItems) {
    if (!item.fecha) continue;
    if (now - new Date(item.fecha).getTime() > WIN72) continue;
    if (usedLinks.has(item.link)) continue;
    const cat = _classifyItem(item);
    if (cat && !noticias[cat]) { noticias[cat] = item; usedLinks.add(item.link); }
    if (Object.values(noticias).every(Boolean)) return noticias;
  }

  // Pasada 2: cualquier item para completar slots vacíos
  for (const item of allItems) {
    if (Object.values(noticias).every(Boolean)) break;
    if (usedLinks.has(item.link)) continue;
    const cat = _classifyItem(item);
    if (cat && !noticias[cat]) { noticias[cat] = item; usedLinks.add(item.link); }
  }

  return noticias;
}

async function _fetchNoticias() {
  const results = await Promise.allSettled(
    NOTICIAS_FEEDS.map(({ url, fuente }) =>
      fetchText(url).then((xml) => _parseRSSItems(xml, fuente))
    )
  );

  const allItems = [];
  for (let i = 0; i < results.length; i++) {
    if (results[i].status === "fulfilled") {
      allItems.push(...results[i].value);
    } else {
      console.warn(
        `[getNoticias] Feed ${NOTICIAS_FEEDS[i].url} falló:`,
        results[i].reason?.message || results[i].reason
      );
    }
  }

  allItems.sort((a, b) => {
    const da = a.fecha ? new Date(a.fecha).getTime() : 0;
    const db = b.fecha ? new Date(b.fecha).getTime() : 0;
    return db - da;
  });

  return {
    ok: true,
    fuente: "RSS agro",
    actualizado: new Date().toISOString(),
    noticias: _pickNoticias(allItems),
  };
}

let _noticiasCache     = null;
let _noticiasCacheTime = 0;
let _noticiasInflight  = null;

async function getNoticias() {
  if (_noticiasCache && Date.now() - _noticiasCacheTime < NOTICIAS_TTL) {
    return _noticiasCache;
  }
  if (_noticiasInflight) return _noticiasInflight;

  _noticiasInflight = _fetchNoticias()
    .then((result) => {
      _noticiasCache     = result;
      _noticiasCacheTime = Date.now();
      return result;
    })
    .catch((err) => {
      if (_noticiasCache) return _noticiasCache; // dato viejo antes que error
      throw err;
    })
    .finally(() => {
      _noticiasInflight = null;
    });

  return _noticiasInflight;
}

// ── Exports ───────────────────────────────────────────────────────────────────

module.exports = {
  fetchJson,
  fetchText,
  normalizeDolar,
  getDolares,
  DOLAR_FALLBACK,
  getGanadoMock,
  getGanado,
  masReciente,
  getRosgan,
  getNoticias,
};
