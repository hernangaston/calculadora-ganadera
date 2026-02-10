document.addEventListener("DOMContentLoaded", () => {

    const btn = document.querySelector(".btn-primary");

    const hectareas = document.getElementById("hectareas");
    const tipoCampo = document.getElementById("tipoCampo");
    const estadoPasto = document.getElementById("estadoPasto");
    const animales = document.getElementById("animales");
    const peso = document.getElementById("peso");

    const resultado = document.getElementById("resultado");
    const cargaActualSpan = document.getElementById("cargaActual");
    const cargaReferenciaP = document.getElementById("cargaReferencia");
    const decisionDiv = document.getElementById("decision");

    // Valores orientativos EV/ha
    const cargaRecomendada = {
        natural: { bueno: 0.9, regular: 0.6, malo: 0.4 },
        pastura: { bueno: 1.4, regular: 1.0, malo: 0.7 },
        verdeo: { bueno: 2.0, regular: 1.5, malo: 1.1 }
    };

    btn.addEventListener("click", () => {

        const ha = parseFloat(hectareas.value);
        const cant = parseFloat(animales.value);
        const kg = parseFloat(peso.value);

        if (
            isNaN(ha) || isNaN(cant) || isNaN(kg) ||
            !tipoCampo.value || !estadoPasto.value
        ) {
            alert("Completá todos los datos para hacer la cuenta.");
            return;
        }

        // EV totales
        const evTotales = (cant * kg) / 400;
        const cargaActual = evTotales / ha;

        const cargaRef = cargaRecomendada[tipoCampo.value][estadoPasto.value];

        cargaActualSpan.textContent = `${cargaActual.toFixed(2)} EV/ha`;
        cargaReferenciaP.innerHTML = `
      Para este campo y estado:<br>
      <strong>Carga recomendada: ${cargaRef.toFixed(2)} EV/ha</strong>
    `;

        decisionDiv.className = "scenario";

        if (cargaActual < cargaRef * 0.9) {
            decisionDiv.classList.add("good");
            decisionDiv.innerHTML = "🟢 Estás bien de carga.<br>El campo puede bancar el rodeo.";
        } else if (cargaActual <= cargaRef * 1.1) {
            decisionDiv.classList.add("neutral");
            decisionDiv.innerHTML = "🟡 Estás justo de carga.<br>Cualquier cambio te deja pasado.";
        } else {
            decisionDiv.classList.add("bad");
            decisionDiv.innerHTML = "🔴 Estás pasado de carga.<br>Vas a tener que achicar o suplementar.";
        }

        resultado.classList.remove("hidden");
        resultado.scrollIntoView({ behavior: "smooth" });
    });

});
