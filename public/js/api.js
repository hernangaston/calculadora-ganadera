export async function fetchJSON(url, { timeoutMs = 6000 } = {}) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      headers: { accept: "application/json" },
      signal: controller.signal,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      const err = new Error(`HTTP ${res.status}`);
      err.status = res.status;
      err.body = text;
      throw err;
    }

    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

const DOLAR_API_BASE = "https://dolarapi.com/v1/dolares";

function normalizeDolar(p) {
  return {
    compra: typeof p?.compra === "number" ? p.compra : null,
    venta: typeof p?.venta === "number" ? p.venta : null,
    fechaActualizacion: p?.fechaActualizacion || p?.fecha || null,
    fuente: p?.casa || p?.nombre || null,
  };
}

async function fetchDolarDirecto() {
  const [oficial, blue, mep] = await Promise.all([
    fetchJSON(`${DOLAR_API_BASE}/oficial`),
    fetchJSON(`${DOLAR_API_BASE}/blue`),
    fetchJSON(`${DOLAR_API_BASE}/bolsa`),
  ]);
  return {
    oficial: normalizeDolar(oficial),
    blue: normalizeDolar(blue),
    mep: normalizeDolar(mep),
  };
}

export async function getPrecios() {
  try {
    return await fetchJSON("/api/precios");
  } catch {
    // Fallback para hosting estático (GitHub Pages): llama directo a dolarapi.com
    const dolar = await fetchDolarDirecto();
    return {
      ok: true,
      dolar,
      ganado: {
        fuente: "mock",
        unidad: "USD/kg",
        precioUsdKg: 2.55,
        fecha: new Date().toISOString(),
      },
    };
  }
}

export async function getDolar() {
  try {
    return await fetchJSON("/api/dolar");
  } catch {
    const dolar = await fetchDolarDirecto();
    return { ok: true, dolar };
  }
}

