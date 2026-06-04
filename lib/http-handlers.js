"use strict";

const { getDolares, DOLAR_FALLBACK, getGanado, getGanadoMock, getRosgan } = require("./cattle-api");

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

async function ganadoHandler(req, res) {
  res.json(await getGanado());
}

async function preciosHandler(req, res) {
  try {
    const dolar = await getDolares();
    const ganado = await getGanado(dolar);
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
