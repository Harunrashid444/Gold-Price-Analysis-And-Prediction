const fs = require("fs");
const path = require("path");

const RESULTS_PATH = path.join(__dirname, "../../../data/web/pipeline_results.json");

let cache = null;

const VALID_DATASETS = ["global", "india", "indian"];

function loadPipelineResults() {
  if (cache) return cache;
  if (!fs.existsSync(RESULTS_PATH)) {
    throw new Error(
      "Missing data/web/pipeline_results.json. Run `python export_web_results.py` from the project root first."
    );
  }
  cache = JSON.parse(fs.readFileSync(RESULTS_PATH, "utf8"));
  return cache;
}

function datasetOrThrow(key) {
  if (!key || !VALID_DATASETS.includes(key.toLowerCase())) {
    const { HttpError } = require("../middleware/errorHandler");
    throw new HttpError(404, `Unknown dataset: ${key}. Valid datasets are: global, india`);
  }
  const data = loadPipelineResults();
  const mapped = key === "india" || key === "indian" ? "india" : "global";
  return { data, key: mapped };
}

module.exports = { loadPipelineResults, datasetOrThrow, RESULTS_PATH };

