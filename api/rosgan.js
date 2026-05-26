const { fetchJson } = require("./_shared");

let cache = null;
let cacheTime = 0;
const CACHE_TTL = 60 * 60 * 1000; // 1 hora — el índice cambia una vez por mes

function masReciente(data) {
  if (!Array.isArray(data) || data.length === 0) return null;
  return data.slice().sort((a, b) =>
    b.anio_remate !== a.anio_remate
      ? b.anio_remate - a.anio_remate
      : b.mes_remate - a.mes_remate
  )[0];
}

async function fetchAnio(year) {
  const data = await fetchJson(`https://www.rosgan.com.ar/api/precios-fede/${year}`);
  return masReciente(data?.data);
}

module.exports = async function handler(req, res) {
  const now = Date.now();
  if (cache && now - cacheTime < CACHE_TTL) {
    return res.json(cache);
  }

  try {
    const year = new Date().getFullYear();
    let entry = await fetchAnio(year);
    if (!entry) entry = await fetchAnio(year - 1);
    if (!entry) throw new Error("Sin datos disponibles");

    const invernada = entry.tipos?.find((t) => t.titulo === "Invernada") ?? null;

    const result = {
      ok: true,
      fuente: "ROSGAN – Mercado Ganadero BCR",
      url: "https://www.rosgan.com.ar/indices",
      anio: entry.anio_remate,
      mes: entry.mes_remate,
      fecha_remate: entry.fecha_remate,
      piri: entry.piri,
      invernada,
    };

    cache = result;
    cacheTime = now;
    res.json(result);
  } catch {
    res.status(502).json({ ok: false, error: "No se pudo obtener datos de ROSGAN" });
  }
};
