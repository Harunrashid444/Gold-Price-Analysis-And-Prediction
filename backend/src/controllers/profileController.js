const { body, param } = require("express-validator");
const { HttpError } = require("../middleware/errorHandler");

const PHONE = /^[+()\-.\s\d]{6,30}$/;

/** Optional free-text field: absent is fine, present must be a bounded string. */
function optionalText(field, max, label) {
  return body(field)
    .optional({ values: "null" })
    .isString()
    .withMessage(`${label} must be text`)
    .bail()
    .trim()
    .isLength({ max })
    .withMessage(`${label} must be at most ${max} characters`);
}

function optionalPhone(field, label) {
  return body(field)
    .optional({ values: "null" })
    .isString()
    .bail()
    .trim()
    .custom((value) => value === "" || PHONE.test(value))
    .withMessage(`${label} can contain digits, spaces, +, -, ( ) only`);
}

function profileValidators() {
  return [
    body("name")
      .optional()
      .isString()
      .bail()
      .trim()
      .isLength({ min: 2, max: 80 })
      .withMessage("Name must be 2–80 characters"),
    body("contact").optional().isObject().withMessage("Contact must be an object"),
    optionalPhone("contact.phone", "Phone"),
    optionalPhone("contact.alternatePhone", "Alternate phone"),
    optionalText("contact.organization", 120, "Organization"),
    optionalText("contact.jobTitle", 80, "Job title"),
    optionalText("contact.website", 200, "Website")
      .bail()
      .custom((value) => value === "" || /^https?:\/\/\S+\.\S+/i.test(value))
      .withMessage("Website must start with http:// or https://"),
    optionalText("contact.bio", 500, "Bio"),
  ];
}

function addressValidators() {
  function required(field, max, label) {
    return body(field)
      .isString()
      .withMessage(`${label} is required`)
      .bail()
      .trim()
      .notEmpty()
      .withMessage(`${label} is required`)
      .bail()
      .isLength({ max })
      .withMessage(`${label} must be at most ${max} characters`);
  }

  return [
    optionalText("label", 40, "Label"),
    optionalText("fullName", 80, "Recipient name"),
    required("line1", 120, "Address line 1"),
    optionalText("line2", 120, "Address line 2"),
    required("city", 80, "City"),
    optionalText("state", 80, "State / region"),
    optionalText("postalCode", 20, "Postal code"),
    required("country", 80, "Country"),
    optionalPhone("phone", "Phone"),
    body("isDefault").optional().isBoolean().withMessage("isDefault must be true or false").toBoolean(),
  ];
}

function addressIdValidator() {
  return [param("addressId").isString().isLength({ min: 1, max: 64 })];
}

/** Runs a store call and turns a missing user into a 401, like /auth/me does. */
function handler(run) {
  return async (req, res, next) => {
    try {
      const user = await run(req.app.locals.users, req);
      if (!user) throw new HttpError(401, "Session is no longer valid");
      res.json({ user });
    } catch (err) {
      next(err);
    }
  };
}

const getProfile = handler((users, req) => users.findById(req.userId));

const updateProfile = handler((users, req) =>
  users.updateProfile(req.userId, { name: req.body.name, contact: req.body.contact })
);

const addAddress = handler((users, req) => users.addAddress(req.userId, req.body));

const updateAddress = handler((users, req) =>
  users.updateAddress(req.userId, req.params.addressId, req.body)
);

const removeAddress = handler((users, req) =>
  users.removeAddress(req.userId, req.params.addressId)
);

const setDefaultAddress = handler((users, req) =>
  users.setDefaultAddress(req.userId, req.params.addressId)
);

module.exports = {
  getProfile,
  updateProfile,
  addAddress,
  updateAddress,
  removeAddress,
  setDefaultAddress,
  profileValidators,
  addressValidators,
  addressIdValidator,
};
