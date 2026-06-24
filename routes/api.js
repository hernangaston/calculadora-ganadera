const express = require("express");
const router  = express.Router();

const { dolarHandler, ganadoHandler, preciosHandler, rosganHandler, noticiasHandler } =
  require("../lib/http-handlers");

router.get("/dolar",    dolarHandler);
router.get("/ganado",   ganadoHandler);
router.get("/precios",  preciosHandler);
router.get("/rosgan",   rosganHandler);
router.get("/noticias", noticiasHandler);

module.exports = router;
