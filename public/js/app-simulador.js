import { getPrecios, getRosgan } from "./api.js";
import { calcularResultado } from "./core/feedlot.js";
import { formatoAR } from "./calculator.js";
import { wireManualOverride, setLoading } from "./ui.js";

// ── State ─────────────────────────────────────────────────────────────────────
const state = {
  preciosCache: null,
  inputs: {
    animales: 0,
    pesoCompra: 0,
    adpvCampo: 0,
    adpvCorral: 0,
    recria: 0,
    corral: 0,
    costoCampo: 0,
    costoCorral: 0,
    precioCompra: 0,
    precioVenta: 0,
    distancia: 0,
    distanciaVenta: 0,
    comisionCompra: 0,
    comisionVenta: 0,
  },
};

let chartMargen = null;

// ── DOM helpers ───────────────────────────────────────────────────────────────
function $(id) {
  return document.getElementById(id);
}

// ── Lee el DOM y actualiza state.inputs ───────────────────────────────────────
function leerInputs(overrides) {
  state.inputs = {
    animales:       Number($("animales").value),
    pesoCompra:     Number($("pesoCompra").value),
    recria:         Number($("recria").value),
    corral:         Number($("corral").value),
    distancia:      Number($("distancia").value),
    distanciaVenta: Number($("distanciaVenta").value),
    adpvCampo:      overrides.adpvCampo.getValue(),
    adpvCorral:     overrides.adpvCorral.getValue(),
    costoCampo:     overrides.costoCampo.getValue(),
    costoCorral:    overrides.costoCorral.getValue(),
    precioCompra:   overrides.precioCompra.getValue(),
    precioVenta:    overrides.precioVenta.getValue(),
    comisionCompra: overrides.comisionCompra.getValue(),
    comisionVenta:  overrides.comisionVenta.getValue(),
  };
}

// ── Helpers de mercado ────────────────────────────────────────────────────────
function getDolarOficial() {
  const v = state.preciosCache?.dolar?.oficial?.venta;
  return typeof v === "number" && v > 0 ? v : 0;
}

function formatUSD(ars) {
  const d = getDolarOficial();
  if (!d) return "";
  const usd = ars / d;
  return `(USD ${usd.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`;
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
  $("animalesValor").textContent        = formatoAR(state.inputs.animales);
  $("pesoCompraValor").textContent      = formatoAR(state.inputs.pesoCompra);
  $("precioCompraValor").textContent    = formatoAR(state.inputs.precioCompra, 2);
  $("comisionCompraValor").textContent  = formatoAR(state.inputs.comisionCompra, 1);
  $("adpvCampoValor").textContent       = formatoAR(state.inputs.adpvCampo, 2);
  $("adpvCorralValor").textContent      = formatoAR(state.inputs.adpvCorral, 2);
  $("costoCampoValor").textContent      = formatoAR(state.inputs.costoCampo);
  $("costoCorralValor").textContent     = formatoAR(state.inputs.costoCorral);
  const usdCampo = $("costoCampoUsd");
  if (usdCampo) usdCampo.textContent   = formatUSD(state.inputs.costoCampo);
  const usdCorral = $("costoCorralUsd");
  if (usdCorral) usdCorral.textContent = formatUSD(state.inputs.costoCorral);
  $("recriaValor").textContent          = formatoAR(state.inputs.recria);
  $("corralValor").textContent          = formatoAR(state.inputs.corral);
  $("precioVentaValor").textContent     = formatoAR(state.inputs.precioVenta);
  $("comisionVentaValor").textContent   = formatoAR(state.inputs.comisionVenta, 1);
  $("distanciaValor").textContent       = formatoAR(state.inputs.distancia);
  $("distanciaVentaValor").textContent  = formatoAR(state.inputs.distanciaVenta);
}

// ── Render: warning de días totales ──────────────────────────────────────────
function renderDiasWarning() {
  const diasTotales = state.inputs.recria + state.inputs.corral;
  const diasWarning = $("diasWarning");
  if (!diasWarning) return;

  if (diasTotales > 450) {
    diasWarning.innerHTML =
      `<strong>Atención:</strong> estás simulando <strong>${formatoAR(diasTotales)}</strong> días totales. ` +
      `Revisá si es realista para tu planteo.`;
  } else if (diasTotales > 365) {
    diasWarning.innerHTML =
      `<strong>Ojo:</strong> <strong>${formatoAR(diasTotales)}</strong> días totales suele ser un ciclo largo.`;
  } else {
    diasWarning.textContent = "";
  }
}

// ── Render: resultados del cálculo ────────────────────────────────────────────
function renderResultados(res, ui) {
  ui.pesoDespuesRecria.textContent   = formatoAR(res.pesoDespuesRecria, 1);
  ui.pesoFinal.textContent           = formatoAR(res.pesoFinal, 1);
  ui.kgProducidos.textContent        = formatoAR(res.kgProducidos, 1);
  ui.costoProduccion.textContent     = formatoAR(res.costoProduccion);
  ui.comisionCompraTotal.textContent = formatoAR(res.comisionCompraTotal);
  ui.comisionVentaTotal.textContent  = formatoAR(res.comisionVentaTotal);
  ui.costoTotal.textContent          = formatoAR(res.costoTotal);
  ui.margenCabeza.textContent        = formatoAR(res.margenCabeza);
  ui.margenTotal.textContent         = formatoAR(res.margen);
  if (ui.margenCabezaUsd) ui.margenCabezaUsd.textContent = formatUSD(res.margenCabeza);
  if (ui.margenTotalUsd)  ui.margenTotalUsd.textContent  = formatUSD(res.margen);
}

// ── Render: flete ─────────────────────────────────────────────────────────────
function renderFlete(fleteCompra, fleteVenta, ui) {
  ui.camiones.textContent    = fleteCompra.descripcion || "0";
  ui.costoFlete.textContent  = formatoAR(fleteCompra.costoFlete);
  ui.seguroFlete.textContent = formatoAR(fleteCompra.seguroFlete);
  if (ui.camionesVenta)    ui.camionesVenta.textContent    = fleteVenta.descripcion || "0";
  if (ui.costoFleteVenta)  ui.costoFleteVenta.textContent  = formatoAR(fleteVenta.costoFlete);
  if (ui.seguroFleteVenta) ui.seguroFleteVenta.textContent = formatoAR(fleteVenta.seguroFlete);
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
  const blue    = state.preciosCache?.dolar?.blue;
  const oficial = state.preciosCache?.dolar?.oficial;
  const mep     = state.preciosCache?.dolar?.mep;

  if (ui.apiDolarBlue)         ui.apiDolarBlue.textContent         = blue?.venta    ? formatoAR(blue.venta)    : "-";
  if (ui.apiDolarOficial)      ui.apiDolarOficial.textContent      = oficial?.venta ? formatoAR(oficial.venta) : "-";
  if (ui.apiDolarMep)          ui.apiDolarMep.textContent          = mep?.venta     ? formatoAR(mep.venta)     : "-";
  if (ui.apiFechaDolarBlue)    ui.apiFechaDolarBlue.textContent    = formatFecha(blue?.fechaActualizacion);
  if (ui.apiFechaDolarOficial) ui.apiFechaDolarOficial.textContent = formatFecha(oficial?.fechaActualizacion);
  if (ui.apiFechaDolarMep)     ui.apiFechaDolarMep.textContent     = formatFecha(mep?.fechaActualizacion);

  if (ui.apiUltimaActualizacion) {
    const ts = Math.max(
      new Date(blue?.fechaActualizacion    || 0).getTime() || 0,
      new Date(oficial?.fechaActualizacion || 0).getTime() || 0,
      new Date(mep?.fechaActualizacion     || 0).getTime() || 0
    );
    ui.apiUltimaActualizacion.textContent = ts ? new Date(ts).toLocaleString("es-AR") : "-";
  }

  if (ui.precioCompraHint) ui.precioCompraHint.textContent = "";
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

    const label    = "Precio actual";
    const padding  = 6;
    ctx.font = "12px system-ui, -apple-system, Segoe UI, sans-serif";
    const textWidth = ctx.measureText(label).width;
    const boxWidth  = textWidth + padding * 2;
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

  const precios  = [];
  const margenes = [];
  let mejorPrecio     = 0;
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
  leerInputs(overrides);
  renderValoresVisibles();
  renderDiasWarning();

  if (state.preciosCache) renderMarket(ui);

  const res = calcularResultado(state.inputs);
  renderResultados(res, ui);
  renderFlete(res.fleteCompra, res.fleteVenta, ui);
  renderRentabilidad(res.margenCabeza, ui);
  renderCurvaMargen(ui);
}

// ── ROSGAN ────────────────────────────────────────────────────────────────────
const MESES_ES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

function precioStr(n) {
  return `$${formatoAR(n, 2)}`;
}

function renderTipo(tipo) {
  if (!tipo) return "";
  const cats = (tipo.categorias || []).filter((c) => c.precio > 0);
  return cats.map((cat) => {
    const razas = (cat.razas || []).filter((r) => r.precio > 0);
    const razasHTML = razas.length
      ? `<table class="rosgan-razas">${razas.map((r) =>
          `<tr>
            <td>${r.titulo}${r.observacion ? `<span class="rosgan-obs">${r.observacion}</span>` : ""}</td>
            <td>${precioStr(r.precio)}</td>
          </tr>`
        ).join("")}</table>`
      : "";
    return `<div class="rosgan-cat">
      <div class="rosgan-cat-header">
        <span>${cat.titulo}</span>
        <span class="rosgan-cat-price">${precioStr(cat.precio)}</span>
      </div>
      ${razasHTML}
    </div>`;
  }).join("");
}

function renderRosgan(data, ui, overrides) {
  const { mes, anio, piri, pirc, invernada, cria } = data;

  if (ui.rosganFecha) ui.rosganFecha.textContent = `${MESES_ES[mes - 1] ?? mes} ${anio}`;
  if (ui.rosganStatus) ui.rosganStatus.textContent = "";
  if (ui.rosganBody) ui.rosganBody.classList.remove("rosgan-hidden");
  if (ui.rosganPiri) ui.rosganPiri.textContent = precioStr(piri);

  if (ui.rosganCategorias) {
    const criaHTML = (cria && pirc > 0)
      ? `<div class="rosgan-total rosgan-total-cria">
          <span class="rosgan-total-label">Cría</span>
          <span class="rosgan-total-price rosgan-price-cria">${precioStr(pirc)}</span>
        </div>
        ${renderTipo(cria)}`
      : "";

    ui.rosganCategorias.innerHTML = renderTipo(invernada) + criaHTML;
  }

  // Auto-set precioCompra al PIRI
  if (piri > 0 && overrides?.precioCompra) {
    const slider = $("precioCompra");
    if (slider && piri > Number(slider.max)) {
      slider.max = String(Math.ceil(piri * 1.5 / 1000) * 1000);
    }
    overrides.precioCompra.setAutoValue(piri);
    const badge = $("precioCompraBadge");
    if (badge) badge.hidden = false;
  }

  // Auto-set precioVenta al precio Braford y Brangus de Novillos 1 a 2 años
  const novillos12 = invernada?.categorias?.find(c => c.titulo === "Novillos 1 a 2 años");
  const precioVentaRosgan = novillos12?.razas?.find(r => r.titulo === "Braford y Brangus")?.precio ?? 0;
  if (precioVentaRosgan > 0 && overrides?.precioVenta) {
    const slider = $("precioVenta");
    if (slider && precioVentaRosgan > Number(slider.max)) {
      slider.max = String(Math.ceil(precioVentaRosgan * 1.5 / 1000) * 1000);
    }
    overrides.precioVenta.setAutoValue(precioVentaRosgan);
    const badge = $("precioVentaBadge");
    if (badge) badge.hidden = false;
  }
}

async function loadRosgan(ui, overrides) {
  try {
    const data = await getRosgan();
    if (!data?.ok) throw new Error("Sin datos");
    renderRosgan(data, ui, overrides);
    actualizar(ui, overrides);
  } catch {
    if (ui.rosganStatus) ui.rosganStatus.textContent = "No se pudo cargar ROSGAN.";
  }
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
    pesoDespuesRecria:    $("pesoDespuesRecria"),
    pesoFinal:            $("pesoFinal"),
    kgProducidos:         $("kgProducidos"),
    costoProduccion:      $("costoProduccion"),
    comisionCompraTotal:  $("comisionCompraTotal"),
    comisionVentaTotal:   $("comisionVentaTotal"),
    costoTotal:           $("costoTotal"),
    margenCabeza:         $("margenCabeza"),
    margenTotal:          $("margenTotal"),
    margenCabezaUsd:      $("margenCabezaUsd"),
    margenTotalUsd:       $("margenTotalUsd"),
    camiones:             $("camiones"),
    costoFlete:           $("costoFlete"),
    seguroFlete:          $("seguroFlete"),
    camionesVenta:        $("camionesVenta"),
    costoFleteVenta:      $("costoFleteVenta"),
    seguroFleteVenta:     $("seguroFleteVenta"),
    estadoRentabilidad:   $("estadoRentabilidad"),
    precioEquilibrio:     $("precioEquilibrio"),
    precioCompraHint:        $("precioCompraHint"),
    apiUltimaActualizacion:  $("apiUltimaActualizacion"),
    apiDolarBlue:            $("apiDolarBlue"),
    apiDolarOficial:         $("apiDolarOficial"),
    apiDolarMep:             $("apiDolarMep"),
    apiFechaDolarBlue:       $("apiFechaDolarBlue"),
    apiFechaDolarOficial:    $("apiFechaDolarOficial"),
    apiFechaDolarMep:        $("apiFechaDolarMep"),
    rosganFecha:          $("rosganFecha"),
    rosganStatus:         $("rosganStatus"),
    rosganBody:           $("rosganBody"),
    rosganPiri:           $("rosganPiri"),
    rosganCategorias:     $("rosganCategorias"),
  };
}

function main() {
  const ui = buildUIRefs();

  const overrides = {
    precioCompra:   wireManualOverride({ fieldId: "precioCompra",   onChange: () => actualizar(ui, overrides) }),
    comisionCompra: wireManualOverride({ fieldId: "comisionCompra", onChange: () => actualizar(ui, overrides) }),
    adpvCampo:      wireManualOverride({ fieldId: "adpvCampo",      onChange: () => actualizar(ui, overrides) }),
    costoCampo:     wireManualOverride({ fieldId: "costoCampo",     onChange: () => actualizar(ui, overrides) }),
    adpvCorral:     wireManualOverride({ fieldId: "adpvCorral",     onChange: () => actualizar(ui, overrides) }),
    costoCorral:    wireManualOverride({ fieldId: "costoCorral",    onChange: () => actualizar(ui, overrides) }),
    precioVenta:    wireManualOverride({ fieldId: "precioVenta",    onChange: () => actualizar(ui, overrides) }),
    comisionVenta:  wireManualOverride({ fieldId: "comisionVenta",  onChange: () => actualizar(ui, overrides) }),
  };

  document.querySelectorAll('input[type="range"]').forEach((el) =>
    el.addEventListener("input", () => actualizar(ui, overrides))
  );

  $("btnResetSimulador")?.addEventListener("click", () => {
    $("simuladorForm")?.reset();
    if (chartMargen) {
      chartMargen.destroy();
      chartMargen = null;
    }
    actualizar(ui, overrides);
  });

  actualizar(ui, overrides);

  loadMarket(ui).finally(() => actualizar(ui, overrides));
  loadRosgan(ui, overrides);
}

document.addEventListener("DOMContentLoaded", main);
