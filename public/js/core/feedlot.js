function sanitizar(val) {
  const n = Number(val);
  return Number.isFinite(n) ? n : 0;
}

function sanitizarPositivo(val) {
  return Math.max(0, sanitizar(val));
}

// Tarifas Pepa, Knubel y Ferrero SRL — vigencia 02/06/2026
function fleteCamion(arranque, tarifa, km) {
  return km < 200 ? arranque + tarifa * km : tarifa * km;
}

export function calcularFlete({ animales, distancia } = {}) {
  animales = sanitizarPositivo(animales);
  distancia = sanitizarPositivo(distancia);

  if (distancia === 0) {
    return { descripcion: "", jaulaDoble: 0, jaulaSimple: 0, chasis: 0, costoFlete: 0, seguroFlete: 0 };
  }

  const doble = Math.floor(animales / 50);
  let resto = animales % 50;
  const simple = Math.floor(resto / 35);
  resto = resto % 35;
  const chasis = resto > 0 ? Math.ceil(resto / 20) : 0;

  const costoFlete =
    doble  * fleteCamion(130000, 3900, distancia) +
    simple * fleteCamion(115000, 3200, distancia) +
    chasis * fleteCamion( 98000, 2800, distancia);

  return {
    descripcion: `${doble}D / ${simple}S / ${chasis}Ch`,
    jaulaDoble: doble,
    jaulaSimple: simple,
    chasis: chasis,
    costoFlete,
    seguroFlete: doble * 90000 + simple * 80000 + chasis * 70000,
  };
}

export function calcularResultado({
  animales,
  pesoCompra,
  adpvCampo,
  adpvCorral,
  recria,
  corral,
  costoCampo,
  costoCorral,
  precioCompra,
  precioVenta,
  distancia,
  distanciaVenta = 0,
  comisionCompra,
  comisionVenta,
} = {}) {
  animales       = sanitizarPositivo(animales);
  pesoCompra     = sanitizarPositivo(pesoCompra);
  adpvCampo      = sanitizar(adpvCampo);
  adpvCorral     = sanitizar(adpvCorral);
  recria         = sanitizarPositivo(recria);
  corral         = sanitizarPositivo(corral);
  costoCampo     = sanitizarPositivo(costoCampo);
  costoCorral    = sanitizarPositivo(costoCorral);
  precioCompra   = sanitizarPositivo(precioCompra);
  precioVenta    = sanitizarPositivo(precioVenta);
  distancia      = sanitizarPositivo(distancia);
  distanciaVenta = sanitizarPositivo(distanciaVenta);
  comisionCompra = sanitizarPositivo(comisionCompra);
  comisionVenta  = sanitizarPositivo(comisionVenta);

  const diasTotales       = recria + corral;
  const pesoDespuesRecria = pesoCompra + adpvCampo * recria;
  const pesoFinal         = pesoDespuesRecria + adpvCorral * corral;
  const kgProducidos      = pesoFinal - pesoCompra;

  const precioCompraEfectivo = precioCompra * (1 + comisionCompra / 100);
  const precioVentaEfectivo  = precioVenta  * (1 - comisionVenta  / 100);

  const costoCompra        = pesoCompra * precioCompraEfectivo * animales;
  const costoProduccion    = (costoCampo * recria + costoCorral * corral) * animales;
  const ingresoVenta       = pesoFinal  * precioVentaEfectivo  * animales;

  const comisionCompraTotal = pesoCompra * precioCompra * (comisionCompra / 100) * animales;
  const comisionVentaTotal  = pesoFinal  * precioVenta  * (comisionVenta  / 100) * animales;

  const fleteCompra = calcularFlete({ animales, distancia });
  const fleteVenta  = calcularFlete({ animales, distancia: distanciaVenta });
  const costoTotal  = costoCompra + costoProduccion
    + fleteCompra.costoFlete + fleteCompra.seguroFlete
    + fleteVenta.costoFlete  + fleteVenta.seguroFlete;

  const margen            = ingresoVenta - costoTotal;
  const margenCabeza = animales > 0 ? margen / animales : 0;

  return {
    diasTotales,
    pesoDespuesRecria,
    pesoFinal,
    kgProducidos,
    costoTotal,
    costoProduccion,
    comisionCompraTotal,
    comisionVentaTotal,
    margen,
    margenCabeza,
    flete: fleteCompra,
    fleteCompra,
    fleteVenta,
  };
}
