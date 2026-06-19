// Pruebas manuales de calcularResultado
// Ejecutar con: node test/manual.js

import { calcularResultado } from "../public/js/core/feedlot.js";

async function main() {

  let pasados = 0;
  let fallados = 0;

  function titulo(nombre) {
    console.log("\n" + "═".repeat(55));
    console.log("TEST: " + nombre);
    console.log("═".repeat(55));
  }

  function verificar(descripcion, condicion) {
    if (condicion) {
      console.log("  ✓ " + descripcion);
      pasados++;
    } else {
      console.log("  ✗ FALLA: " + descripcion);
      fallados++;
    }
  }

  function mostrar(res) {
    console.log("  Días totales   :", res.diasTotales);
    console.log("  Peso final     :", res.pesoFinal.toFixed(1), "kg");
    console.log("  KG producidos  :", res.kgProducidos.toFixed(1), "kg");
    console.log("  Costo total    : $" + res.costoTotal.toLocaleString("es-AR"));
    console.log("  Margen total   : $" + res.margen.toLocaleString("es-AR"));
    console.log("  Margen/cabeza  : $" + res.margenCabeza.toLocaleString("es-AR"));
    console.log("  Flete          :", res.flete.descripcion || "(sin flete)");
  }

  // ── TEST 1: Escenario rentable normal ──────────────────────────────────────────
  titulo("1 · Escenario rentable normal");
  {
    const r = calcularResultado({
      animales: 100,
      pesoCompra: 300,
      adpvCampo: 0.8,
      adpvCorral: 0.8,
      recria: 60,
      corral: 120,
      precioCompra: 2500,
      precioVenta: 3500,
      distancia: 200,
    });
    mostrar(r);
    verificar("margenCabeza > 0", r.margenCabeza > 0);
    verificar("pesoFinal > pesoCompra", r.pesoFinal > 300);
    verificar("kgProducidos > 0", r.kgProducidos > 0);
    verificar("diasTotales = 180", r.diasTotales === 180);
    verificar("resultado no contiene NaN", Object.values(r).every((v) => typeof v !== "number" || !isNaN(v)));
  }

  // ── TEST 2: Escenario con pérdida (precio venta muy bajo) ──────────────────────
  titulo("2 · Escenario con pérdida");
  {
    const r = calcularResultado({
      animales: 80,
      pesoCompra: 350,
      adpvCampo: 0.6,
      adpvCorral: 0.6,
      recria: 30,
      corral: 90,
      precioCompra: 4000,
      precioVenta: 1500, // precio venta muy por debajo del costo
      distancia: 300,
    });
    mostrar(r);
    verificar("margen < 0 (pérdida)", r.margen < 0);
    verificar("margenCabeza < 0", r.margenCabeza < 0);
    verificar("costoTotal > 0", r.costoTotal > 0);
    verificar("resultado no contiene NaN", Object.values(r).every((v) => typeof v !== "number" || !isNaN(v)));
  }

  // ── TEST 3: Margen cero aproximado (equilibrio) ────────────────────────────────
  titulo("3 · Margen cero — precio de venta igual al de compra, sin flete");
  {
    // Sin flete (distancia=0), mismo $/kg compra y venta.
    // El animal gana peso, así que igual hay margen positivo.
    // Para forzar equilibrio real: precio venta = costoCompra / (pesoFinal * animales)
    // Se verifica que margenCabeza ≈ 0 cuando precioVenta ≈ 2419
    const animales = 50;
    const pesoCompra = 300;
    const adpv = 0.8;
    const diasTotales = 90;
    const pesoFinal = pesoCompra + adpv * diasTotales; // 372 kg
    const precioCompra = 3000;
    // costoTotal sin flete = 300 * 3000 * 50 = 45.000.000
    // ingresoVenta = 372 * precioVenta * 50
    // margen = 0 → precioVenta = 45.000.000 / (372 * 50) ≈ 2419.35
    const precioVentaEquilibrio = (pesoCompra * precioCompra * animales) / (pesoFinal * animales);

    const r = calcularResultado({
      animales,
      pesoCompra,
      adpvCampo: adpv,
      adpvCorral: adpv,
      recria: 0,
      corral: diasTotales,
      precioCompra,
      precioVenta: precioVentaEquilibrio,
      distancia: 0,
    });
    mostrar(r);
    verificar("margen ≈ 0 (error < $1)", Math.abs(r.margen) < 1);
    verificar("margenCabeza ≈ 0", Math.abs(r.margenCabeza) < 1);
    verificar("resultado no contiene NaN", Object.values(r).every((v) => typeof v !== "number" || !isNaN(v)));
  }

  // ── TEST 4: animales = 0 ───────────────────────────────────────────────────────
  titulo("4 · animales = 0 (rodeo vacío)");
  {
    const r = calcularResultado({
      animales: 0,
      pesoCompra: 300,
      adpv: 0.8,
      recria: 60,
      corral: 120,
      precioCompra: 2500,
      precioVenta: 3500,
      distancia: 200,
    });
    mostrar(r);
    verificar("costoCompra = 0", r.costoTotal === 0);
    verificar("margen = 0", r.margen === 0);
    verificar("margenCabeza = 0 (no divide por cero)", r.margenCabeza === 0);
    verificar("resultado no contiene NaN", Object.values(r).every((v) => typeof v !== "number" || !isNaN(v)));
  }

  // ── TEST 5: Entradas inválidas / nulas ─────────────────────────────────────────
  titulo("5 · Entradas inválidas — null, undefined, strings, NaN");
  {
    // Sin argumento alguno
    const r1 = calcularResultado();
    console.log("  Sin argumento → margen:", r1.margen);
    verificar("sin argumento no tira excepción", true);
    verificar("sin argumento devuelve margen=0", r1.margen === 0);

    // Con nulls
    const r2 = calcularResultado({
      animales: null,
      pesoCompra: null,
      adpv: undefined,
      recria: NaN,
      corral: "hola",
      precioCompra: {},
      precioVenta: [],
      distancia: null,
    });
    console.log("  Con nulls/inválidos → margen:", r2.margen);
    verificar("inputs inválidos no producen NaN en margen", !isNaN(r2.margen));
    verificar("inputs inválidos devuelven margen=0", r2.margen === 0);
    verificar("objeto de retorno completo", "diasTotales" in r2 && "flete" in r2);

    // Strings numéricas válidas (coerción esperada)
    const r3 = calcularResultado({
      animales: "50",
      pesoCompra: "300",
      adpv: "0.8",
      recria: "60",
      corral: "120",
      precioCompra: "2500",
      precioVenta: "3500",
      distancia: "0",
    });
    console.log("  Strings numéricas → margenCabeza:", r3.margenCabeza.toLocaleString("es-AR"));
    verificar("strings numéricas producen resultado válido", r3.margenCabeza > 0);
  }

  // ── TEST 6: Valores extremos ───────────────────────────────────────────────────
  titulo("6 · Valores extremos");
  {
    // Muchos animales, precios altos
    const r1 = calcularResultado({
      animales: 10000,
      pesoCompra: 600,
      adpv: 2.0,
      recria: 365,
      corral: 365,
      precioCompra: 999999,
      precioVenta: 999999,
      distancia: 2000,
    });
    console.log("  Extremo alto → margenCabeza:", r1.margenCabeza.toLocaleString("es-AR"));
    verificar("valores muy altos no producen NaN", !isNaN(r1.margen));
    verificar("valores muy altos devuelven número finito", Number.isFinite(r1.margen));

    // Un solo animal, valores mínimos
    const r2 = calcularResultado({
      animales: 1,
      pesoCompra: 1,
      adpv: 0.001,
      recria: 1,
      corral: 0,
      precioCompra: 1,
      precioVenta: 1,
      distancia: 1,
    });
    console.log("  Extremo bajo → margen:", r2.margen.toLocaleString("es-AR"));
    verificar("valores mínimos no producen NaN", !isNaN(r2.margen));

    // distancia negativa (debe tratarse como 0)
    const r3 = calcularResultado({
      animales: 50,
      pesoCompra: 300,
      adpv: 0.8,
      recria: 60,
      corral: 60,
      precioCompra: 2000,
      precioVenta: 2500,
      distancia: -500,
    });
    console.log("  Distancia negativa → costoFlete:", r3.flete.costoFlete);
    verificar("distancia negativa tratada como 0 (sin flete)", r3.flete.costoFlete === 0);
  }

  // ── Resumen ────────────────────────────────────────────────────────────────────
  console.log("\n" + "═".repeat(55));
  console.log(`RESULTADO: ${pasados} pasados, ${fallados} fallados`);
  console.log("═".repeat(55));
  if (fallados > 0) process.exit(1);
}

main().catch((err) => {
  console.error("Error al ejecutar pruebas:", err);
  process.exit(1);
});
