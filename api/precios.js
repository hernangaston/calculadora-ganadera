const { fetchJson, normalize } = require("./_shared");

module.exports = async function handler(req, res) {
  try {
    const [oficial, blue, mep] = await Promise.all([
      fetchJson("https://dolarapi.com/v1/dolares/oficial"),
      fetchJson("https://dolarapi.com/v1/dolares/blue"),
      fetchJson("https://dolarapi.com/v1/dolares/bolsa"),
    ]);

    res.json({
      ok: true,
      dolar: {
        oficial: normalize(oficial),
        blue: normalize(blue),
        mep: normalize(mep),
      },
      ganado: {
        fuente: "mock",
        unidad: "USD/kg",
        precioUsdKg: 2.55,
        fecha: new Date().toISOString(),
      },
    });
  } catch (err) {
    res.status(502).json({
      ok: false,
      error: "No se pudieron obtener precios",
    });
  }
};
