"""
Phase 7 - Future Gold Price Prediction
Gold Price Analysis and Prediction using Time Series Modeling (MCA Mini Project)

Scope (per synopsis only):
    - Build a model that can predict future Gold prices.

Per Phase 6's ACTUAL test results, Multiple Regression had the lower test
RMSE for BOTH series (Global and Indian) - so Multiple Regression is the
model used here. This was not decided in advance; it is simply what Phase 6
found.

Since future months have no real lagged/rolling price data yet, forecasting
is done RECURSIVELY: predict the next month, then feed that prediction back
in as if it were the latest known price to build the features for the month
after that, and so on for the forecast horizon. This is a standard, simple
way to extend a lag-feature regression model into the future.

The final model here is refit on the FULL historical dataset (not just the
Phase 4 training split), since we are no longer evaluating accuracy - we are
producing the best available forecast from all the data we have. Phase 4's
test RMSE is reused (not recomputed differently) to build a simple, clearly
approximate confidence band around each forecast: predicted +/- 1.96 * test
RMSE. This is NOT a statistically rigorous prediction interval - it is a
simple, explainable approximation appropriate for an MCA mini-project.

No API, dashboard, live data, or database is created here - just a forecast
table and a plot.
"""

import pandas as pd
import matplotlib.pyplot as plt
from pathlib import Path
from sklearn.linear_model import LinearRegression

from src.regression import load_data, build_features, run_phase4

BASE_DIR = Path(__file__).resolve().parent.parent
PLOTS_DIR = BASE_DIR / "plots"
PLOTS_DIR.mkdir(exist_ok=True)

FORECAST_HORIZON = 12  # months
CI_Z = 1.96  # ~95% band width multiplier, applied to test RMSE (see note above)


def fit_final_model(df, date_col, price_col):
    """Refit Multiple Regression on ALL available historical data."""
    df_clean, feature_cols = build_features(df, date_col, price_col)
    X, y = df_clean[feature_cols], df_clean[price_col]

    model = LinearRegression()
    model.fit(X, y)
    return model, feature_cols


def recursive_forecast(df, date_col, price_col, model, feature_cols, horizon, rmse):
    """
    Recursively forecast `horizon` future months beyond the last available
    date, feeding each prediction back in to build the next month's
    lag/rolling features.
    """
    df_sorted = df[[date_col, price_col]].sort_values(date_col).reset_index(drop=True)
    history = df_sorted[price_col].tolist()  # will grow with predictions
    last_date = df_sorted[date_col].max()

    records = []
    for step in range(1, horizon + 1):
        lag_1 = history[-1]
        lag_2 = history[-2]
        ma_3 = sum(history[-3:]) / 3
        ma_12 = sum(history[-12:]) / 12

        features = pd.DataFrame([{
            "lag_1": lag_1, "lag_2": lag_2, "ma_3": ma_3, "ma_12": ma_12
        }])[feature_cols]

        predicted_price = model.predict(features)[0]
        history.append(predicted_price)

        future_date = last_date + pd.DateOffset(months=step)
        records.append({
            "Date": future_date,
            "Predicted Price": round(predicted_price, 2),
            "Lower Bound": round(predicted_price - CI_Z * rmse, 2),
            "Upper Bound": round(predicted_price + CI_Z * rmse, 2),
        })

    return pd.DataFrame(records)


def plot_forecast(df, date_col, price_col, forecast_table, name, filename):
    plt.figure(figsize=(11, 5))
    plt.plot(df[date_col], df[price_col], label="Historical", color="steelblue")
    plt.plot(forecast_table["Date"], forecast_table["Predicted Price"],
              label=f"{len(forecast_table)}-month forecast", color="firebrick", marker="o")
    plt.fill_between(forecast_table["Date"], forecast_table["Lower Bound"],
                      forecast_table["Upper Bound"], color="firebrick", alpha=0.2,
                      label="Approx. confidence band (+/- 1.96 x test RMSE)")
    plt.title(f"{name} - Future Gold Price Forecast ({len(forecast_table)} months)")
    plt.xlabel("Date")
    plt.ylabel(price_col)
    plt.legend()
    plt.tight_layout()
    plt.savefig(PLOTS_DIR / filename)
    plt.close()


def run_forecast_for(df, date_col, price_col, name, plot_prefix, rmse, horizon=FORECAST_HORIZON):
    print("\n" + "=" * 60)
    print(f"FUTURE FORECAST: {name}")
    print("=" * 60)

    model, feature_cols = fit_final_model(df, date_col, price_col)
    forecast_table = recursive_forecast(df, date_col, price_col, model, feature_cols,
                                         horizon, rmse)

    print(f"\n{horizon}-month forecast (approx. band = predicted +/- {CI_Z} x test RMSE "
          f"of {rmse:.2f}):")
    print(forecast_table.to_string(index=False))

    plot_forecast(df, date_col, price_col, forecast_table, name,
                  f"{plot_prefix}_future_forecast.png")

    return forecast_table


def run_phase7():
    print("Gathering Phase 4/6 results to confirm the selected model and its test RMSE...")
    regression_all = run_phase4()

    global_df, indian_df = load_data()

    global_forecast = run_forecast_for(
        global_df, "Date", "Price_USD", "Global Gold (USD)", "global",
        rmse=regression_all["global"]["rmse"]
    )
    indian_forecast = run_forecast_for(
        indian_df, "Date", "Price_INR", "Indian Gold (INR)", "indian",
        rmse=regression_all["indian"]["rmse"]
    )

    print("\nPhase 7 complete. Forecast plots saved to:", PLOTS_DIR)
    return {
        "global_forecast": global_forecast,
        "indian_forecast": indian_forecast,
    }


if __name__ == "__main__":
    run_phase7()
