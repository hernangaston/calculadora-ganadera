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

export async function getPrecios() {
  return await fetchJSON("/api/precios");
}

export async function getDolar() {
  return await fetchJSON("/api/dolar");
}

