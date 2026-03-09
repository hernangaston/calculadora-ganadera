document.addEventListener("DOMContentLoaded", () => {

    const btn = document.querySelector(".btn-primary");

    btn.addEventListener("click", () => {

        const costoDiario = parseFloat(document.getElementById("costoDiario").value);
        const dias = parseFloat(document.getElementById("dias").value);
        const kgGanados = parseFloat(document.getElementById("kgGanados").value);
        const cantidad = parseFloat(document.getElementById("cantidad").value);

        if (
            isNaN(costoDiario) ||
            isNaN(dias) ||
            isNaN(kgGanados) ||
            isNaN(cantidad)
        ) {
            alert("Completá todos los datos.");
            return;
        }

        const costoTotalAnimal = costoDiario * dias;
        const costoKg = costoTotalAnimal / kgGanados;
        const costoTotal = costoTotalAnimal * cantidad;

        document.getElementById("costoKg").textContent =
            `$${costoKg.toFixed(2)} / kg`;

        document.getElementById("detalle").innerHTML = `
Costo por animal: <strong>$${costoTotalAnimal.toLocaleString("es-AR")}</strong><br>
Costo total del lote: <strong>$${costoTotal.toLocaleString("es-AR")}</strong>
`;

        const decision = document.getElementById("decision");
        decision.className = "scenario";

        if (costoKg < 800) {

            decision.classList.add("good");
            decision.innerHTML = "🟢 Costo competitivo.";

        }

        else if (costoKg < 1200) {

            decision.classList.add("neutral");
            decision.innerHTML = "🟡 Costo aceptable.";

        }

        else {

            decision.classList.add("bad");
            decision.innerHTML = "🔴 Costo alto. Revisar manejo o duración del ciclo.";

        }

        document.getElementById("resultado").classList.remove("hidden");

    });

});