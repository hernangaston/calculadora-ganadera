export function formatoAR(numero, decimales = 0) {
  return Number(numero).toLocaleString("es-AR", {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  });
}

export function calcularFlete({ animales, distancia }, ui) {
  if (!distancia) {
    ui.camiones.textContent = "0";
    ui.costoFlete.textContent = "0";
    ui.seguroFlete.textContent = "0";
    return 0;
  }

  const doble = Math.floor(animales / 110);
  let resto = animales % 110;
  const simple = Math.floor(resto / 70);
  resto = resto % 70;
  const chasis = Math.ceil(resto / 20);

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

  ui.camiones.textContent =
    `${doble} Jaula doble, ${simple} Jaula simple, ${chasis} Chasis`;
  ui.costoFlete.textContent = formatoAR(costo);
  ui.seguroFlete.textContent = formatoAR(costo * 0.05);

  return costo;
}

export function compute({ animales, pesoCompra, adpv, recria, corral, precioCompra, precioVenta, distancia }, ui) {
  const diasTotales = recria + corral;
  const pesoFinal = pesoCompra + (adpv * diasTotales);
  const kgProducidos = pesoFinal - pesoCompra;

  const costoCompra = pesoCompra * precioCompra * animales;
  const ingresoVenta = pesoFinal * precioVenta * animales;

  const costoFlete = calcularFlete({ animales, distancia }, ui);
  const seguro = costoFlete * 0.05;
  const costoTotal = costoCompra + costoFlete + seguro;

  const margen = ingresoVenta - costoTotal;
  const margenCabeza = margen / Math.max(animales, 1);

  return {
    diasTotales,
    pesoFinal,
    kgProducidos,
    costoTotal,
    margen,
    margenCabeza,
  };
}

