const express = require("express");
const router  = express.Router();

const { dolarHandler, ganadoHandler, preciosHandler, rosganHandler } =
  require("../lib/http-handlers");

router.get("/dolar",   dolarHandler);
router.get("/ganado",  ganadoHandler);
router.get("/precios", preciosHandler);
router.get("/rosgan",  rosganHandler);

module.exports = router;
