// Esperar a que cargue el DOM
document.addEventListener("DOMContentLoaded", () => {

    const button = document.querySelector(".btn-primary");

    // Inputs
    const pesoInput = document.querySelectorAll("input")[0];
    const precioInput = document.querySelectorAll("input")[1];
    const engordeInput = document.querySelectorAll("input")[2];
    const costoInput = document.querySelectorAll("input")[3];
    const diasInput = document.querySelectorAll("input")[4];

    // Secciones resultado
    const resultCard = document.querySelectorAll(".card")[1];
    const escenariosCard = document.querySelectorAll(".card")[2];

    const ventaHoySpan = document.querySelector(".result-main span");

    const escenarios = [
        { nombre: "Precio baja un poco (–5%)", variacion: -0.05, clase: "bad" },
        { nombre: "Precio igual", variacion: 0, clase: "neutral" },
        { nombre: "Precio sube un poco (+5%)", variacion: 0.05, clase: "good" }
    ];

    button.addEventListener("click", () => {

        const peso = parseFloat(pesoInput.value);
        const precio = parseFloat(precioInput.value);
        const engorde = parseFloat(engordeInput.value);
        const costo = parseFloat(costoInput.value);
        const dias = parseInt(diasInput.value);

        if (
            isNaN(peso) || isNaN(precio) ||
            isNaN(engorde) || isNaN(costo) ||
            isNaN(dias)
        ) {
            alert("Completá todos los datos para hacer la cuenta.");
            return;
        }

        // Venta hoy
        const ventaHoy = peso * precio;
        ventaHoySpan.textContent = `$${ventaHoy.toLocaleString("es-AR")}`;

        // Limpiar escenarios anteriores
        escenariosCard.innerHTML = `
      <h2>¿Qué pasa si esperás?</h2>
    `;

        escenarios.forEach(esc => {

            const pesoFuturo = peso + (engorde * dias);
            const precioFuturo = precio * (1 + esc.variacion);
            const ingresoFuturo = pesoFuturo * precioFuturo;
            const costoEsperar = costo * dias;
            const diferencia = ingresoFuturo - costoEsperar - ventaHoy;

            const decision = diferencia > 0
                ? "Conviene esperar"
                : "Mejor vender ahora";

            const div = document.createElement("div");
            div.className = `scenario ${esc.clase}`;

            div.innerHTML = `
        <h3>${esc.nombre}</h3>
        <p>Plata si esperás: $${ingresoFuturo.toLocaleString("es-AR")}</p>
        <strong>${decision}</strong>
      `;

            escenariosCard.appendChild(div);
        });

        // Mostrar resultados
        resultCard.classList.remove("hidden");
        escenariosCard.classList.remove("hidden");

        // Scroll suave al resultado
        resultCard.scrollIntoView({ behavior: "smooth" });
    });


    function calcularBalanceForrajero() {
        const animales = Number(document.getElementById("bf_animales").value);
        const peso = Number(document.getElementById("bf_peso").value);
        const hectareas = Number(document.getElementById("bf_hectareas").value);
        const tipoForraje = document.getElementById("bf_forraje").value;
        const estado = document.getElementById("bf_estado").value;
        const resultado = document.getElementById("bf_resultado");

        if (!animales || !peso || !hectareas) {
            resultado.innerHTML = "⚠️ Completá todos los datos.";
            return;
        }

        // Consumo diario estimado (2,5% del peso vivo)
        const consumoDiarioPorAnimal = peso * 0.025;

        // Producción de MS por tipo de forraje (kg MS/ha)
        const produccionForraje = {
            campo_natural: 2500,
            pastura_implantada: 4500,
            verdeo: 3500
        };

        // Ajuste por estado del forraje
        const factorEstado = {
            bueno: 1,
            regular: 0.8,
            malo: 0.6
        };

        // Oferta total de MS
        const ofertaMS =
            hectareas *
            produccionForraje[tipoForraje] *
            factorEstado[estado];

        // Demanda diaria total
        const demandaDiaria =
            animales *
            consumoDiarioPorAnimal;

        // Días de autonomía
        const diasAutonomia = ofertaMS / demandaDiaria;

        resultado.className = ""; // reset
        resultado.classList.remove("hidden");

        if (diasAutonomia > 90) {
            resultado.classList.add("ok");
            resultado.innerHTML = `
        <strong>🟢 Tranquilo</strong><br>
        Tenés pasto para aproximadamente
        <strong>${diasAutonomia.toFixed(0)} días</strong>.
    `;
        } else if (diasAutonomia > 45) {
            resultado.classList.add("warn");
            resultado.innerHTML = `
        <strong>🟡 Atención</strong><br>
        El pasto alcanzaría unos
        <strong>${diasAutonomia.toFixed(0)} días</strong>.
        Evaluá ajustes.
    `;
        } else {
            resultado.classList.add("danger");
            resultado.innerHTML = `
        <strong>🔴 Riesgo</strong><br>
        Podrías quedarte sin pasto en
        <strong>${diasAutonomia.toFixed(0)} días</strong>.
        Considerá vender o suplementar.
    `;
        }
        document.getElementById("bf_info").classList.remove("hidden");
    }
    const buttonBalance = document.getElementById("bf_button");
    buttonBalance.addEventListener("click", () => {
        calcularBalanceForrajero();
    });


});
