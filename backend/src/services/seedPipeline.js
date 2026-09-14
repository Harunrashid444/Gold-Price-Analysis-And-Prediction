const GoldPrice = require("../models/GoldPrice");
const ModelResult = require("../models/ModelResult");
const Forecast = require("../models/Forecast");
const { loadPipelineResults } = require("./pipelineData");

async function seedPipelineCollections(dbMode) {
  if (dbMode !== "mongo") {
    return;
  }

  const results = loadPipelineResults();
  const datasets = ["global", "india"];

  for (const dataset of datasets) {
    const meta = results.datasets[dataset];
    const historical = results.analysis[dataset].historical;
    const prices = historical.map((row) => ({
      dataset,
      date: row.date,
      price: row.price,
      currency: meta.currency,
    }));

    await GoldPrice.deleteMany({ dataset });
    if (prices.length) {
      await GoldPrice.insertMany(prices);
    }

    const comparison = results.models[dataset].comparison;
    await ModelResult.deleteMany({ dataset });
    await ModelResult.insertMany(
      comparison.map((row) => ({
        dataset,
        model: row.model,
        r2: row.r2,
        rmse: row.rmse,
        evaluatedAt: new Date(),
      }))
    );

    const forecast = results.forecast[dataset];
    await Forecast.deleteMany({ dataset });
    await Forecast.insertMany(
      forecast.points.map((row) => ({
        dataset,
        model: forecast.model,
        date: row.date,
        predictedPrice: row.predictedPrice,
        lowerBound: row.lowerBound,
        upperBound: row.upperBound,
      }))
    );
  }

  console.log("Seeded MongoDB collections from Python pipeline results.");
}

module.exports = { seedPipelineCollections };
