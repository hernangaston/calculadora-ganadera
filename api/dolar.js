const { getDolares, DOLAR_FALLBACK } = require("../lib/cattle-api");

module.exports = async function handler(req, res) {
  try {
    res.json({ ok: true, dolar: await getDolares() });
  } catch (err) {
    res.status(502).json({
      ok: false,
      error: "No se pudo obtener el dólar desde la API",
      details: { status: err.status || null },
      fallback: DOLAR_FALLBACK,
    });
  }
};
