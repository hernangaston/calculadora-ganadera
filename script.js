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

});
