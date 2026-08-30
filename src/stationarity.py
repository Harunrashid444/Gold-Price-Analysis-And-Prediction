"""
Phase 3 - Stationarity Testing & ACF/PACF
Gold Price Analysis and Prediction using Time Series Modeling (MCA Mini Project)

Scope (per synopsis only):
    - Find out whether Gold price data is stationary or non-stationary.
    - Prepare the ACF/PACF information needed for the later SARIMA phase.

This script uses ONLY the processed monthly datasets from Phase 1:
    data/processed/global_gold_monthly.csv
    data/processed/indian_gold_monthly.csv

No regression, SARIMA fitting, or forecasting happens here. The differencing
order determined here (d) is simply reported for later use.
"""

import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from pathlib import Path
from statsmodels.tsa.stattools import adfuller
from statsmodels.graphics.tsaplots import plot_acf, plot_pacf

BASE_DIR = Path(__file__).resolve().parent.parent
PROCESSED_DIR = BASE_DIR / "data" / "processed"
PLOTS_DIR = BASE_DIR / "plots"
PLOTS_DIR.mkdir(exist_ok=True)

MAX_DIFFERENCING_ORDER = 2  # cap kept small and explainable for an MCA viva
SIGNIFICANCE_LEVEL = 0.05


def load_data():
    global_df = pd.read_csv(PROCESSED_DIR / "global_gold_monthly.csv", parse_dates=["Date"])
    indian_df = pd.read_csv(PROCESSED_DIR / "indian_gold_monthly.csv", parse_dates=["Date"])
    return global_df, indian_df


def run_adf(series, label):
    """Run the Augmented Dickey-Fuller test and return a small, readable summary."""
    series = series.dropna()
    stat, p_value, used_lag, n_obs, crit_values, _ = adfuller(series, autolag="AIC")
    is_stationary = p_value < SIGNIFICANCE_LEVEL

    print(f"  [{label}] ADF statistic = {stat:.4f}, p-value = {p_value:.4f}, "
          f"observations = {n_obs}")
    print(f"  [{label}] Critical values: "
          + ", ".join(f"{k}: {v:.3f}" for k, v in crit_values.items()))
    print(f"  [{label}] Conclusion: "
          + ("Stationary (reject H0 of a unit root)" if is_stationary
             else "Non-stationary (fail to reject H0 of a unit root)"))

    return {
        "label": label,
        "adf_statistic": stat,
        "p_value": p_value,
        "critical_values": crit_values,
        "is_stationary": is_stationary,
    }


def difference_until_stationary(series, base_label, max_order=MAX_DIFFERENCING_ORDER):
    """
    Repeatedly apply first-order differencing until the ADF test says the
    series is stationary, or until max_order is reached. Returns the full
    history of ADF results (one per differencing order tried) plus the
    order actually required and the final differenced series.
    """
    history = []
    current = series.copy()
    d = 0

    while True:
        result = run_adf(current, f"{base_label}, d={d}")
        result["d"] = d
        history.append(result)

        if result["is_stationary"] or d >= max_order:
            break

        current = current.diff()
        d += 1

    final_d = history[-1]["d"]
    final_series = current
    return history, final_d, final_series


def compare_log_vs_raw(series, name):
    """
    Check whether a log transform is actually needed, instead of applying it
    by default. Rule used: run the same "difference until stationary"
    procedure on the raw series and on the log series; only prefer the log
    version if it genuinely needs FEWER differences to become stationary.
    If both need the same number of differences, the raw series is kept
    (simpler, and log was not "actually needed").
    """
    print(f"\n--- {name}: checking raw price ---")
    raw_history, raw_d, raw_final = difference_until_stationary(series, "raw price")

    # Guard: log of non-positive prices is undefined - not expected for gold
    # prices, but checked explicitly rather than assumed away.
    if (series <= 0).any():
        print(f"\n{name}: series contains non-positive values, skipping log transform check.")
        return {
            "log_needed": False,
            "chosen_series_name": "original_price",
            "raw_history": raw_history,
            "log_history": None,
            "chosen_d": raw_d,
            "chosen_final_series": raw_final,
        }

    print(f"\n--- {name}: checking log price ---")
    log_series = np.log(series)
    log_history, log_d, log_final = difference_until_stationary(log_series, "log price")

    if log_d < raw_d:
        print(f"\n{name}: log transform reduces differencing order needed "
              f"({raw_d} -> {log_d}). Using log_price for ACF/PACF.")
        chosen_name = "log_price"
        chosen_d = log_d
        chosen_final = log_final
        log_needed = True
    else:
        print(f"\n{name}: log transform does not reduce differencing order needed "
              f"(raw d={raw_d}, log d={log_d}). Log transform not necessary; "
              f"using original_price.")
        chosen_name = "original_price"
        chosen_d = raw_d
        chosen_final = raw_final
        log_needed = False

    return {
        "log_needed": log_needed,
        "chosen_series_name": chosen_name,
        "raw_history": raw_history,
        "log_history": log_history,
        "chosen_d": chosen_d,
        "chosen_final_series": chosen_final,
    }


def plot_original_series(df, date_col, price_col, title, filename):
    plt.figure(figsize=(11, 5))
    plt.plot(df[date_col], df[price_col], color="steelblue")
    plt.title(title)
    plt.xlabel("Date")
    plt.ylabel(price_col)
    plt.tight_layout()
    plt.savefig(PLOTS_DIR / filename)
    plt.close()


def plot_acf_pacf(series, name_prefix, lags=24):
    """Generate and save ACF and PACF plots for the final (stationary) series."""
    series = series.dropna()

    fig, ax = plt.subplots(figsize=(9, 4))
    plot_acf(series, lags=min(lags, len(series) // 2 - 1), ax=ax)
    ax.set_title(f"ACF - {name_prefix}")
    plt.tight_layout()
    plt.savefig(PLOTS_DIR / f"{name_prefix}_acf.png")
    plt.close()

    fig, ax = plt.subplots(figsize=(9, 4))
    plot_pacf(series, lags=min(lags, len(series) // 2 - 1), ax=ax, method="ywm")
    ax.set_title(f"PACF - {name_prefix}")
    plt.tight_layout()
    plt.savefig(PLOTS_DIR / f"{name_prefix}_pacf.png")
    plt.close()


def analyze_series(df, date_col, price_col, name, plot_prefix):
    print("\n" + "=" * 60)
    print(f"STATIONARITY ANALYSIS: {name}")
    print("=" * 60)

    plot_original_series(df, date_col, price_col,
                          f"{name} - Original Series", f"{plot_prefix}_original.png")

    series = df.set_index(date_col)[price_col]
    comparison = compare_log_vs_raw(series, name)

    plot_acf_pacf(comparison["chosen_final_series"], plot_prefix)

    print(f"\n{name} SUMMARY: "
          f"series used = {comparison['chosen_series_name']}, "
          f"differencing order (d) required for stationarity = {comparison['chosen_d']}")

    return comparison


def run_phase3():
    global_df, indian_df = load_data()

    global_result = analyze_series(global_df, "Date", "Price_USD",
                                    "Global Gold (USD)", "global")
    indian_result = analyze_series(indian_df, "Date", "Price_INR",
                                    "Indian Gold (INR)", "indian")

    print("\nPhase 3 complete. Plots saved to:", PLOTS_DIR)
    return {
        "global": global_result,
        "indian": indian_result,
    }


if __name__ == "__main__":
    run_phase3()
