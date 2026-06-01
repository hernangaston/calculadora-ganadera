const { getGanadoMock } = require("../lib/cattle-api");

module.exports = async function handler(req, res) {
  res.json(getGanadoMock());
};
