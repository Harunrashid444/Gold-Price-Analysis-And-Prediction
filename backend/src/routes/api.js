const express = require("express");
const { requireAuth } = require("../middleware/auth");
const ctrl = require("../controllers/analysisController");

const router = express.Router();

router.use(requireAuth);

router.get("/overview", ctrl.overview);
router.get("/gold/:dataset", ctrl.goldSeries);
router.get("/analysis/:dataset", ctrl.analysis);
router.get("/seasonality/:dataset", ctrl.seasonality);
router.get("/stationarity/:dataset", ctrl.stationarity);
router.get("/models/:dataset", ctrl.models);
router.get("/forecast/:dataset", ctrl.forecast);

module.exports = router;
