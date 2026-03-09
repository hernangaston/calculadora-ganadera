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

    btn.addEventListener("click", () => {

        const tipo = document.getElementById("camion").value;
        const km = parseFloat(document.getElementById("km").value);

        if (isNaN(km)) {
            alert("Ingresá la distancia.");
            return;
        }

        const camion = camiones[tipo];

        let flete;

        if (km <= camion.limite) {

            flete = camion.arranque;

        } else {

            flete = camion.arranque + ((km - camion.limite) * camion.tarifa);

        }

        const seguro = flete * 0.05;
        const total = flete + seguro;

        const costoAnimal = total / camion.capacidad;

        document.getElementById("costoAnimal").textContent =
            `$${costoAnimal.toLocaleString("es-AR")}`;

        document.getElementById("detalle").innerHTML = `
Capacidad camión: <strong>${camion.capacidad} animales</strong><br>
Flete: <strong>$${flete.toLocaleString("es-AR")}</strong><br>
Seguro (5%): <strong>$${seguro.toLocaleString("es-AR")}</strong><br>
Costo total viaje: <strong>$${total.toLocaleString("es-AR")}</strong>
`;

        document.getElementById("resultado").classList.remove("hidden");

    });

});