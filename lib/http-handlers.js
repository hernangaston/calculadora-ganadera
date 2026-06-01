"use strict";

const { getDolares, DOLAR_FALLBACK, getGanadoMock, getRosgan } = require("./cattle-api");

async function dolarHandler(req, res) {
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
}

function ganadoHandler(req, res) {
  res.json(getGanadoMock());
}

async function preciosHandler(req, res) {
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
}

async function rosganHandler(req, res) {
  try {
    res.json(await getRosgan());
  } catch {
    res.status(502).json({ ok: false, error: "No se pudo obtener datos de ROSGAN" });
  }
}

module.exports = { dolarHandler, ganadoHandler, preciosHandler, rosganHandler };
