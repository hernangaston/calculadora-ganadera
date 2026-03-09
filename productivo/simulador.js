function simular() {

    let cantidad = Number(document.getElementById("cantidad").value);
    let pesoCompra = Number(document.getElementById("pesoCompra").value);
    let precioCompra = Number(document.getElementById("precioCompra").value);

    let adpvCampo = Number(document.getElementById("adpvCampo").value);
    let diasCampo = Number(document.getElementById("diasCampo").value);
    let costoCampo = Number(document.getElementById("costoCampo").value);

    let adpvCorral = Number(document.getElementById("adpvCorral").value);
    let diasCorral = Number(document.getElementById("diasCorral").value);
    let costoCorral = Number(document.getElementById("costoCorral").value);

    let precioVenta = Number(document.getElementById("precioVenta").value);
    let flete = Number(document.getElementById("flete").value);


    // compra
    let costoCompra = cantidad * pesoCompra * precioCompra;


    // recría
    let pesoRecria = pesoCompra + (adpvCampo * diasCampo);
    let costoRecria = cantidad * diasCampo * costoCampo;


    // corral
    let pesoFinal = pesoRecria + (adpvCorral * diasCorral);
    let costoCorralTotal = cantidad * diasCorral * costoCorral;


    // ingreso
    let ingreso = cantidad * pesoFinal * precioVenta;


    // costo total
    let costoTotal =
        costoCompra +
        costoRecria +
        costoCorralTotal +
        flete;


    // resultado
    let resultado = ingreso - costoTotal;


    // mostrar resultados
    document.getElementById("resultadoCard").classList.remove("hidden");

    document.getElementById("pesoRecria").innerHTML =
        "Peso salida recría: <b>" + pesoRecria.toFixed(1) + " kg</b>";

    document.getElementById("pesoFinal").innerHTML =
        "Peso final: <b>" + pesoFinal.toFixed(1) + " kg</b>";

    document.getElementById("costoTotal").innerHTML =
        "Costo total: $" + costoTotal.toFixed(0);

    document.getElementById("ingreso").innerHTML =
        "Ingreso por venta: $" + ingreso.toFixed(0);

    document.getElementById("resultado").innerHTML =
        "$" + resultado.toFixed(0);

}