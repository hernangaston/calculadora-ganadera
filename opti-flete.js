document.addEventListener("DOMContentLoaded", () => {

    const btn = document.querySelector(".btn-primary");

    function costoCamion(tipo, km) {

        const c = CAMIONES[tipo];
        const flete = km <= c.limite ? c.arranque + c.tarifa * km : c.tarifa * km;
        return flete * 1.05;

    }

    btn.addEventListener("click", () => {

        const animales = parseInt(document.getElementById("animales").value);
        const km = parseFloat(document.getElementById("km").value);

        if (isNaN(animales) || isNaN(km)) {
            alert("Completá todos los datos.");
            return;
        }

        let mejorCosto = Infinity;
        let mejorCombo = null;

        for (let chasis = 0; chasis <= 10; chasis++) {

            for (let simple = 0; simple <= 10; simple++) {

                for (let doble = 0; doble <= 10; doble++) {

                    if (chasis + simple + doble === 0) continue;

                    const capacidad =
                        (chasis * CAMIONES.chasis.capacidad) +
                        (simple * CAMIONES.simple.capacidad) +
                        (doble * CAMIONES.doble.capacidad);

                    if (capacidad < animales) continue;

                    const costo =
                        (chasis * costoCamion("chasis", km)) +
                        (simple * costoCamion("simple", km)) +
                        (doble * costoCamion("doble", km));

                    if (costo < mejorCosto) {

                        mejorCosto = costo;

                        mejorCombo = { chasis, simple, doble, capacidad };

                    }

                }

            }

        }

        if (mejorCombo === null) {
            alert("No se encontró combinación válida para esa cantidad de animales.");
            return;
        }

        const costoAnimal = mejorCosto / animales;

        document.getElementById("camiones").innerHTML = `
Chasis: <strong>${mejorCombo.chasis}</strong><br>
Jaula Simple: <strong>${mejorCombo.simple}</strong><br>
Jaula Doble: <strong>${mejorCombo.doble}</strong>
`;

        document.getElementById("costoAnimal").textContent =
            `$${costoAnimal.toLocaleString("es-AR")}`;

        document.getElementById("detalle").innerHTML = `
Capacidad total: <strong>${mejorCombo.capacidad}</strong><br>
Costo total viaje: <strong>$${mejorCosto.toLocaleString("es-AR")}</strong>
`;

        document.getElementById("resultado").classList.remove("hidden");

    });

});
