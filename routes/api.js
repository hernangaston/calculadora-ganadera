// API routes: /dolar, /ganado, /precios, /rosgan
// La lógica de negocio vive en lib/cattle-api.js (compartida con los handlers de Vercel).
const express = require("express");
const router  = express.Router();

const {
  getDolares,
  DOLAR_FALLBACK,
  getGanadoMock,
  getRosgan,
} = require("../lib/cattle-api");

router.get("/dolar", async (req, res) => {
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
});

router.get("/ganado", (req, res) => {
  res.json(getGanadoMock());
});

router.get("/precios", async (req, res) => {
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
});

router.get("/rosgan", async (req, res) => {
  try {
    res.json(await getRosgan());
  } catch {
    res.status(502).json({ ok: false, error: "No se pudo obtener datos de ROSGAN" });
  }
});

module.exports = router;
