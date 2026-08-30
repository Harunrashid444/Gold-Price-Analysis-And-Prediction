"""
Phase 4 - Multiple Regression
Gold Price Analysis and Prediction using Time Series Modeling (MCA Mini Project)

Scope (per synopsis only):
    - Apply Multiple Regression to predict Gold price.

Approach:
    Predict the current month's price using simple, easily-explainable
    historical-price features (lags and moving averages). All features use
    ONLY information available before the month being predicted, so there is
    no future-data leakage. The train/test split is chronological (older
    data -> train, later data -> test) because this is time-series data and
    must not be shuffled.

This script uses ONLY the processed monthly datasets from Phase 1:
    data/processed/global_gold_monthly.csv
    data/processed/indian_gold_monthly.csv

No SARIMA, model comparison, or forecasting happens here.
"""

import pandas as pd
import matplotlib.pyplot as plt
from pathlib import Path
from sklearn.linear_model import LinearRegression
from sklearn.metrics import r2_score, mean_squared_error

BASE_DIR = Path(__file__).resolve().parent.parent
PROCESSED_DIR = BASE_DIR / "data" / "processed"
PLOTS_DIR = BASE_DIR / "plots"
PLOTS_DIR.mkdir(exist_ok=True)

TRAIN_FRACTION = 0.8  # chronological split: first 80% of months = train, last 20% = test


def load_data():
    global_df = pd.read_csv(PROCESSED_DIR / "global_gold_monthly.csv", parse_dates=["Date"])
    indian_df = pd.read_csv(PROCESSED_DIR / "indian_gold_monthly.csv", parse_dates=["Date"])
    return global_df, indian_df


def build_features(df, date_col, price_col):
    """
    Create lag/rolling features using only past information (each feature is
    shifted by at least 1 month so the current month's actual price is never
    used to predict itself). Rows made invalid by lagging (the first 12 rows,
    because of the 12-month moving average) are dropped.
    """
    df = df[[date_col, price_col]].sort_values(date_col).reset_index(drop=True).copy()

    df["lag_1"] = df[price_col].shift(1)
    df["lag_2"] = df[price_col].shift(2)
    df["ma_3"] = df[price_col].shift(1).rolling(window=3).mean()
    df["ma_12"] = df[price_col].shift(1).rolling(window=12).mean()

    feature_cols = ["lag_1", "lag_2", "ma_3", "ma_12"]
    df_clean = df.dropna(subset=feature_cols).reset_index(drop=True)

    return df_clean, feature_cols


def chronological_split(df, train_fraction=TRAIN_FRACTION):
    """Split a time-ordered dataframe into train/test without shuffling."""
    split_idx = int(len(df) * train_fraction)
    train_df = df.iloc[:split_idx].reset_index(drop=True)
    test_df = df.iloc[split_idx:].reset_index(drop=True)
    return train_df, test_df


def train_and_evaluate(train_df, test_df, feature_cols, price_col):
    X_train, y_train = train_df[feature_cols], train_df[price_col]
    X_test, y_test = test_df[feature_cols], test_df[price_col]

    model = LinearRegression()
    model.fit(X_train, y_train)

    predictions = model.predict(X_test)

    r2 = r2_score(y_test, predictions)
    rmse = mean_squared_error(y_test, predictions) ** 0.5

    return model, predictions, r2, rmse


def plot_actual_vs_predicted(test_df, date_col, price_col, predictions, title, filename):
    plt.figure(figsize=(10, 5))
    plt.plot(test_df[date_col], test_df[price_col], label="Actual", color="steelblue", marker="o")
    plt.plot(test_df[date_col], predictions, label="Predicted", color="firebrick",
              marker="x", linestyle="--")
    plt.title(title)
    plt.xlabel("Date")
    plt.ylabel(price_col)
    plt.legend()
    plt.tight_layout()
    plt.savefig(PLOTS_DIR / filename)
    plt.close()


def run_regression_for(df, date_col, price_col, name, plot_prefix):
    print("\n" + "=" * 60)
    print(f"MULTIPLE REGRESSION: {name}")
    print("=" * 60)

    df_clean, feature_cols = build_features(df, date_col, price_col)
    print(f"Rows after feature creation (12-month MA drops first 12 rows): {len(df_clean)}")

    train_df, test_df = chronological_split(df_clean)
    print(f"Train rows: {len(train_df)} ({train_df[date_col].min().date()} to "
          f"{train_df[date_col].max().date()})")
    print(f"Test rows: {len(test_df)} ({test_df[date_col].min().date()} to "
          f"{test_df[date_col].max().date()})")

    model, predictions, r2, rmse = train_and_evaluate(train_df, test_df, feature_cols, price_col)

    print(f"\nFeature coefficients:")
    for feat, coef in zip(feature_cols, model.coef_):
        print(f"  {feat}: {coef:.4f}")
    print(f"  intercept: {model.intercept_:.4f}")

    print(f"\nTest R^2  : {r2:.4f}")
    print(f"Test RMSE : {rmse:.4f}")

    plot_actual_vs_predicted(test_df, date_col, price_col, predictions,
                              f"{name} - Multiple Regression: Actual vs Predicted (test set)",
                              f"{plot_prefix}_regression_actual_vs_predicted.png")

    return {
        "name": name,
        "model": model,
        "feature_cols": feature_cols,
        "train_df": train_df,
        "test_df": test_df,
        "predictions": predictions,
        "r2": r2,
        "rmse": rmse,
    }


def run_phase4():
    global_df, indian_df = load_data()

    global_result = run_regression_for(global_df, "Date", "Price_USD",
                                        "Global Gold (USD)", "global")
    indian_result = run_regression_for(indian_df, "Date", "Price_INR",
                                        "Indian Gold (INR)", "indian")

    print("\nPhase 4 complete. Plots saved to:", PLOTS_DIR)
    return {
        "global": global_result,
        "indian": indian_result,
    }


if __name__ == "__main__":
    run_phase4()
