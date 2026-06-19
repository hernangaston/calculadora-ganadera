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

const escenarios = [null, null, null]; // 0=A, 1=B, 2=C

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
    if (Number.isNaN(d.getTime())) return "-";
    const ahora = new Date();
    const esHoy = d.toDateString() === ahora.toDateString();
    if (esHoy) {
      return d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
    }
    return d.toLocaleDateString("es-AR", { day: "numeric", month: "numeric" });
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
  if (ui.costoCompra) ui.costoCompra.textContent = formatoAR(res.costoCompra);
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
  if (ui.jaulaDoble)       ui.jaulaDoble.textContent       = fleteCompra.jaulaDoble  ?? 0;
  if (ui.jaulaSimple)      ui.jaulaSimple.textContent      = fleteCompra.jaulaSimple ?? 0;
  if (ui.chasisCompra)     ui.chasisCompra.textContent     = fleteCompra.chasis      ?? 0;
  if (ui.costoFlete)  ui.costoFlete.textContent  = formatoAR(fleteCompra.costoFlete);
  if (ui.seguroFlete) ui.seguroFlete.textContent = formatoAR(fleteCompra.seguroFlete);

  if (ui.jaulaDobleVenta)  ui.jaulaDobleVenta.textContent  = fleteVenta.jaulaDoble  ?? 0;
  if (ui.jaulaSimpleVenta) ui.jaulaSimpleVenta.textContent = fleteVenta.jaulaSimple ?? 0;
  if (ui.chasisVenta)      ui.chasisVenta.textContent      = fleteVenta.chasis      ?? 0;
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
  const paso = Math.max((max - min) / 24, 1);

  const puntos = [];

  for (let precio = min; precio <= max; precio += paso) {
    const res = calcularResultado({ ...state.inputs, precioCompra: precio });
    puntos.push({ x: precio, y: res.margen });
  }

  // Interpolación lineal en el cruce de cero; argmin como fallback si no hay cruce
  let mejorPrecio = puntos.reduce((best, p) =>
    Math.abs(p.y) < Math.abs(best.y) ? p : best, puntos[0]).x;
  for (let i = 1; i < puntos.length; i++) {
    const p0 = puntos[i - 1], p1 = puntos[i];
    if ((p0.y >= 0) !== (p1.y >= 0)) {
      mejorPrecio = p0.x + (0 - p0.y) * (p1.x - p0.x) / (p1.y - p0.y);
      break;
    }
  }

  ui.precioEquilibrio.textContent = formatoAR(mejorPrecio);

  const ctx = $("graficoMargen").getContext("2d");

  if (chartMargen) {
    chartMargen.data.datasets[0].data = puntos;
    chartMargen.data.datasets[1].data = puntos.map(p => ({ x: p.x, y: 0 }));
    chartMargen.options.plugins.precioActualPlugin.xValue = precioCompra;
    chartMargen.update("none"); // sin animación: se llama en cada movimiento de slider
    return;
  }

  chartMargen = new Chart(ctx, {
    plugins: [precioActualPlugin],
    type: "line",
    data: {
      datasets: [
        {
          label: "Margen ($)",
          data: puntos,
          tension: 0.2,
          borderColor: "#2E7D32",
          pointRadius: 0,
        },
        {
          label: "Equilibrio (margen = 0)",
          data: puntos.map(p => ({ x: p.x, y: 0 })),
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
        x: {
          type: "linear",
          ticks: {
            maxTicksLimit: 8,
            stepSize: 1000,
            callback: (val) => `$${(val / 1000).toFixed(0)}k`,
          },
          title: { display: true, text: "Precio compra ($/kg)" },
        },
        y: {
          ticks: {
            callback: (val) => val >= 1000000
              ? `$${(val / 1000000).toFixed(1)}M`
              : val >= 1000 ? `$${(val / 1000).toFixed(0)}k` : `$${val}`,
          },
          title: { display: true, text: "Margen ($)" },
        },
      },
    },
  });
}

// ── Comparador de escenarios ──────────────────────────────────────────────────
function guardarEscenario(idx) {
  const res = calcularResultado(state.inputs);
  escenarios[idx] = {
    label: ["A", "B", "C"][idx],
    inputs: { ...state.inputs },
    resultados: {
      margenCabeza:        res.margenCabeza,
      margen:              res.margen,
      costoTotal:          res.costoTotal,
      costoProduccion:     res.costoProduccion,
      comisionCompraTotal: res.comisionCompraTotal,
      comisionVentaTotal:  res.comisionVentaTotal,
      pesoFinal:           res.pesoFinal,
      kgProducidos:        res.kgProducidos,
      diasTotales:         res.diasTotales,
    },
  };
  renderComparador();
}

function limpiarEscenario(idx) {
  escenarios[idx] = null;
  renderComparador();
}

function formatoCompacto(n) {
  if (window.innerWidth > 700) return `$${formatoAR(n)}`;
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000)    return `$${(n / 1_000).toFixed(0)}k`;
  return `$${formatoAR(n)}`;
}

function renderComparador() {
  const vacio = document.getElementById("comparadorVacio");
  const body  = document.getElementById("comparadorBody");
  if (!vacio || !body) return;

  const hayDatos = escenarios.some(e => e !== null);
  vacio.style.display = hayDatos ? "none" : "";

  const btnPdf = document.getElementById("btnExportarPdf");
  if (btnPdf) btnPdf.style.display = escenarios.every(e => e !== null) ? "" : "none";

  if (!hayDatos) {
    body.innerHTML = "";
    const dif = document.getElementById("comparadorDiferencias");
    if (dif) dif.innerHTML = "";
    return;
  }

  const filas = [
    { label: "Margen/cabeza",   key: "margenCabeza",        fmt: v => formatoCompacto(v),   mayor: true },
    { label: "Margen total",    key: "margen",              fmt: v => formatoCompacto(v),   mayor: true },
    { label: "Costo total",     key: "costoTotal",          fmt: v => formatoCompacto(v),   mayor: false },
    { label: "Costo producción",key: "costoProduccion",     fmt: v => formatoCompacto(v),   mayor: false },
    { label: "Com. compra",     key: "comisionCompraTotal", fmt: v => formatoCompacto(v),   mayor: false },
    { label: "Com. venta",      key: "comisionVentaTotal",  fmt: v => formatoCompacto(v),   mayor: false },
    { label: "Peso final (kg)", key: "pesoFinal",           fmt: v => formatoAR(v, 1),      mayor: true },
    { label: "Kg producidos",   key: "kgProducidos",        fmt: v => formatoAR(v, 1),      mayor: true },
    { label: "Días totales",    key: "diasTotales",         fmt: v => formatoAR(v),         mayor: false },
  ];

  const headerCells = escenarios.map((e, i) => {
    if (!e) return `<th>${["A","B","C"][i]}</th>`;
    return `<th>${e.label} <button class="btn-limpiar-escenario" data-idx="${i}" title="Eliminar escenario ${e.label}">✕</button></th>`;
  }).join("");

  const filaRows = filas.map(({ label, key, fmt, mayor }) => {
    const vals = escenarios.map(e => e ? e.resultados[key] : null);
    const activos = vals.filter(v => v !== null);
    const best = activos.length ? (mayor ? Math.max(...activos) : Math.min(...activos)) : null;
    const worst = activos.length > 1 ? (mayor ? Math.min(...activos) : Math.max(...activos)) : null;

    const celdas = vals.map(v => {
      if (v === null) return `<td>—</td>`;
      let cls = "";
      if (best !== worst) {
        if (v === best)  cls = "mejor";
        else if (v === worst) cls = "peor";
      }
      return `<td class="${cls}">${fmt(v)}</td>`;
    }).join("");

    return `<tr><td>${label}</td>${celdas}</tr>`;
  }).join("");

  body.innerHTML = `
    <table class="comparador-tabla">
      <thead><tr><th>Variable</th>${headerCells}</tr></thead>
      <tbody>${filaRows}</tbody>
    </table>`;

  body.querySelectorAll(".btn-limpiar-escenario").forEach(btn => {
    btn.addEventListener("click", () => limpiarEscenario(Number(btn.dataset.idx)));
  });

  renderDiferencias();
}

function renderDiferencias() {
  const cont = document.getElementById("comparadorDiferencias");
  if (!cont) return;

  const activos = escenarios.filter(e => e !== null);
  if (activos.length < 2) { cont.innerHTML = ""; return; }

  const lineas = [];

  // Mejor margen por cabeza
  const byMCab = [...activos].sort((a, b) => b.resultados.margenCabeza - a.resultados.margenCabeza);
  const mejorCab = byMCab[0], peorCab = byMCab[byMCab.length - 1];
  if (mejorCab.label !== peorCab.label) {
    const diff = mejorCab.resultados.margenCabeza - peorCab.resultados.margenCabeza;
    lineas.push(`<strong>${mejorCab.label}</strong> lidera en margen por cabeza ($${formatoAR(mejorCab.resultados.margenCabeza)}), con $${formatoAR(diff)} de ventaja sobre ${peorCab.label}.`);
  }

  // Mejor margen total (solo si difiere del mejor por cabeza)
  const byMTotal = [...activos].sort((a, b) => b.resultados.margen - a.resultados.margen);
  const mejorTotal = byMTotal[0], peorTotal = byMTotal[byMTotal.length - 1];
  if (mejorTotal.label !== peorTotal.label && mejorTotal.label !== mejorCab.label) {
    const diff = mejorTotal.resultados.margen - peorTotal.resultados.margen;
    lineas.push(`En margen total, <strong>${mejorTotal.label}</strong> es el mejor ($${formatoAR(mejorTotal.resultados.margen)} vs. $${formatoAR(peorTotal.resultados.margen)}).`);
  }

  // Diferencias de inputs clave
  const inputDiffs = [];
  const diasVals = activos.map(e => e.resultados.diasTotales);
  const diasMin = Math.min(...diasVals), diasMax = Math.max(...diasVals);
  if (diasMax > diasMin) inputDiffs.push(`días totales: ${formatoAR(diasMin)}–${formatoAR(diasMax)}`);

  const pcVals = activos.map(e => e.inputs.precioCompra);
  const pcMin = Math.min(...pcVals), pcMax = Math.max(...pcVals);
  if (pcMax > pcMin) inputDiffs.push(`precio compra: $${formatoAR(pcMin)}–$${formatoAR(pcMax)}/kg`);

  const pvVals = activos.map(e => e.inputs.precioVenta);
  const pvMin = Math.min(...pvVals), pvMax = Math.max(...pvVals);
  if (pvMax > pvMin) inputDiffs.push(`precio venta: $${formatoAR(pvMin)}–$${formatoAR(pvMax)}/kg`);

  if (inputDiffs.length) {
    lineas.push(`Diferencias entre escenarios: ${inputDiffs.join("; ")}.`);
  }

  if (!lineas.length) { cont.innerHTML = ""; return; }

  cont.innerHTML = `<div class="comparador-diferencias-inner">${lineas.map(l => `<p>${l}</p>`).join("")}</div>`;
}

// ── Ciclo central de actualización ────────────────────────────────────────────
function actualizar(ui, overrides) {
  leerInputs(overrides);
  renderValoresVisibles();
  renderDiasWarning();

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

// Los títulos/observaciones vienen de una API externa: escapar antes de innerHTML
function escapeHTML(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );
}

function renderTipo(tipo) {
  if (!tipo) return "";
  const cats = (tipo.categorias || []).filter((c) => c.precio > 0);
  return cats.map((cat) => {
    const razas = (cat.razas || []).filter((r) => r.precio > 0);
    const razasHTML = razas.length
      ? `<table class="rosgan-razas">${razas.map((r) =>
          `<tr>
            <td>${escapeHTML(r.titulo)}${r.observacion ? `<span class="rosgan-obs">${escapeHTML(r.observacion)}</span>` : ""}</td>
            <td>${precioStr(r.precio)}</td>
          </tr>`
        ).join("")}</table>`
      : "";
    return `<div class="rosgan-cat">
      <div class="rosgan-cat-header">
        <span>${escapeHTML(cat.titulo)}</span>
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
  if (ui.rosganPiri) ui.rosganPiri.textContent = piri > 0 ? precioStr(piri) : "-";

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
      const manual = $("precioCompra_manual");
      if (manual) manual.max = slider.max;
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
      const manual = $("precioVenta_manual");
      if (manual) manual.max = slider.max;
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
    actualizar(ui, overrides);
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
    costoCompra:          $("costoCompra"),
    costoProduccion:      $("costoProduccion"),
    comisionCompraTotal:  $("comisionCompraTotal"),
    comisionVentaTotal:   $("comisionVentaTotal"),
    costoTotal:           $("costoTotal"),
    margenCabeza:         $("margenCabeza"),
    margenTotal:          $("margenTotal"),
    margenCabezaUsd:      $("margenCabezaUsd"),
    margenTotalUsd:       $("margenTotalUsd"),
    jaulaDoble:           $("jaulaDoble"),
    jaulaSimple:          $("jaulaSimple"),
    chasisCompra:         $("chasisCompra"),
    costoFlete:           $("costoFlete"),
    seguroFlete:          $("seguroFlete"),
    jaulaDobleVenta:      $("jaulaDobleVenta"),
    jaulaSimpleVenta:     $("jaulaSimpleVenta"),
    chasisVenta:          $("chasisVenta"),
    costoFleteVenta:      $("costoFleteVenta"),
    seguroFleteVenta:     $("seguroFleteVenta"),
    estadoRentabilidad:   $("estadoRentabilidad"),
    precioEquilibrio:     $("precioEquilibrio"),
    marketStatus:            $("marketStatus"),
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

  document.querySelectorAll(".btn-escenario").forEach(btn => {
    btn.addEventListener("click", () => guardarEscenario(Number(btn.dataset.idx)));
  });

  document.getElementById("btnExportarPdf")?.addEventListener("click", () => {
    const fechaEl = document.getElementById("printFecha");
    if (fechaEl) fechaEl.textContent = new Date().toLocaleDateString("es-AR");
    window.print();
  });

  $("btnResetSimulador")?.addEventListener("click", () => {
    $("simuladorForm")?.reset();
    // form.reset() desmarca los checkboxes sin disparar "change":
    // hay que re-sincronizar el estado disabled de slider/manual.
    Object.values(overrides).forEach((o) => o.setManualEnabled(false));
    // Los valores vuelven a los defaults del HTML, ya no vienen de ROSGAN.
    ["precioCompraBadge", "precioVentaBadge"].forEach((id) => {
      const badge = $(id);
      if (badge) badge.hidden = true;
    });
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
