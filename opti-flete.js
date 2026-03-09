document.addEventListener("DOMContentLoaded", () => {

    const btn = document.querySelector(".btn-primary");

    const camiones = {

        chasis: {
            capacidad: 20,
            tarifa: 2100,
            arranque: 90000,
            limite: 300
        },

        simple: {
            capacidad: 70,
            tarifa: 2900,
            arranque: 160000,
            limite: 300
        },

        doble: {
            capacidad: 110,
            tarifa: 3300,
            arranque: 250000,
            limite: 300
        }

    };

    function costoCamion(tipo, km) {

        const c = camiones[tipo];

        let flete;

        if (km <= c.limite) {

            flete = c.arranque;

        } else {

            flete = c.arranque + ((km - c.limite) * c.tarifa);

        }

        const seguro = flete * 0.05;

        return flete + seguro;

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
                        (chasis * camiones.chasis.capacidad) +
                        (simple * camiones.simple.capacidad) +
                        (doble * camiones.doble.capacidad);

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