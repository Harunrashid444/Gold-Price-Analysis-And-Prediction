const mongoose = require("mongoose");

const goldPriceSchema = new mongoose.Schema(
  {
    dataset: { type: String, enum: ["global", "india"], required: true, index: true },
    date: { type: Date, required: true },
    price: { type: Number, required: true },
    currency: { type: String, required: true },
  },
  { timestamps: false }
);

goldPriceSchema.index({ dataset: 1, date: 1 }, { unique: true });

module.exports = mongoose.models.GoldPrice || mongoose.model("GoldPrice", goldPriceSchema, "gold_prices");
