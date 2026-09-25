const express = require("express");
const { validate } = require("../middleware/validate");
const { requireAuth } = require("../middleware/auth");
const ctrl = require("../controllers/profileController");

const router = express.Router();

router.use(requireAuth);

router.get("/", ctrl.getProfile);
router.patch("/", ctrl.profileValidators(), validate, ctrl.updateProfile);

router.post("/addresses", ctrl.addressValidators(), validate, ctrl.addAddress);
router.put(
  "/addresses/:addressId",
  ctrl.addressIdValidator(),
  ctrl.addressValidators(),
  validate,
  ctrl.updateAddress
);
router.delete("/addresses/:addressId", ctrl.addressIdValidator(), validate, ctrl.removeAddress);
router.post(
  "/addresses/:addressId/default",
  ctrl.addressIdValidator(),
  validate,
  ctrl.setDefaultAddress
);

module.exports = router;
