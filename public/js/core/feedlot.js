export function calcularFlete({ animales, distancia }) {
  if (!distancia) {
    return { descripcion: "", costoFlete: 0, seguroFlete: 0 };
  }

  const doble = Math.floor(animales / 110);
  let resto = animales % 110;
  const simple = Math.floor(resto / 70);
  resto = resto % 70;
  const chasis = Math.ceil(resto / 20);

  let costoFlete = 0;
  if (distancia < 300) {
    costoFlete += doble * 250000;
    costoFlete += simple * 160000;
    costoFlete += chasis * 90000;
  } else {
    costoFlete += doble * distancia * 3300;
    costoFlete += simple * distancia * 2900;
    costoFlete += chasis * distancia * 2100;
  }

  return {
    descripcion: `${doble} Jaula doble, ${simple} Jaula simple, ${chasis} Chasis`,
    costoFlete,
    seguroFlete: costoFlete * 0.05,
  };
}

export function calcularResultado({ animales, pesoCompra, adpv, recria, corral, precioCompra, precioVenta, distancia }) {
  const diasTotales = recria + corral;
  const pesoFinal = pesoCompra + adpv * diasTotales;
  const kgProducidos = pesoFinal - pesoCompra;

  const costoCompra = pesoCompra * precioCompra * animales;
  const ingresoVenta = pesoFinal * precioVenta * animales;

  const flete = calcularFlete({ animales, distancia });
  const costoTotal = costoCompra + flete.costoFlete + flete.seguroFlete;

  const margen = ingresoVenta - costoTotal;
  const margenCabeza = margen / Math.max(animales, 1);

  return { diasTotales, pesoFinal, kgProducidos, costoTotal, margen, margenCabeza, flete };
}
