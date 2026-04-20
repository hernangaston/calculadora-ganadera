import { getPrecios } from "./api.js";
import { compute, formatoAR } from "./calculator.js";
import { wireManualOverride, setLoading, setDolarUI } from "./ui.js";

let chartMargen = null;
let preciosCache = null;

const precioActualPlugin = {
  id: "precioActualPlugin",
  afterDraw(chart, args, pluginOptions) {
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

function $(id) {
  return document.getElementById(id);
}

function getRadioValue(name) {
  return document.querySelector(`input[name="${name}"]:checked`)?.value ?? null;
}

function clampNumber(v, min, max) {
  const n = Number(v);
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

function getDolarVentaFromMode(precios, mode, manualValue) {
  if (mode === "manual") return Number(manualValue) || 0;
  const venta = precios?.dolar?.[mode]?.venta;
  return typeof venta === "number" ? venta : 0;
}

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

    // mercado
    dolarValor: $("dolarValor"),
    dolarModo: $("dolarModo"),
    dolarManual: $("dolarManual"),
    marketStatus: $("marketStatus"),
    precioCompraHint: $("precioCompraHint"),

    // panel central (API)
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

function formatFecha(value) {
  if (!value) return "-";
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "-";
    return d.toLocaleString("es-AR");
  } catch {
    return "-";
  }
}

function getInputs(overrides) {
  const animales = Number($("animales").value);
  const pesoCompra = Number($("pesoCompra").value);
  const recria = Number($("recria").value);
  const corral = Number($("corral").value);
  const distancia = Number($("distancia").value);

  const adpv = overrides.adpv.getValue();
  const precioVenta = overrides.precioVenta.getValue();
  const precioCompra = overrides.precioCompra.getValue();

  return { animales, pesoCompra, adpv, recria, corral, precioCompra, precioVenta, distancia };
}

function setOutputs(ui, values) {
  ui.pesoFinal.textContent = formatoAR(values.pesoFinal, 1);
  ui.kgProducidos.textContent = formatoAR(values.kgProducidos, 1);
  ui.costoTotal.textContent = formatoAR(values.costoTotal);
  ui.margenCabeza.textContent = formatoAR(values.margenCabeza);
  ui.margenTotal.textContent = formatoAR(values.margen);
}

function setRentabilidad(ui, margenCabeza) {
  if (margenCabeza > 0) {
    ui.estadoRentabilidad.textContent = `✔ Rentable: +${formatoAR(margenCabeza)} por cabeza`;
    ui.estadoRentabilidad.style.color = "green";
  } else {
    ui.estadoRentabilidad.textContent = `❌ No rentable: ${formatoAR(margenCabeza)} por cabeza`;
    ui.estadoRentabilidad.style.color = "red";
  }
}

function calcularMargen(precioCompraSimulado, baseInputs, ui) {
  const { animales, pesoCompra, adpv, recria, corral, precioVenta, distancia } = baseInputs;
  const res = compute(
    {
      animales,
      pesoCompra,
      adpv,
      recria,
      corral,
      precioCompra: precioCompraSimulado,
      precioVenta,
      distancia,
    },
    ui
  );
  return res.margen;
}

function generarCurvaMargen(precioActual, baseInputs, ui) {
  const precios = [];
  const margenes = [];

  const min = precioActual * 0.7;
  const max = precioActual * 1.3;

  let mejorPrecio = 0;
  let menorDiferencia = Infinity;

  for (let precio = min; precio <= max; precio += 50) {
    const margen = calcularMargen(precio, baseInputs, ui);
    precios.push(precio);
    margenes.push(margen);

    const diferencia = Math.abs(margen);
    if (diferencia < menorDiferencia) {
      menorDiferencia = diferencia;
      mejorPrecio = precio;
    }
  }

  ui.precioEquilibrio.textContent = formatoAR(mejorPrecio);
  return { precios, margenes };
}

function actualizarGraficoMargen(ui, precioActual, baseInputs) {
  const { precios, margenes } = generarCurvaMargen(precioActual, baseInputs, ui);
  const ctx = $("graficoMargen").getContext("2d");

  if (chartMargen) {
    chartMargen.data.labels = precios;
    chartMargen.data.datasets[0].data = margenes;
    chartMargen.options.plugins.precioActualPlugin.xValue = precioActual;
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
        precioActualPlugin: { xValue: precioActual },
      },
      scales: {
        x: { title: { display: true, text: "Precio compra ($/kg)" } },
        y: { title: { display: true, text: "Margen ($)" } },
      },
    },
  });
}

async function loadMarket(ui, overrides) {
  setLoading(ui.marketStatus, true, "Cargando datos de mercado…");
  try {
    const resp = await getPrecios();
    if (!resp?.ok) throw new Error("Respuesta inválida");
    preciosCache = resp;
    setLoading(ui.marketStatus, false, "");

    // primer render
    applyMarketToUI(ui, overrides);
  } catch (e) {
    setLoading(ui.marketStatus, true, "No se pudo cargar mercado. Usando valores actuales.");
  }
}

function applyMarketToUI(ui, overrides) {
  const dolarMode = getRadioValue("dolar_mode") || "blue";
  const manualDolar = Number(ui.dolarManual.value) || 0;
  const dolarVenta = getDolarVentaFromMode(preciosCache, dolarMode, manualDolar);

  // UI dólar
  ui.dolarManual.disabled = dolarMode !== "manual";
  setDolarUI({ dolarVenta, mode: dolarMode, ui });

  // Referencia mercado (informativa) = USD/kg (mock) * dólar seleccionado
  const usdKg = preciosCache?.ganado?.precioUsdKg;
  const ref = typeof usdKg === "number" ? usdKg * dolarVenta : null;

  // Panel central: valores de API (lo más visible)
  if (ui.apiDolarVenta) ui.apiDolarVenta.textContent = typeof dolarVenta === "number" && dolarVenta > 0 ? formatoAR(dolarVenta) : "-";
  if (ui.apiDolarModo) ui.apiDolarModo.textContent = dolarMode.toUpperCase();
  if (ui.apiFuenteDolar) ui.apiFuenteDolar.textContent = "DolarAPI";
  if (ui.apiFechaDolar) {
    const fecha = preciosCache?.dolar?.[dolarMode]?.fechaActualizacion || null;
    ui.apiFechaDolar.textContent = formatFecha(fecha);
  }

  if (ui.apiGanadoUsdKg) ui.apiGanadoUsdKg.textContent = typeof usdKg === "number" ? usdKg.toFixed(2) : "-";
  if (ui.apiFuenteGanado) {
    const fuente = preciosCache?.ganado?.fuente || "desconocida";
    ui.apiFuenteGanado.textContent = fuente === "mock" ? "Mock (ROSGAN/MAG pendiente)" : fuente;
  }
  if (ui.apiFechaGanado) ui.apiFechaGanado.textContent = formatFecha(preciosCache?.ganado?.fecha || null);

  if (ui.apiPrecioMercadoArs) {
    ui.apiPrecioMercadoArs.textContent = (typeof ref === "number" && ref > 0) ? `$${formatoAR(ref)}` : "-";
  }

  // Última actualización (resaltada): max(dólar, ganado)
  if (ui.apiUltimaActualizacion) {
    const f1 = new Date(preciosCache?.dolar?.[dolarMode]?.fechaActualizacion || 0).getTime() || 0;
    const f2 = new Date(preciosCache?.ganado?.fecha || 0).getTime() || 0;
    const maxTs = Math.max(f1, f2);
    ui.apiUltimaActualizacion.textContent = maxTs ? new Date(maxTs).toLocaleString("es-AR") : "-";
  }

  ui.precioCompraHint.textContent =
    (typeof ref === "number" && ref > 0)
      ? `Referencia mercado: ${usdKg.toFixed(2)} USD/kg × dólar ${dolarMode.toUpperCase()} = $${formatoAR(ref)}/kg`
      : "Referencia mercado no disponible";
}

function actualizarValoresVisibles(overrides) {
  // outputs existentes
  $("animalesValor").textContent = formatoAR(Number($("animales").value));
  $("pesoCompraValor").textContent = formatoAR(Number($("pesoCompra").value));
  $("precioCompraValor").textContent = formatoAR(overrides.precioCompra.getValue());
  $("adpvValor").textContent = formatoAR(overrides.adpv.getValue(), 2);
  $("recriaValor").textContent = formatoAR(Number($("recria").value));
  $("corralValor").textContent = formatoAR(Number($("corral").value));
  $("precioVentaValor").textContent = formatoAR(overrides.precioVenta.getValue());
  $("distanciaValor").textContent = formatoAR(Number($("distancia").value));
}

function actualizarDiasWarning() {
  const diasTotales = Number($("recria").value) + Number($("corral").value);
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

function main() {
  const ui = buildUIRefs();

  const overrides = {
    precioCompra: wireManualOverride({ fieldId: "precioCompra", onChange: () => render(ui, overrides) }),
    precioVenta: wireManualOverride({ fieldId: "precioVenta", onChange: () => render(ui, overrides) }),
    adpv: wireManualOverride({ fieldId: "adpv", onChange: () => render(ui, overrides) }),
  };

  // sliders base
  document.querySelectorAll('input[type="range"]').forEach((el) =>
    el.addEventListener("input", () => render(ui, overrides))
  );

  // radios dólar + precio compra mode
  document.querySelectorAll('input[name="dolar_mode"]').forEach((el) =>
    el.addEventListener("change", () => {
      applyMarketToUI(ui, overrides);
      render(ui, overrides);
    })
  );
  ui.dolarManual.addEventListener("input", () => {
    applyMarketToUI(ui, overrides);
    render(ui, overrides);
  });

  // reset: volvemos al estado del form, destruimos chart y re-aplicamos mercado
  $("btnResetSimulador")?.addEventListener("click", () => {
    $("simuladorForm")?.reset();
    if (chartMargen) {
      chartMargen.destroy();
      chartMargen = null;
    }
    applyMarketToUI(ui, overrides);
    render(ui, overrides);
  });

  loadMarket(ui, overrides).finally(() => render(ui, overrides));
}

function render(ui, overrides) {
  actualizarValoresVisibles(overrides);
  actualizarDiasWarning();

  if (preciosCache) {
    applyMarketToUI(ui, overrides);
  }

  const inputs = getInputs(overrides);

  const res = compute(inputs, ui);
  setOutputs(ui, res);
  setRentabilidad(ui, res.margenCabeza);

  actualizarGraficoMargen(ui, inputs.precioCompra, inputs);
}

document.addEventListener("DOMContentLoaded", main);

