const mongoose = require("mongoose");

const addressSchema = new mongoose.Schema(
  {
    label: { type: String, trim: true, maxlength: 40, default: "Home" },
    fullName: { type: String, trim: true, maxlength: 80, default: "" },
    line1: { type: String, required: true, trim: true, maxlength: 120 },
    line2: { type: String, trim: true, maxlength: 120, default: "" },
    city: { type: String, required: true, trim: true, maxlength: 80 },
    state: { type: String, trim: true, maxlength: 80, default: "" },
    postalCode: { type: String, trim: true, maxlength: 20, default: "" },
    country: { type: String, required: true, trim: true, maxlength: 80 },
    phone: { type: String, trim: true, maxlength: 30, default: "" },
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const contactSchema = new mongoose.Schema(
  {
    phone: { type: String, trim: true, maxlength: 30, default: "" },
    alternatePhone: { type: String, trim: true, maxlength: 30, default: "" },
    organization: { type: String, trim: true, maxlength: 120, default: "" },
    jobTitle: { type: String, trim: true, maxlength: 80, default: "" },
    website: { type: String, trim: true, maxlength: 200, default: "" },
    bio: { type: String, trim: true, maxlength: 500, default: "" },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    resetTokenHash: { type: String, select: false },
    resetTokenExpires: { type: Date, select: false },
    contact: { type: contactSchema, default: () => ({}) },
    addresses: { type: [addressSchema], default: [] },
  },
  { timestamps: true }
);

userSchema.methods.toPublic = function toPublic() {
  const contact = this.contact || {};
  return {
    id: this._id.toString(),
    name: this.name,
    email: this.email,
    contact: {
      phone: contact.phone || "",
      alternatePhone: contact.alternatePhone || "",
      organization: contact.organization || "",
      jobTitle: contact.jobTitle || "",
      website: contact.website || "",
      bio: contact.bio || "",
    },
    addresses: (this.addresses || []).map((a) => ({
      id: a._id.toString(),
      label: a.label,
      fullName: a.fullName,
      line1: a.line1,
      line2: a.line2,
      city: a.city,
      state: a.state,
      postalCode: a.postalCode,
      country: a.country,
      phone: a.phone,
      isDefault: a.isDefault,
      createdAt: a.createdAt,
      updatedAt: a.updatedAt,
    })),
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

module.exports = mongoose.models.User || mongoose.model("User", userSchema);
