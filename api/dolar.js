async function fetchJson(url) {
  const res = await fetch(url, { headers: { accept: "application/json" } });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const err = new Error(`HTTP ${res.status} al pedir ${url}`);
    err.status = res.status;
    err.body = text;
    throw err;
  }
  return res.json();
}

function normalize(p) {
  return {
    compra: typeof p?.compra === "number" ? p.compra : null,
    venta: typeof p?.venta === "number" ? p.venta : null,
    fechaActualizacion: p?.fechaActualizacion || p?.fecha || null,
    fuente: p?.casa || p?.nombre || null,
  };
}

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
    });
  } catch (err) {
    res.status(502).json({
      ok: false,
      error: "No se pudo obtener el dólar desde la API",
      details: { status: err.status || null },
      fallback: {
        oficial: { compra: null, venta: 0, fechaActualizacion: null, fuente: "fallback" },
        blue: { compra: null, venta: 0, fechaActualizacion: null, fuente: "fallback" },
        mep: { compra: null, venta: 0, fechaActualizacion: null, fuente: "fallback" },
      },
    });
  }
};
