const { datasetOrThrow, loadPipelineResults } = require("../services/pipelineData");
const { HttpError } = require("../middleware/errorHandler");

function goldSeries(req, res, next) {
  try {
    const { data, key } = datasetOrThrow(req.params.dataset);
    res.json({
      dataset: data.datasets[key],
      series: data.analysis[key].historical.map(({ date, price }) => ({ date, price })),
    });
  } catch (err) {
    next(err);
  }
}

function analysis(req, res, next) {
  try {
    const { data, key } = datasetOrThrow(req.params.dataset);
    res.json({
      dataset: data.datasets[key],
      historical: data.analysis[key].historical,
      yearly: data.analysis[key].yearly,
      monthly: data.analysis[key].monthly,
    });
  } catch (err) {
    next(err);
  }
}

function seasonality(req, res, next) {
  try {
    const { data, key } = datasetOrThrow(req.params.dataset);
    res.json({
      dataset: data.datasets[key],
      ...data.seasonality[key],
    });
  } catch (err) {
    next(err);
  }
}

function stationarity(req, res, next) {
  try {
    const { data, key } = datasetOrThrow(req.params.dataset);
    res.json({
      dataset: data.datasets[key],
      ...data.stationarity[key],
    });
  } catch (err) {
    next(err);
  }
}

function models(req, res, next) {
  try {
    const { data, key } = datasetOrThrow(req.params.dataset);
    res.json({
      dataset: data.datasets[key],
      ...data.models[key],
    });
  } catch (err) {
    next(err);
  }
}

function forecast(req, res, next) {
  try {
    const { data, key } = datasetOrThrow(req.params.dataset);
    res.json({
      dataset: data.datasets[key],
      historical: data.analysis[key].historical.map(({ date, price }) => ({ date, price })),
      ...data.forecast[key],
      disclaimer: data.disclaimer,
      forecastModelNote: data.forecastModelNote,
    });
  } catch (err) {
    next(err);
  }
}

function overview(req, res, next) {
  try {
    const data = loadPipelineResults();
    res.json({
      disclaimer: data.disclaimer,
      forecastHorizonMonths: data.forecastHorizonMonths,
      datasets: data.datasets,
      winners: {
        global: data.models.global.winner,
        india: data.models.india.winner,
      },
      metrics: {
        global: data.models.global.comparison,
        india: data.models.india.comparison,
      },
    });
  } catch (err) {
    next(new HttpError(500, err.message));
  }
}

module.exports = { goldSeries, analysis, seasonality, stationarity, models, forecast, overview };
