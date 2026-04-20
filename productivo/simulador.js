let chartMargen = null;

function formatoAR(numero, decimales = 0) {

    return numero.toLocaleString("es-AR", {
        minimumFractionDigits: decimales,
        maximumFractionDigits: decimales
    });

}

function getManualElements(fieldId) {
    const wrap = document.querySelector(`.manual-override[data-field="${fieldId}"]`);
    if (!wrap) return null;
    const check = wrap.querySelector(".manual-check");
    const manual = document.getElementById(`${fieldId}_manual`);
    const slider = document.getElementById(fieldId);
    if (!check || !manual || !slider) return null;
    return { wrap, check, manual, slider };
}

function getFieldValue(fieldId) {
    const els = getManualElements(fieldId);
    if (!els) {
        const el = document.getElementById(fieldId);
        return Number(el?.value ?? 0);
    }
    const { check, manual, slider } = els;
    return check.checked ? Number(manual.value) : Number(slider.value);
}

function setManualState(fieldId, enabled, { syncManualFromSlider = true } = {}) {
    const els = getManualElements(fieldId);
    if (!els) return;
    const { wrap, check, manual, slider } = els;

    check.checked = enabled;
    manual.disabled = !enabled;
    slider.disabled = enabled;
    wrap.classList.toggle("is-manual", enabled);

    if (enabled && syncManualFromSlider) {
        manual.value = slider.value;
    }
}

function bindManualOverrides(onChange) {
    const wrappers = document.querySelectorAll(".manual-override[data-field]");
    wrappers.forEach((wrap) => {
        const fieldId = wrap.getAttribute("data-field");
        const els = getManualElements(fieldId);
        if (!els) return;

        const { check, manual, slider } = els;

        // Copiar constraints del slider al input manual
        if (slider.min !== "") manual.min = slider.min;
        if (slider.max !== "") manual.max = slider.max;
        if (slider.step !== "") manual.step = slider.step;

        const handleToggle = () => {
            setManualState(fieldId, check.checked, { syncManualFromSlider: true });
            onChange();
        };

        check.addEventListener("change", handleToggle);
        manual.addEventListener("input", onChange);

        // Si el slider cambia y está en auto, mantenemos manual “listo” si luego activa
        slider.addEventListener("input", () => {
            if (!check.checked) manual.value = slider.value;
            onChange();
        });

        // Estado inicial
        setManualState(fieldId, check.checked, { syncManualFromSlider: false });
    });
}

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

        ctx.fillStyle = "#6D4C41";
        ctx.font = "12px system-ui, -apple-system, Segoe UI, sans-serif";
        ctx.textAlign = "left";
        ctx.textBaseline = "top";

        const label = "Precio actual";
        const padding = 6;
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
        ctx.fillText(label, xClamped + padding, yBox + 3);
        ctx.restore();
    }
};

document.addEventListener("DOMContentLoaded", () => {
    const sliders = document.querySelectorAll("input[type=range]");
    sliders.forEach((slider) => slider.addEventListener("input", actualizar));

    bindManualOverrides(actualizar);

    const btnReset = document.getElementById("btnResetSimulador");
    const form = document.getElementById("simuladorForm");
    if (btnReset && form) {
        btnReset.addEventListener("click", () => {
            form.reset();
            ["precioCompra", "precioVenta", "adpv"].forEach((id) => setManualState(id, false));
            if (chartMargen) {
                chartMargen.destroy();
                chartMargen = null;
            }
            actualizar();
        });
    }

    actualizar();
});

function calcularFlete(animales, distancia) {

    if (distancia === 0) {

        document.getElementById("camiones").textContent = "0";
        document.getElementById("costoFlete").textContent = 0;
        document.getElementById("seguroFlete").textContent = 0;

        return 0;
    }

    let doble = Math.floor(animales / 110);

    let resto = animales % 110;

    let simple = Math.floor(resto / 70);

    resto = resto % 70;

    let chasis = Math.ceil(resto / 20);

    let costo = 0;

    if (distancia < 300) {

        costo += doble * 250000;
        costo += simple * 160000;
        costo += chasis * 90000;

    } else {

        costo += doble * distancia * 3300;
        costo += simple * distancia * 2900;
        costo += chasis * distancia * 2100;

    }

    document.getElementById("camiones").textContent =
        doble + " Jaula doble, " + simple + " Jaula simple, " + chasis + " Chasis";

    document.getElementById("costoFlete").textContent = formatoAR(costo);
    document.getElementById("seguroFlete").textContent = formatoAR(costo * 0.05);

    return costo;

}

function calcularMargen(precioCompraSimulado) {

    const animales = getFieldValue("animales");
    const pesoCompra = getFieldValue("pesoCompra");
    const adpv = getFieldValue("adpv");
    const recria = getFieldValue("recria");
    const corral = getFieldValue("corral");
    const precioVenta = getFieldValue("precioVenta");
    const distancia = getFieldValue("distancia");

    const diasTotales = recria + corral;
    const pesoFinal = pesoCompra + (adpv * diasTotales);

    const costoCompra = pesoCompra * precioCompraSimulado * animales;
    const ingresoVenta = pesoFinal * precioVenta * animales;

    const costoFlete = calcularFlete(animales, distancia);
    const seguro = costoFlete * 0.05;

    const costoTotal = costoCompra + costoFlete + seguro;

    return ingresoVenta - costoTotal;
}


function generarCurvaMargen() {

    const precios = [];
    const margenes = [];

    const precioActual = getFieldValue("precioCompra");

    const min = precioActual * 0.7;
    const max = precioActual * 1.3;

    let mejorPrecio = 0;
    let menorDiferencia = Infinity;

    for (let precio = min; precio <= max; precio += 50) {

        const margen = calcularMargen(precio);

        precios.push(precio);
        margenes.push(margen);

        const diferencia = Math.abs(margen);

        if (diferencia < menorDiferencia) {
            menorDiferencia = diferencia;
            mejorPrecio = precio;
        }
    }

    document.getElementById("precioEquilibrio").textContent =
        formatoAR(mejorPrecio);

    return { precios, margenes };
}

function actualizarGraficoMargen() {

    const { precios, margenes } = generarCurvaMargen();
    const precioActual = getFieldValue("precioCompra");

    if (chartMargen) {
        chartMargen.data.labels = precios;
        chartMargen.data.datasets[0].data = margenes;
        chartMargen.options.plugins.precioActualPlugin.xValue = precioActual;
        chartMargen.update();
        return;
    }

    const ctx = document.getElementById("graficoMargen").getContext("2d");

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
                    pointRadius: 0
                },
                {
                    label: "Equilibrio (margen = 0)",
                    data: precios.map(() => 0),
                    borderColor: "#888",
                    borderDash: [6, 6],
                    pointRadius: 0
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: true
                },
                precioActualPlugin: {
                    xValue: precioActual
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: "Precio compra ($/kg)"
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: "Margen ($)"
                    }
                }
            }
        }
    });
}

function actualizar() {

    const animales = getFieldValue("animales");
    const pesoCompra = getFieldValue("pesoCompra");
    const precioCompra = getFieldValue("precioCompra");
    const adpv = getFieldValue("adpv");
    const recria = getFieldValue("recria");
    const corral = getFieldValue("corral");
    const precioVenta = getFieldValue("precioVenta");
    const distancia = getFieldValue("distancia");


    document.getElementById("animalesValor").textContent = formatoAR(animales);
    document.getElementById("pesoCompraValor").textContent = formatoAR(pesoCompra);
    document.getElementById("precioCompraValor").textContent = formatoAR(precioCompra);
    document.getElementById("adpvValor").textContent = formatoAR(adpv, 1);
    document.getElementById("recriaValor").textContent = formatoAR(recria);
    document.getElementById("corralValor").textContent = formatoAR(corral);
    document.getElementById("precioVentaValor").textContent = formatoAR(precioVenta);
    document.getElementById("distanciaValor").textContent = formatoAR(distancia);


    const diasTotales = recria + corral;
    const diasWarning = document.getElementById("diasWarning");
    if (diasWarning) {
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

    const pesoFinal = pesoCompra + (adpv * diasTotales);

    const kgProducidos = pesoFinal - pesoCompra;


    const costoCompra = pesoCompra * precioCompra * animales;

    const ingresoVenta = pesoFinal * precioVenta * animales;


    const costoFlete = calcularFlete(animales, distancia);

    const seguro = costoFlete * 0.05;

    const costoTotal = costoCompra + costoFlete + seguro;

    const margen = ingresoVenta - costoTotal;

    const margenCabeza = margen / animales;
    const estado = document.getElementById("estadoRentabilidad");

    if (margenCabeza > 0) {

        estado.textContent = "✔ Rentable: +" + formatoAR(margenCabeza) + " por cabeza";
        estado.style.color = "green";

    } else {

        estado.textContent = "❌ No rentable: " + formatoAR(margenCabeza) + " por cabeza";
        estado.style.color = "red";

    }

    actualizarGraficoMargen();

    document.getElementById("pesoFinal").textContent = formatoAR(pesoFinal, 1);
    document.getElementById("kgProducidos").textContent = formatoAR(kgProducidos, 1);

    document.getElementById("costoTotal").textContent = formatoAR(costoTotal);
    document.getElementById("margenCabeza").textContent = formatoAR(margenCabeza);
    document.getElementById("margenTotal").textContent = formatoAR(margen);

}