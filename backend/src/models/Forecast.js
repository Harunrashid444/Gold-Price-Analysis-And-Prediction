const mongoose = require("mongoose");

const forecastSchema = new mongoose.Schema(
  {
    dataset: { type: String, enum: ["global", "india"], required: true },
    model: { type: String, required: true },
    date: { type: Date, required: true },
    predictedPrice: { type: Number, required: true },
    lowerBound: { type: Number },
    upperBound: { type: Number },
  },
  { timestamps: false }
);

forecastSchema.index({ dataset: 1, date: 1 }, { unique: true });

module.exports = mongoose.models.Forecast || mongoose.model("Forecast", forecastSchema, "forecasts");
