module.exports = async function handler(req, res) {
  res.json({
    ok: true,
    fuente: "mock",
    mercado: "invernada",
    unidad: "USD/kg",
    precioUsdKg: 2.55,
    fecha: new Date().toISOString(),
    notas: "Mock inicial. Preparado para integrar ROSGAN/MAG.",
  });
};
