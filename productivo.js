document.addEventListener("DOMContentLoaded", () => {

    const btn = document.querySelector(".btn-primary");

    const resultadoCard = document.getElementById("resultado");
    const escenariosCard = document.getElementById("escenarios");

    btn.addEventListener("click", () => {

        const pesoInicial = parseFloat(document.getElementById("pesoInicial").value);
        const amd = parseFloat(document.getElementById("amd").value);
        const dias = parseInt(document.getElementById("dias").value);

        const precioCompra = parseFloat(document.getElementById("precioCompra").value);
        const precioVenta = parseFloat(document.getElementById("precioVenta").value);
        const costoDiario = parseFloat(document.getElementById("costoDiario").value);

        const cantidad = parseFloat(document.getElementById("cantidad").value);
        const hectareas = parseFloat(document.getElementById("hectareas").value);

        if (
            isNaN(pesoInicial) || isNaN(amd) || isNaN(dias) ||
            isNaN(precioCompra) || isNaN(precioVenta) ||
            isNaN(costoDiario) || isNaN(cantidad) || isNaN(hectareas)
        ) {
            alert("Completá todos los datos para hacer la cuenta.");
            return;
        }

        // PRODUCTIVO
        const pesoFinal = pesoInicial + (amd * dias);
        const kgGanados = pesoFinal - pesoInicial;

        // ECONÓMICO
        const compra = pesoInicial * precioCompra;
        const venta = pesoFinal * precioVenta;
        const costoEspera = costoDiario * dias;

        const margen = venta - compra - costoEspera;
        const margenTotal = margen * cantidad;
        const margenHa = margenTotal / hectareas;
        const roi = (margen / compra) * 100;

        document.getElementById("pesoFinal").textContent =
            `${pesoFinal.toFixed(1)} kg (+${kgGanados.toFixed(1)} kg)`;

        document.getElementById("resumenEconomico").innerHTML = `
            Margen por cabeza: <strong>$${margen.toLocaleString("es-AR")}</strong><br>
            Margen total: <strong>$${margenTotal.toLocaleString("es-AR")}</strong><br>
            Margen por ha: <strong>$${margenHa.toLocaleString("es-AR")}</strong><br>
            ROI: <strong>${roi.toFixed(1)}%</strong>
        `;

        // DECISIÓN
        const decisionDiv = document.getElementById("decision");
        decisionDiv.className = "scenario";

        if (roi > 25) {
            decisionDiv.classList.add("good");
            decisionDiv.innerHTML = "🟢 Buen ciclo. El margen acompaña el tiempo de espera.";
        } else if (roi > 10) {
            decisionDiv.classList.add("neutral");
            decisionDiv.innerHTML = "🟡 Negocio ajustado. Dependés de que el precio no baje.";
        } else {
            decisionDiv.classList.add("bad");
            decisionDiv.innerHTML = "🔴 Ciclo débil. Mucho capital inmovilizado para poco retorno.";
        }

        // ESCENARIOS
        escenariosCard.innerHTML = "<h2>Escenarios de precio</h2>";

        const variaciones = [
            { nombre: "Precio baja –5%", factor: 0.95, clase: "bad" },
            { nombre: "Precio actual", factor: 1, clase: "neutral" },
            { nombre: "Precio sube +5%", factor: 1.05, clase: "good" }
        ];

        variaciones.forEach(esc => {

            const ventaEscenario = pesoFinal * (precioVenta * esc.factor);
            const margenEscenario = ventaEscenario - compra - costoEspera;

            const div = document.createElement("div");
            div.className = `scenario ${esc.clase}`;

            div.innerHTML = `
                <h3>${esc.nombre}</h3>
                <p>Margen por cabeza: $${margenEscenario.toLocaleString("es-AR")}</p>
            `;

            escenariosCard.appendChild(div);
        });

        resultadoCard.classList.remove("hidden");
        escenariosCard.classList.remove("hidden");
        resultadoCard.scrollIntoView({ behavior: "smooth" });
    });

});