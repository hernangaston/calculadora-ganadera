const sliders = document.querySelectorAll("input[type=range]");

sliders.forEach(slider => {

    slider.addEventListener("input", actualizar);

});

function actualizar() {

    const animales = Number(document.getElementById("animales").value);
    const pesoCompra = Number(document.getElementById("pesoCompra").value);
    const precioCompra = Number(document.getElementById("precioCompra").value);
    const adpv = Number(document.getElementById("adpv").value);
    const recria = Number(document.getElementById("recria").value);
    const corral = Number(document.getElementById("corral").value);
    const precioVenta = Number(document.getElementById("precioVenta").value);
    const distancia = Number(document.getElementById("distancia").value);


    document.getElementById("animalesValor").textContent = animales;
    document.getElementById("pesoCompraValor").textContent = pesoCompra;
    document.getElementById("precioCompraValor").textContent = precioCompra;
    document.getElementById("adpvValor").textContent = adpv;
    document.getElementById("recriaValor").textContent = recria;
    document.getElementById("corralValor").textContent = corral;
    document.getElementById("precioVentaValor").textContent = precioVenta;
    document.getElementById("distanciaValor").textContent = distancia;


    const diasTotales = recria + corral;

    const pesoFinal = pesoCompra + (adpv * diasTotales);

    const kgProducidos = pesoFinal - pesoCompra;


    const costoCompra = pesoCompra * precioCompra * animales;

    const ingresoVenta = pesoFinal * precioVenta * animales;


    const costoFlete = calcularFlete(animales, distancia);

    const seguro = costoFlete * 0.05;

    const costoTotal = costoCompra + costoFlete + seguro;

    const margen = ingresoVenta - costoTotal;

    const margenCabeza = margen / animales;


    document.getElementById("pesoFinal").textContent = pesoFinal.toFixed(1);
    document.getElementById("kgProducidos").textContent = kgProducidos.toFixed(1);

    document.getElementById("costoTotal").textContent = Math.round(costoTotal);
    document.getElementById("margenCabeza").textContent = Math.round(margenCabeza);
    document.getElementById("margenTotal").textContent = Math.round(margen);


}

function calcularFlete(animales, distancia) {

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

    document.getElementById("costoFlete").textContent = Math.round(costo);

    document.getElementById("seguroFlete").textContent = Math.round(costo * 0.05);


    return costo;

}


actualizar();