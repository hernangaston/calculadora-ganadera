const { getRosgan } = require("../lib/cattle-api");

module.exports = async function handler(req, res) {
  try {
    res.json(await getRosgan());
  } catch {
    res.status(502).json({ ok: false, error: "No se pudo obtener datos de ROSGAN" });
  }
};
