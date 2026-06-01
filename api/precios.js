const { getDolares, getGanadoMock } = require("../lib/cattle-api");

module.exports = async function handler(req, res) {
  try {
    const [dolar, ganado] = await Promise.all([
      getDolares(),
      Promise.resolve(getGanadoMock()),
    ]);
    res.json({
      ok: true,
      dolar,
      ganado: {
        fuente:      ganado.fuente,
        unidad:      ganado.unidad,
        precioUsdKg: ganado.precioUsdKg,
        fecha:       ganado.fecha,
      },
    });
  } catch (err) {
    res.status(502).json({ ok: false, error: "No se pudieron obtener precios" });
  }
};
