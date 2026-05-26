document.addEventListener("DOMContentLoaded", () => {

    const btn = document.querySelector(".btn-primary");

    btn.addEventListener("click", () => {

        const tipo = document.getElementById("camion").value;
        const km = parseFloat(document.getElementById("km").value);

        if (isNaN(km)) {
            alert("Ingresá la distancia.");
            return;
        }

        const camion = CAMIONES[tipo];

        const flete = km <= camion.limite
            ? camion.arranque + camion.tarifa * km
            : camion.tarifa * km;

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
