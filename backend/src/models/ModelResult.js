const mongoose = require("mongoose");

const modelResultSchema = new mongoose.Schema(
  {
    dataset: { type: String, enum: ["global", "india"], required: true },
    model: { type: String, required: true },
    r2: { type: Number, required: true },
    rmse: { type: Number, required: true },
    evaluatedAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

modelResultSchema.index({ dataset: 1, model: 1 }, { unique: true });

module.exports =
  mongoose.models.ModelResult || mongoose.model("ModelResult", modelResultSchema, "model_results");
