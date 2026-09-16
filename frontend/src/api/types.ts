/**
 * Types mirror the actual Express responses (backend/src/controllers/*.js)
 * and the pipeline payload in data/web/pipeline_results.json.
 * Field names are copied verbatim — including the snake_case keys that the
 * Python wedding-season dict carries through untouched.
 */

export type DatasetKey = "global" | "india";

export interface DatasetMeta {
  dataset: DatasetKey;
  source: string;
  currency: string;
  frequency: string;
  priceColumn: string;
  startDate: string;
  endDate: string;
  observations: number;
  latestPrice: number;
  latestDate: string;
}

export interface PricePoint {
  date: string;
  price: number;
  /** Present only after the moving-average window fills (12 mo global, 6 mo India). */
  movingAverage?: number;
}

export interface YearlyPoint {
  year: number;
  averagePrice: number;
}

export interface MonthlyPoint {
  month: number;
  monthName: string;
  averagePrice: number;
  isWeddingSeasonMonth: boolean;
}

export interface ComparisonRow {
  model: string;
  r2: number;
  rmse: number;
}

/* ---------- auth ---------- */

export interface User {
  id: string;
  name: string;
  email: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

/* ---------- /api/overview ---------- */

export interface OverviewResponse {
  disclaimer: string;
  forecastHorizonMonths: number;
  datasets: Record<DatasetKey, DatasetMeta>;
  winners: Record<DatasetKey, string>;
  metrics: Record<DatasetKey, ComparisonRow[]>;
}

/* ---------- /api/gold/:dataset ---------- */

export interface GoldSeriesResponse {
  dataset: DatasetMeta;
  series: Array<{ date: string; price: number }>;
}

/* ---------- /api/analysis/:dataset ---------- */

export interface AnalysisResponse {
  dataset: DatasetMeta;
  historical: PricePoint[];
  yearly: YearlyPoint[];
  monthly: MonthlyPoint[];
}

/* ---------- /api/seasonality/:dataset ---------- */

/** Python's wedding_season_check() dict, serialized as-is, plus added keys. */
export interface WeddingSeason {
  wedding_season_avg: number;
  other_months_avg: number;
  difference_pct: number;
  top_3_months_overall: number[];
  wedding_months_in_top_3: number[];
  weddingSeasonMonths: number[];
  conclusion: string;
  caveat: string;
}

export interface SeasonalityResponse {
  dataset: DatasetMeta;
  monthly: MonthlyPoint[];
  /** null for the global series — the wedding-season check is India-only. */
  weddingSeason: WeddingSeason | null;
}

/* ---------- /api/stationarity/:dataset ---------- */

export interface AdfResult {
  label: string;
  d: number;
  adfStatistic: number;
  pValue: number;
  isStationary: boolean;
  criticalValues: Record<string, number>;
}

export interface CorrelationPoint {
  lag: number;
  value: number;
}

export interface StationarityResponse {
  dataset: DatasetMeta;
  logNeeded: boolean;
  seriesUsed: string;
  differencingOrder: number;
  rawHistory: AdfResult[];
  /** null when the log-transform check was skipped. */
  logHistory: AdfResult[] | null;
  acf: CorrelationPoint[];
  pacf: CorrelationPoint[];
  explanation: string;
}

/* ---------- /api/models/:dataset ---------- */

export interface ActualVsPredicted {
  date: string;
  actual: number;
  predicted: number;
}

export interface RegressionModel {
  name: string;
  r2: number;
  rmse: number;
  features: string[];
  explanation: string;
  actualVsPredicted: ActualVsPredicted[];
}

export interface SarimaModel {
  name: string;
  label: string;
  order: number[];
  seasonalOrder: number[];
  r2: number;
  rmse: number;
  explanation: string;
  actualVsPredicted: ActualVsPredicted[];
}

export interface ModelsResponse {
  dataset: DatasetMeta;
  winner: string;
  regression: RegressionModel;
  sarima: SarimaModel;
  comparison: ComparisonRow[];
}

/* ---------- /api/forecast/:dataset ---------- */

export interface ForecastPoint {
  date: string;
  predictedPrice: number;
  lowerBound: number;
  upperBound: number;
}

export interface ForecastResponse {
  dataset: DatasetMeta;
  historical: Array<{ date: string; price: number }>;
  model: string;
  horizonMonths: number;
  hasBounds: boolean;
  boundNote: string;
  points: ForecastPoint[];
  disclaimer: string;
  forecastModelNote: string;
}
