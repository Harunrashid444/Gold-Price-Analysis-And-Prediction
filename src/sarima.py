"""
Phase 5 - SARIMA
Gold Price Analysis and Prediction using Time Series Modeling (MCA Mini Project)

Scope (per synopsis only):
    - Apply SARIMA to Gold price data.

Candidate selection is based on our OWN Phase 3 stationarity/ACF/PACF results,
not copied from the old reference repository:

    Global (Price_USD): ADF on the original series was non-stationary; one
        difference (d=1) was enough to reach stationarity. The differenced
        series' ACF/PACF both show a small spike at lag 1 and little else
        outside the confidence band, and no clear seasonal (lag-12) spike -
        so small AR(1)/MA(1) style candidates around d=1 are tried, with one
        seasonal candidate included to check whether yearly seasonality helps.

    Indian (Price_INR): ADF on the original series (d=0) was already
        stationary, but its PACF cuts off sharply after lag 1 (classic AR(1)
        signature) while its ACF decays slowly - a pattern more typical of a
        trending/non-stationary series. Because of that mismatch (noted as a
        caveat in Phase 3), both d=0 and d=1 AR(1)-based candidates are
        tried, plus one seasonal candidate given the synopsis's specific
        interest in Indian wedding-season seasonality.

Only a small number of candidate configurations are tried for each series
(no large grid search). For each candidate: fit on the training portion,
note AIC, forecast over the chronological test period, and score with R^2 /
RMSE. The candidate with the lowest test RMSE is selected - the result is
whatever the data actually shows, not assumed in advance.

The test period is aligned to the SAME dates used by Phase 4 (Multiple
Regression) - i.e. after the first 12 months (needed there for the 12-month
moving-average feature) - so Phase 6 can compare both models on an identical
test window.
"""

import warnings
import pandas as pd
import matplotlib.pyplot as plt
from pathlib import Path
from sklearn.metrics import r2_score, mean_squared_error
from statsmodels.tsa.statespace.sarimax import SARIMAX

BASE_DIR = Path(__file__).resolve().parent.parent
PROCESSED_DIR = BASE_DIR / "data" / "processed"
PLOTS_DIR = BASE_DIR / "plots"
PLOTS_DIR.mkdir(exist_ok=True)

TRAIN_FRACTION = 0.8   # same fraction used in Phase 4
FEATURE_WARMUP = 12    # same warm-up (12-month MA) used in Phase 4, for date alignment
FORECAST_HORIZON_DIAGNOSTIC = 12  # months, simple diagnostic forecast (see note at bottom)

# Small, ACF/PACF-informed candidate sets (order, seasonal_order)
GLOBAL_CANDIDATES = [
    ("ARIMA(1,1,0)", (1, 1, 0), (0, 0, 0, 12)),
    ("ARIMA(0,1,1)", (0, 1, 1), (0, 0, 0, 12)),
    ("ARIMA(1,1,1)", (1, 1, 1), (0, 0, 0, 12)),
    ("SARIMA(1,1,1)(1,0,0,12)", (1, 1, 1), (1, 0, 0, 12)),
]

INDIAN_CANDIDATES = [
    ("AR(1), d=0", (1, 0, 0), (0, 0, 0, 12)),
    ("ARIMA(1,1,0)", (1, 1, 0), (0, 0, 0, 12)),
    ("ARIMA(1,1,1)", (1, 1, 1), (0, 0, 0, 12)),
    ("SARIMA(1,0,0)(1,0,0,12)", (1, 0, 0), (1, 0, 0, 12)),
]


def load_data():
    global_df = pd.read_csv(PROCESSED_DIR / "global_gold_monthly.csv", parse_dates=["Date"])
    indian_df = pd.read_csv(PROCESSED_DIR / "indian_gold_monthly.csv", parse_dates=["Date"])
    return global_df, indian_df


def get_test_start_date(df, date_col, train_fraction=TRAIN_FRACTION, warmup=FEATURE_WARMUP):
    """
    Determine the test start date the same way Phase 4 does (drop the first
    `warmup` rows, then take an 80/20 chronological split), so SARIMA is
    evaluated on the identical test window as the regression model. SARIMA
    itself does not need the warm-up rows dropped from its own training data
    - it can use the full available history - only the TEST split date is
    aligned here.
    """
    df_valid = df.iloc[warmup:].reset_index(drop=True)
    split_idx = int(len(df_valid) * train_fraction)
    return df_valid.iloc[split_idx][date_col]


def chronological_split_series(df, date_col, price_col, test_start_date):
    series = df.set_index(date_col)[price_col].sort_index()
    # Explicitly set the monthly frequency on the index - statsmodels' state
    # space models need a defined freq to build forecast indices correctly.
    series = series.asfreq(pd.infer_freq(series.index) or "ME")
    train_series = series[series.index < test_start_date]
    test_series = series[series.index >= test_start_date]
    return train_series, test_series


def fit_and_score(train_series, test_series, order, seasonal_order):
    """Fit one SARIMA candidate and score it on the chronological test set."""
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        model = SARIMAX(train_series, order=order, seasonal_order=seasonal_order,
                         enforce_stationarity=False, enforce_invertibility=False)
        fit = model.fit(disp=False)

        forecast = fit.get_forecast(steps=len(test_series))
        predicted_mean = forecast.predicted_mean
        predicted_mean.index = test_series.index  # align index for scoring/plotting

    r2 = r2_score(test_series, predicted_mean)
    rmse = mean_squared_error(test_series, predicted_mean) ** 0.5

    return {
        "fit": fit,
        "aic": fit.aic,
        "predicted_mean": predicted_mean,
        "conf_int": forecast.conf_int(),
        "r2": r2,
        "rmse": rmse,
    }


def select_best_candidate(train_series, test_series, candidates, name):
    print(f"\nTrying {len(candidates)} candidate SARIMA configurations for {name} "
          f"(train={len(train_series)} obs, test={len(test_series)} obs):")

    results = []
    for label, order, seasonal_order in candidates:
        try:
            scored = fit_and_score(train_series, test_series, order, seasonal_order)
            results.append({"label": label, "order": order,
                             "seasonal_order": seasonal_order, **scored})
            print(f"  {label:28s} AIC={scored['aic']:10.2f}  "
                  f"Test R^2={scored['r2']:.4f}  Test RMSE={scored['rmse']:.4f}")
        except Exception as exc:
            print(f"  {label:28s} FAILED to fit ({exc})")

    if not results:
        raise RuntimeError(f"No SARIMA candidate could be fit for {name}.")

    best = min(results, key=lambda r: r["rmse"])
    print(f"\nSelected for {name}: {best['label']} "
          f"(order={best['order']}, seasonal_order={best['seasonal_order']}) "
          f"- lowest test RMSE = {best['rmse']:.4f}")
    return best, results


def plot_actual_vs_predicted(test_series, predicted_mean, title, filename):
    plt.figure(figsize=(10, 5))
    plt.plot(test_series.index, test_series.values, label="Actual", color="steelblue", marker="o")
    plt.plot(predicted_mean.index, predicted_mean.values, label="Predicted (SARIMA)",
              color="firebrick", marker="x", linestyle="--")
    plt.title(title)
    plt.xlabel("Date")
    plt.ylabel("Price")
    plt.legend()
    plt.tight_layout()
    plt.savefig(PLOTS_DIR / filename)
    plt.close()


def diagnostic_future_forecast(full_series, order, seasonal_order, name, plot_prefix,
                                horizon=FORECAST_HORIZON_DIAGNOSTIC):
    """
    Simple diagnostic: refit the selected configuration on the FULL series
    and forecast a short horizon beyond the end of the data, with confidence
    intervals. This is only a quick sanity check of the chosen SARIMA
    configuration for this phase - the official, comparison-driven future
    forecast (using whichever model wins Phase 6) is produced separately in
    Phase 7.
    """
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        model = SARIMAX(full_series, order=order, seasonal_order=seasonal_order,
                         enforce_stationarity=False, enforce_invertibility=False)
        fit = model.fit(disp=False)
        forecast = fit.get_forecast(steps=horizon)
        predicted_mean = forecast.predicted_mean
        conf_int = forecast.conf_int()

    plt.figure(figsize=(11, 5))
    plt.plot(full_series.index, full_series.values, label="Historical", color="steelblue")
    plt.plot(predicted_mean.index, predicted_mean.values, label=f"{horizon}-month forecast",
              color="firebrick")
    plt.fill_between(predicted_mean.index, conf_int.iloc[:, 0], conf_int.iloc[:, 1],
                      color="firebrick", alpha=0.2, label="Confidence interval")
    plt.title(f"{name} - SARIMA diagnostic forecast ({horizon} months beyond available data)")
    plt.xlabel("Date")
    plt.ylabel("Price")
    plt.legend()
    plt.tight_layout()
    plt.savefig(PLOTS_DIR / f"{plot_prefix}_sarima_diagnostic_forecast.png")
    plt.close()

    return predicted_mean, conf_int


def run_sarima_for(df, date_col, price_col, name, plot_prefix, candidates):
    print("\n" + "=" * 60)
    print(f"SARIMA: {name}")
    print("=" * 60)

    test_start_date = get_test_start_date(df, date_col)
    train_series, test_series = chronological_split_series(df, date_col, price_col, test_start_date)
    print(f"Test period aligned with Phase 4: {test_series.index.min().date()} to "
          f"{test_series.index.max().date()} ({len(test_series)} months)")

    best, all_results = select_best_candidate(train_series, test_series, candidates, name)

    plot_actual_vs_predicted(
        test_series, best["predicted_mean"],
        f"{name} - SARIMA {best['label']}: Actual vs Predicted (test set)",
        f"{plot_prefix}_sarima_actual_vs_predicted.png"
    )

    full_series = pd.concat([train_series, test_series]).sort_index()
    diagnostic_future_forecast(full_series, best["order"], best["seasonal_order"],
                                name, plot_prefix)

    return {
        "name": name,
        "test_series": test_series,
        "train_series": train_series,
        "best": best,
        "all_results": all_results,
        "r2": best["r2"],
        "rmse": best["rmse"],
    }


def run_phase5():
    global_df, indian_df = load_data()

    global_result = run_sarima_for(global_df, "Date", "Price_USD",
                                    "Global Gold (USD)", "global", GLOBAL_CANDIDATES)
    indian_result = run_sarima_for(indian_df, "Date", "Price_INR",
                                    "Indian Gold (INR)", "indian", INDIAN_CANDIDATES)

    print("\nPhase 5 complete. Plots saved to:", PLOTS_DIR)
    return {
        "global": global_result,
        "indian": indian_result,
    }


if __name__ == "__main__":
    run_phase5()
