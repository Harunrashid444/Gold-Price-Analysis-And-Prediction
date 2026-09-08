"""
Web-layer export for the existing academic pipeline.

Does NOT reimplement regression, SARIMA, ADF, or forecasting.
It imports the existing Phase 2–7 functions, serializes their outputs to JSON,
and writes CSV-friendly copies under data/web/ for the Node/Express API.

Run from the project root:
    python export_web_results.py
"""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import pandas as pd
from statsmodels.tsa.stattools import acf, pacf

from src.analysis import WEDDING_SEASON_MONTHS, monthly_average, run_phase2, yearly_average, add_time_parts
from src.prepare_data import prepare_global_gold, prepare_indian_gold
from src.stationarity import run_phase3
from src.evaluation import run_phase6
from src.forecast import FORECAST_HORIZON, run_phase7

BASE_DIR = Path(__file__).resolve().parent
PROCESSED_DIR = BASE_DIR / "data" / "processed"
WEB_DIR = BASE_DIR / "data" / "web"
WEB_DIR.mkdir(parents=True, exist_ok=True)


def _to_native(value):
    if isinstance(value, dict):
        return {str(k): _to_native(v) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [_to_native(v) for v in value]
    if isinstance(value, np.generic):
        return value.item()
    if isinstance(value, np.ndarray):
        return [_to_native(v) for v in value.tolist()]
    if isinstance(value, pd.Timestamp):
        return value.strftime("%Y-%m-%d")
    if isinstance(value, (float, int, np.floating, np.integer)) and pd.isna(value):
        return None
    if hasattr(value, "item") and not isinstance(value, (bytes, str, dict, list)):
        try:
            return value.item()
        except Exception:
            return value
    return value


def series_points(df: pd.DataFrame, date_col: str, price_col: str, ma_window: int | None = None):
    out = []
    ma = df[price_col].rolling(window=ma_window).mean() if ma_window else None
    for i, row in df.iterrows():
        point = {
            "date": pd.Timestamp(row[date_col]).strftime("%Y-%m-%d"),
            "price": round(float(row[price_col]), 2),
        }
        if ma is not None and pd.notna(ma.iloc[i]):
            point["movingAverage"] = round(float(ma.iloc[i]), 2)
        out.append(point)
    return out


def monthly_points(monthly_avg: pd.Series):
    month_names = [
        "Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ]
    points = []
    for month, value in monthly_avg.items():
        m = int(month)
        points.append({
            "month": m,
            "monthName": month_names[m - 1],
            "averagePrice": round(float(value), 2),
            "isWeddingSeasonMonth": m in WEDDING_SEASON_MONTHS,
        })
    return points


def yearly_points(yearly: pd.Series):
    return [{"year": int(year), "averagePrice": round(float(value), 2)} for year, value in yearly.items()]


def serialize_adf_history(history):
    rows = []
    for item in history or []:
        crit = item.get("critical_values") or {}
        if hasattr(crit, "items"):
            crit = {str(k): float(v) for k, v in crit.items()}
        rows.append({
            "label": item.get("label"),
            "d": int(item.get("d", 0)),
            "adfStatistic": float(item["adf_statistic"]),
            "pValue": float(item["p_value"]),
            "isStationary": bool(item["is_stationary"]),
            "criticalValues": crit,
        })
    return rows


def correlation_points(series: pd.Series, kind: str, lags: int = 24):
    clean = series.dropna()
    n_lags = min(lags, max(1, len(clean) // 2 - 1))
    if kind == "acf":
        values = acf(clean, nlags=n_lags, fft=True)
    else:
        values = pacf(clean, nlags=n_lags, method="ywm")
    return [{"lag": int(i), "value": round(float(v), 4)} for i, v in enumerate(values)]


def actual_vs_predicted(dates, actual, predicted):
    rows = []
    for date, act, pred in zip(dates, actual, predicted):
        rows.append({
            "date": pd.Timestamp(date).strftime("%Y-%m-%d"),
            "actual": round(float(act), 2),
            "predicted": round(float(pred), 2),
        })
    return rows


def forecast_rows(table: pd.DataFrame):
    rows = []
    for _, row in table.iterrows():
        rows.append({
            "date": pd.Timestamp(row["Date"]).strftime("%Y-%m-%d"),
            "predictedPrice": float(row["Predicted Price"]),
            "lowerBound": float(row["Lower Bound"]),
            "upperBound": float(row["Upper Bound"]),
        })
    return rows


def dataset_meta(key: str, df: pd.DataFrame, price_col: str, currency: str, frequency: str, source: str):
    return {
        "dataset": key,
        "source": source,
        "currency": currency,
        "frequency": frequency,
        "priceColumn": price_col,
        "startDate": pd.Timestamp(df["Date"].min()).strftime("%Y-%m-%d"),
        "endDate": pd.Timestamp(df["Date"].max()).strftime("%Y-%m-%d"),
        "observations": int(len(df)),
        "latestPrice": round(float(df[price_col].iloc[-1]), 2),
        "latestDate": pd.Timestamp(df["Date"].iloc[-1]).strftime("%Y-%m-%d"),
    }


def main():
    print("Exporting existing pipeline results for the web application...")
    if not (PROCESSED_DIR / "global_gold_monthly.csv").exists():
        prepare_global_gold()
        prepare_indian_gold()

    global_df = pd.read_csv(PROCESSED_DIR / "global_gold_monthly.csv", parse_dates=["Date"])
    indian_df = pd.read_csv(PROCESSED_DIR / "indian_gold_monthly.csv", parse_dates=["Date"])

    phase2 = run_phase2()
    phase3 = run_phase3()
    phase6 = run_phase6()
    phase7 = run_phase7()

    global_feat = add_time_parts(global_df)
    indian_feat = add_time_parts(indian_df)

    payload = {
        "generatedBy": "export_web_results.py (wraps existing src/*.py; does not reimplement models)",
        "forecastHorizonMonths": FORECAST_HORIZON,
        "forecastModelNote": (
            "Phase 7 uses Multiple Regression for both series because Phase 6 found "
            "it had the lower test RMSE. Forecast bands are predicted +/- 1.96 * test RMSE "
            "(an approximate band, not a statistically rigorous prediction interval)."
        ),
        "disclaimer": (
            "Historical academic analysis only. Not real-time prices, not investment advice, "
            "and forecasts are not guaranteed."
        ),
        "datasets": {
            "global": dataset_meta(
                "global", global_df, "Price_USD", "USD", "Monthly",
                "World Gold Council (1978–2018)",
            ),
            "india": dataset_meta(
                "india", indian_df, "Price_INR", "INR", "Monthly",
                "Gold Price India (scraped daily, resampled to monthly mean, 2011–2018)",
            ),
        },
        "analysis": {
            "global": {
                "historical": series_points(global_df, "Date", "Price_USD", ma_window=12),
                "yearly": yearly_points(yearly_average(global_feat, "Price_USD")),
                "monthly": monthly_points(monthly_average(global_feat, "Price_USD")),
            },
            "india": {
                "historical": series_points(indian_df, "Date", "Price_INR", ma_window=6),
                "yearly": yearly_points(yearly_average(indian_feat, "Price_INR")),
                "monthly": monthly_points(monthly_average(indian_feat, "Price_INR")),
            },
        },
        "seasonality": {
            "global": {
                "monthly": monthly_points(phase2["global_monthly_avg"]),
                "weddingSeason": None,
            },
            "india": {
                "monthly": monthly_points(phase2["indian_monthly_avg"]),
                "weddingSeason": {
                    **_to_native(phase2["wedding_result"]),
                    "weddingSeasonMonths": WEDDING_SEASON_MONTHS,
                    "conclusion": phase2["wedding_conclusion"],
                    "caveat": (
                        "Presented as an observed seasonal pattern only. "
                        "This does not claim that wedding season causes gold price changes."
                    ),
                },
            },
        },
        "stationarity": {},
        "models": {},
        "forecast": {},
    }

    for key, label in [("global", "global"), ("india", "indian")]:
        src_key = "global" if key == "global" else "indian"
        st = phase3[src_key]
        payload["stationarity"][key] = {
            "logNeeded": bool(st["log_needed"]),
            "seriesUsed": st["chosen_series_name"],
            "differencingOrder": int(st["chosen_d"]),
            "rawHistory": serialize_adf_history(st["raw_history"]),
            "logHistory": serialize_adf_history(st["log_history"]),
            "acf": correlation_points(st["chosen_final_series"], "acf"),
            "pacf": correlation_points(st["chosen_final_series"], "pacf"),
            "explanation": (
                "Stationarity indicates whether the statistical behavior of the series "
                "remains relatively stable over time."
            ),
        }

        reg = phase6["regression"][src_key]
        sar = phase6["sarima"][src_key]
        table = phase6["comparison"][src_key]["table"]
        winner = phase6["comparison"][src_key]["winner"]

        payload["models"][key] = {
            "winner": winner,
            "regression": {
                "name": "Multiple Regression",
                "r2": float(reg["r2"]),
                "rmse": float(reg["rmse"]),
                "features": reg["feature_cols"],
                "explanation": (
                    "Predicts the current month using lagged prices and moving averages "
                    "from prior months only. Evaluated with a chronological train/test split."
                ),
                "actualVsPredicted": actual_vs_predicted(
                    reg["test_df"]["Date"],
                    reg["test_df"]["Price_USD" if "Price_USD" in reg["test_df"].columns else "Price_INR"],
                    reg["predictions"],
                ),
            },
            "sarima": {
                "name": f"SARIMA ({sar['best']['label']})",
                "label": sar["best"]["label"],
                "order": list(sar["best"]["order"]),
                "seasonalOrder": list(sar["best"]["seasonal_order"]),
                "r2": float(sar["r2"]),
                "rmse": float(sar["rmse"]),
                "explanation": (
                    "Seasonal ARIMA candidate selected by lowest test RMSE. "
                    "Produces a multi-step forecast over the same test date range as regression."
                ),
                "actualVsPredicted": actual_vs_predicted(
                    sar["test_series"].index,
                    sar["test_series"].values,
                    sar["best"]["predicted_mean"].values,
                ),
            },
            "comparison": [
                {"model": row["Model"], "r2": float(row["R2"]), "rmse": float(row["RMSE"])}
                for _, row in table.iterrows()
            ],
        }

        forecast_key = "global_forecast" if key == "global" else "indian_forecast"
        payload["forecast"][key] = {
            "model": "Multiple Regression",
            "horizonMonths": FORECAST_HORIZON,
            "hasBounds": True,
            "boundNote": "Approximate band: predicted ± 1.96 × Phase 4 test RMSE.",
            "points": forecast_rows(phase7[forecast_key]),
        }

    out_path = WEB_DIR / "pipeline_results.json"
    out_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print("Wrote", out_path)
    return out_path


if __name__ == "__main__":
    main()
