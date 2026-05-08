import { getPrecios } from "./api.js";
import { calcularResultado } from "./core/feedlot.js";
import { formatoAR } from "./calculator.js";
import { wireManualOverride, setLoading, setDolarUI } from "./ui.js";

// ── State ─────────────────────────────────────────────────────────────────────
const state = {
  preciosCache: null,
  inputs: {
    animales: 0,
    pesoCompra: 0,
    adpv: 0,
    recria: 0,
    corral: 0,
    precioCompra: 0,
    precioVenta: 0,
    distancia: 0,
  },
};

let chartMargen = null;

// ── DOM helpers ───────────────────────────────────────────────────────────────
function $(id) {
  return document.getElementById(id);
}

function getRadioValue(name) {
  return document.querySelector(`input[name="${name}"]:checked`)?.value ?? null;
}

// ── Lee el DOM y actualiza state.inputs ───────────────────────────────────────
function leerInputs(overrides) {
  state.inputs = {
    animales: Number($("animales").value),
    pesoCompra: Number($("pesoCompra").value),
    recria: Number($("recria").value),
    corral: Number($("corral").value),
    distancia: Number($("distancia").value),
    adpv: overrides.adpv.getValue(),
    precioCompra: overrides.precioCompra.getValue(),
    precioVenta: overrides.precioVenta.getValue(),
  };
}

// ── Helpers de mercado ────────────────────────────────────────────────────────
function getDolarVentaFromMode(mode, manualValue) {
  if (mode === "manual") return Number(manualValue) || 0;
  const venta = state.preciosCache?.dolar?.[mode]?.venta;
  return typeof venta === "number" ? venta : 0;
}

function formatFecha(value) {
  if (!value) return "-";
  try {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? "-" : d.toLocaleString("es-AR");
  } catch {
    return "-";
  }
}

// ── Render: valores visibles de sliders ───────────────────────────────────────
function renderValoresVisibles() {
  $("animalesValor").textContent = formatoAR(state.inputs.animales);
  $("pesoCompraValor").textContent = formatoAR(state.inputs.pesoCompra);
  $("precioCompraValor").textContent = formatoAR(state.inputs.precioCompra);
  $("adpvValor").textContent = formatoAR(state.inputs.adpv, 2);
  $("recriaValor").textContent = formatoAR(state.inputs.recria);
  $("corralValor").textContent = formatoAR(state.inputs.corral);
  $("precioVentaValor").textContent = formatoAR(state.inputs.precioVenta);
  $("distanciaValor").textContent = formatoAR(state.inputs.distancia);
}

// ── Render: warning de días totales ──────────────────────────────────────────
function renderDiasWarning() {
  const diasTotales = state.inputs.recria + state.inputs.corral;
  const diasWarning = $("diasWarning");
  if (!diasWarning) return;

  if (diasTotales > 450) {
    diasWarning.innerHTML =
      `<strong>Atención:</strong> estás simulando <strong>${formatoAR(diasTotales)}</strong> días totales. ` +
      `Revisá si es realista para tu planteo (y si el ADPV se sostiene tanto tiempo).`;
  } else if (diasTotales > 365) {
    diasWarning.innerHTML =
      `<strong>Ojo:</strong> <strong>${formatoAR(diasTotales)}</strong> días totales suele ser un ciclo largo.`;
  } else {
    diasWarning.textContent = "";
  }
}

// ── Render: resultados del cálculo ────────────────────────────────────────────
function renderResultados(res, ui) {
  ui.pesoFinal.textContent = formatoAR(res.pesoFinal, 1);
  ui.kgProducidos.textContent = formatoAR(res.kgProducidos, 1);
  ui.costoTotal.textContent = formatoAR(res.costoTotal);
  ui.margenCabeza.textContent = formatoAR(res.margenCabeza);
  ui.margenTotal.textContent = formatoAR(res.margen);
}

// ── Render: flete ─────────────────────────────────────────────────────────────
function renderFlete(flete, ui) {
  ui.camiones.textContent = flete.descripcion || "0";
  ui.costoFlete.textContent = formatoAR(flete.costoFlete);
  ui.seguroFlete.textContent = formatoAR(flete.seguroFlete);
}

// ── Render: estado de rentabilidad ────────────────────────────────────────────
function renderRentabilidad(margenCabeza, ui) {
  if (margenCabeza > 0) {
    ui.estadoRentabilidad.textContent = `✔ Rentable: +${formatoAR(margenCabeza)} por cabeza`;
    ui.estadoRentabilidad.style.color = "green";
  } else {
    ui.estadoRentabilidad.textContent = `❌ No rentable: ${formatoAR(margenCabeza)} por cabeza`;
    ui.estadoRentabilidad.style.color = "red";
  }
}

// ── Render: panel de mercado ──────────────────────────────────────────────────
function renderMarket(ui) {
  const dolarMode = getRadioValue("dolar_mode") || "blue";
  const manualDolar = Number(ui.dolarManual.value) || 0;
  const dolarVenta = getDolarVentaFromMode(dolarMode, manualDolar);

  ui.dolarManual.disabled = dolarMode !== "manual";
  setDolarUI({ dolarVenta, mode: dolarMode, ui });

  const usdKg = state.preciosCache?.ganado?.precioUsdKg;
  const ref = typeof usdKg === "number" ? usdKg * dolarVenta : null;

  if (ui.apiDolarVenta) ui.apiDolarVenta.textContent = dolarVenta > 0 ? formatoAR(dolarVenta) : "-";
  if (ui.apiDolarModo) ui.apiDolarModo.textContent = dolarMode.toUpperCase();
  if (ui.apiFuenteDolar) ui.apiFuenteDolar.textContent = "DolarAPI";
  if (ui.apiFechaDolar) {
    ui.apiFechaDolar.textContent = formatFecha(state.preciosCache?.dolar?.[dolarMode]?.fechaActualizacion || null);
  }
  if (ui.apiGanadoUsdKg) ui.apiGanadoUsdKg.textContent = typeof usdKg === "number" ? usdKg.toFixed(2) : "-";
  if (ui.apiFuenteGanado) {
    const fuente = state.preciosCache?.ganado?.fuente || "desconocida";
    ui.apiFuenteGanado.textContent = fuente === "mock" ? "Mock (ROSGAN/MAG pendiente)" : fuente;
  }
  if (ui.apiFechaGanado) ui.apiFechaGanado.textContent = formatFecha(state.preciosCache?.ganado?.fecha || null);
  if (ui.apiPrecioMercadoArs) {
    ui.apiPrecioMercadoArs.textContent = (typeof ref === "number" && ref > 0) ? `$${formatoAR(ref)}` : "-";
  }
  if (ui.apiUltimaActualizacion) {
    const f1 = new Date(state.preciosCache?.dolar?.[dolarMode]?.fechaActualizacion || 0).getTime() || 0;
    const f2 = new Date(state.preciosCache?.ganado?.fecha || 0).getTime() || 0;
    const maxTs = Math.max(f1, f2);
    ui.apiUltimaActualizacion.textContent = maxTs ? new Date(maxTs).toLocaleString("es-AR") : "-";
  }

  ui.precioCompraHint.textContent =
    (typeof ref === "number" && ref > 0)
      ? `Referencia mercado: ${usdKg.toFixed(2)} USD/kg × dólar ${dolarMode.toUpperCase()} = $${formatoAR(ref)}/kg`
      : "Referencia mercado no disponible";
}

// ── Render: gráfico de curva de margen ────────────────────────────────────────
const precioActualPlugin = {
  id: "precioActualPlugin",
  afterDraw(chart, _args, pluginOptions) {
    const xValue = pluginOptions?.xValue;
    if (xValue === null || xValue === undefined) return;

    const xScale = chart.scales?.x;
    const yScale = chart.scales?.y;
    if (!xScale || !yScale) return;

    const x = xScale.getPixelForValue(xValue);
    if (!Number.isFinite(x)) return;

    const { ctx, chartArea } = chart;
    if (!chartArea) return;

    ctx.save();
    ctx.beginPath();
    ctx.strokeStyle = "#6D4C41";
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.moveTo(x, chartArea.top);
    ctx.lineTo(x, chartArea.bottom);
    ctx.stroke();
    ctx.setLineDash([]);

    const label = "Precio actual";
    const padding = 6;
    ctx.font = "12px system-ui, -apple-system, Segoe UI, sans-serif";
    const textWidth = ctx.measureText(label).width;
    const boxWidth = textWidth + padding * 2;
    const boxHeight = 18;

    const xClamped = Math.min(
      chartArea.right - boxWidth - 2,
      Math.max(chartArea.left + 2, x + 6)
    );
    const yBox = chartArea.top + 6;

    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.fillRect(xClamped, yBox, boxWidth, boxHeight);
    ctx.fillStyle = "#6D4C41";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(label, xClamped + padding, yBox + 3);
    ctx.restore();
  },
};

function renderCurvaMargen(ui) {
  const { precioCompra } = state.inputs;
  const min = precioCompra * 0.7;
  const max = precioCompra * 1.3;

  const precios = [];
  const margenes = [];
  let mejorPrecio = 0;
  let menorDiferencia = Infinity;

  for (let precio = min; precio <= max; precio += 50) {
    const res = calcularResultado({ ...state.inputs, precioCompra: precio });
    precios.push(precio);
    margenes.push(res.margen);

    if (Math.abs(res.margen) < menorDiferencia) {
      menorDiferencia = Math.abs(res.margen);
      mejorPrecio = precio;
    }
  }

  ui.precioEquilibrio.textContent = formatoAR(mejorPrecio);

  const ctx = $("graficoMargen").getContext("2d");

  if (chartMargen) {
    chartMargen.data.labels = precios;
    chartMargen.data.datasets[0].data = margenes;
    chartMargen.options.plugins.precioActualPlugin.xValue = precioCompra;
    chartMargen.update();
    return;
  }

  chartMargen = new Chart(ctx, {
    plugins: [precioActualPlugin],
    type: "line",
    data: {
      labels: precios,
      datasets: [
        {
          label: "Margen ($)",
          data: margenes,
          tension: 0.2,
          borderColor: "#2E7D32",
          pointRadius: 0,
        },
        {
          label: "Equilibrio (margen = 0)",
          data: precios.map(() => 0),
          borderColor: "#888",
          borderDash: [6, 6],
          pointRadius: 0,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: true },
        precioActualPlugin: { xValue: precioCompra },
      },
      scales: {
        x: { title: { display: true, text: "Precio compra ($/kg)" } },
        y: { title: { display: true, text: "Margen ($)" } },
      },
    },
  });
}

// ── Ciclo central de actualización ────────────────────────────────────────────
function actualizar(ui, overrides) {
  leerInputs(overrides);        // DOM → state.inputs
  renderValoresVisibles();       // muestra valores de sliders
  renderDiasWarning();           // aviso días totales

  if (state.preciosCache) renderMarket(ui);

  const res = calcularResultado(state.inputs);
  renderResultados(res, ui);
  renderFlete(res.flete, ui);
  renderRentabilidad(res.margenCabeza, ui);
  renderCurvaMargen(ui);
}

// ── Carga de mercado ──────────────────────────────────────────────────────────
async function loadMarket(ui) {
  setLoading(ui.marketStatus, true, "Cargando datos de mercado…");
  try {
    const resp = await getPrecios();
    if (!resp?.ok) throw new Error("Respuesta inválida");
    state.preciosCache = resp;
    setLoading(ui.marketStatus, false, "");
    renderMarket(ui);
  } catch {
    setLoading(ui.marketStatus, true, "No se pudo cargar mercado. Usando valores actuales.");
  }
}

// ── Init ──────────────────────────────────────────────────────────────────────
function buildUIRefs() {
  return {
    pesoFinal: $("pesoFinal"),
    kgProducidos: $("kgProducidos"),
    costoTotal: $("costoTotal"),
    margenCabeza: $("margenCabeza"),
    margenTotal: $("margenTotal"),
    camiones: $("camiones"),
    costoFlete: $("costoFlete"),
    seguroFlete: $("seguroFlete"),
    estadoRentabilidad: $("estadoRentabilidad"),
    precioEquilibrio: $("precioEquilibrio"),
    dolarValor: $("dolarValor"),
    dolarModo: $("dolarModo"),
    dolarManual: $("dolarManual"),
    marketStatus: $("marketStatus"),
    precioCompraHint: $("precioCompraHint"),
    apiUltimaActualizacion: $("apiUltimaActualizacion"),
    apiDolarVenta: $("apiDolarVenta"),
    apiDolarModo: $("apiDolarModo"),
    apiFuenteDolar: $("apiFuenteDolar"),
    apiFechaDolar: $("apiFechaDolar"),
    apiGanadoUsdKg: $("apiGanadoUsdKg"),
    apiFuenteGanado: $("apiFuenteGanado"),
    apiFechaGanado: $("apiFechaGanado"),
    apiPrecioMercadoArs: $("apiPrecioMercadoArs"),
  };
}

function main() {
  const ui = buildUIRefs();

  const overrides = {
    precioCompra: wireManualOverride({ fieldId: "precioCompra", onChange: () => actualizar(ui, overrides) }),
    precioVenta: wireManualOverride({ fieldId: "precioVenta", onChange: () => actualizar(ui, overrides) }),
    adpv: wireManualOverride({ fieldId: "adpv", onChange: () => actualizar(ui, overrides) }),
  };

  document.querySelectorAll('input[type="range"]').forEach((el) =>
    el.addEventListener("input", () => actualizar(ui, overrides))
  );

  document.querySelectorAll('input[name="dolar_mode"]').forEach((el) =>
    el.addEventListener("change", () => actualizar(ui, overrides))
  );

  ui.dolarManual.addEventListener("input", () => actualizar(ui, overrides));

  $("btnResetSimulador")?.addEventListener("click", () => {
    $("simuladorForm")?.reset();
    if (chartMargen) {
      chartMargen.destroy();
      chartMargen = null;
    }
    actualizar(ui, overrides);
  });

  loadMarket(ui).finally(() => actualizar(ui, overrides));
}

document.addEventListener("DOMContentLoaded", main);
