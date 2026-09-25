import type { DatasetKey } from "../api/types";

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** Dates from the pipeline are plain "YYYY-MM-DD" — parse them as calendar
 *  dates, not UTC instants, so a timezone can't shift a month backwards. */
function parts(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return { y, m, d };
}

export function formatMonth(iso: string): string {
  const { y, m } = parts(iso);
  return `${MONTHS[m - 1]} ${y}`;
}

export function formatShortMonth(iso: string): string {
  const { y, m } = parts(iso);
  return `${MONTHS[m - 1]} ’${String(y).slice(2)}`;
}

export function formatYear(iso: string): string {
  return String(parts(iso).y);
}

export function formatLongDate(iso: string): string {
  const { y, m, d } = parts(iso);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

export function monthName(month: number): string {
  return MONTHS[month - 1] ?? String(month);
}

const CURRENCY_SYMBOL: Record<string, string> = { USD: "$", INR: "₹" };

export function currencySymbol(currency: string): string {
  return CURRENCY_SYMBOL[currency] ?? "";
}

/** Compact axis labels: 1201.3 -> "1,201", 3130.25 -> "3,130". */
export function formatAxisPrice(value: number): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);
}

export function formatPrice(value: number, currency?: string): string {
  const num = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
  return currency ? `${currencySymbol(currency)}${num}` : num;
}

/** Metrics keep 4 decimals to match how the Python phases print them. */
export function formatMetric(value: number, digits = 4): string {
  return value.toFixed(digits);
}

export function formatPercent(value: number, digits = 2): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(digits)}%`;
}

/** p-values can be ~1.7e-12; show those in scientific form rather than "0.0000". */
export function formatPValue(value: number): string {
  if (value === 0) return "0";
  if (value < 0.0001) return value.toExponential(2);
  return value.toFixed(4);
}

export const DATASET_LABEL: Record<DatasetKey, string> = {
  global: "Global",
  india: "India",
};

export const DATASET_FULL_LABEL: Record<DatasetKey, string> = {
  global: "Global Gold (USD)",
  india: "Indian Gold (INR)",
};

/** Series colour per market: sober slate for global, brass for India. */
export const DATASET_COLOR: Record<DatasetKey, string> = {
  global: "#35505f",
  india: "#9a7b2f",
};
