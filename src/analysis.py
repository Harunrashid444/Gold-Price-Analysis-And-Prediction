"""
Phase 2 - EDA / Trend & Seasonality Analysis
Gold Price Analysis and Prediction using Time Series Modeling (MCA Mini Project)

Scope (per synopsis only):
    - Study long-term and seasonal trends in Gold price, in India and globally.
    - Identify seasonality in the Gold market, such as the Indian wedding season.

This script ONLY explores the already-prepared monthly datasets:
    data/processed/global_gold_monthly.csv
    data/processed/indian_gold_monthly.csv

No stationarity testing, regression, SARIMA, or forecasting happens here.
"""

import pandas as pd
import matplotlib.pyplot as plt
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
PROCESSED_DIR = BASE_DIR / "data" / "processed"
PLOTS_DIR = BASE_DIR / "plots"
PLOTS_DIR.mkdir(exist_ok=True)

# Months commonly associated with the Indian wedding season
# (spring: Mar-Apr, and the pre-winter wedding window: Oct-Dec)
WEDDING_SEASON_MONTHS = [3, 4, 10, 11, 12]


def load_data():
    """Load the two processed monthly datasets produced by Phase 1."""
    global_df = pd.read_csv(PROCESSED_DIR / "global_gold_monthly.csv", parse_dates=["Date"])
    indian_df = pd.read_csv(PROCESSED_DIR / "indian_gold_monthly.csv", parse_dates=["Date"])
    return global_df, indian_df


def add_time_parts(df):
    """Add Year/Month helper columns without modifying the original price column."""
    df = df.copy()
    df["Year"] = df["Date"].dt.year
    df["Month"] = df["Date"].dt.month
    return df


def plot_series(df, date_col, price_col, title, filename, moving_avg_window=None):
    """Plot a price series over time, optionally with a moving-average trend line."""
    plt.figure(figsize=(11, 5))
    plt.plot(df[date_col], df[price_col], label=price_col, color="steelblue")

    if moving_avg_window:
        ma = df[price_col].rolling(window=moving_avg_window).mean()
        plt.plot(df[date_col], ma, label=f"{moving_avg_window}-month moving average",
                  color="firebrick", linewidth=2)

    plt.title(title)
    plt.xlabel("Date")
    plt.ylabel(price_col)
    plt.legend()
    plt.tight_layout()
    plt.savefig(PLOTS_DIR / filename)
    plt.close()


def yearly_average(df, price_col):
    """Compute yearly average price."""
    return df.groupby("Year")[price_col].mean().round(2)


def monthly_average(df, price_col):
    """Compute average price by calendar month (across all years), for seasonality."""
    return df.groupby("Month")[price_col].mean().round(2)


def plot_monthly_seasonality(monthly_avg, title, filename, highlight_months=None):
    """Bar plot of average price by calendar month, optionally highlighting given months."""
    colors = ["darkorange" if (highlight_months and m in highlight_months) else "steelblue"
              for m in monthly_avg.index]
    plt.figure(figsize=(9, 5))
    plt.bar(monthly_avg.index, monthly_avg.values, color=colors)
    plt.title(title)
    plt.xlabel("Month")
    plt.ylabel("Average Price")
    plt.xticks(range(1, 13))
    plt.tight_layout()
    plt.savefig(PLOTS_DIR / filename)
    plt.close()


def wedding_season_check(monthly_avg):
    """
    Compare the average price during wedding-season months against the average
    price during the remaining months. This is a simple, transparent check -
    it does not claim causation, only reports whether the data shows a
    noticeably higher (or not) average price in those months.
    """
    wedding_avg = monthly_avg.loc[monthly_avg.index.isin(WEDDING_SEASON_MONTHS)].mean()
    other_avg = monthly_avg.loc[~monthly_avg.index.isin(WEDDING_SEASON_MONTHS)].mean()
    difference_pct = ((wedding_avg - other_avg) / other_avg) * 100

    top_3_months = monthly_avg.sort_values(ascending=False).head(3).index.tolist()
    wedding_months_in_top3 = [m for m in top_3_months if m in WEDDING_SEASON_MONTHS]

    return {
        "wedding_season_avg": round(wedding_avg, 2),
        "other_months_avg": round(other_avg, 2),
        "difference_pct": round(difference_pct, 2),
        "top_3_months_overall": top_3_months,
        "wedding_months_in_top_3": wedding_months_in_top3,
    }


def analyze_global(global_df):
    print("\n" + "=" * 60)
    print("GLOBAL GOLD ANALYSIS (World Gold Council, USD, monthly)")
    print("=" * 60)

    df = add_time_parts(global_df)

    plot_series(df, "Date", "Price_USD",
                "Global Gold Price - Historical Trend (1978-2018)",
                "global_price_trend.png", moving_avg_window=12)

    yearly = yearly_average(df, "Price_USD")
    print("\nYearly average price (first 5 / last 5 years):")
    print(yearly.head(5))
    print("...")
    print(yearly.tail(5))

    monthly_avg = monthly_average(df, "Price_USD")
    print("\nAverage price by calendar month (across all years):")
    print(monthly_avg)

    plot_monthly_seasonality(monthly_avg,
                              "Global Gold - Average Price by Month",
                              "global_monthly_seasonality.png")

    return yearly, monthly_avg


def analyze_indian(indian_df):
    print("\n" + "=" * 60)
    print("INDIAN GOLD ANALYSIS (Gold Price India, INR, monthly)")
    print("=" * 60)

    df = add_time_parts(indian_df)

    plot_series(df, "Date", "Price_INR",
                "Indian Gold Price - Historical Trend (2011-2018)",
                "indian_price_trend.png", moving_avg_window=6)

    yearly = yearly_average(df, "Price_INR")
    print("\nYearly average price:")
    print(yearly)

    monthly_avg = monthly_average(df, "Price_INR")
    print("\nAverage price by calendar month (across all years):")
    print(monthly_avg)

    plot_monthly_seasonality(monthly_avg,
                              "Indian Gold - Average Price by Month "
                              "(orange = common wedding-season months)",
                              "indian_monthly_seasonality.png",
                              highlight_months=WEDDING_SEASON_MONTHS)

    return yearly, monthly_avg


def analyze_wedding_season(monthly_avg):
    print("\n" + "-" * 60)
    print("WEDDING SEASON CHECK (Indian data)")
    print("-" * 60)
    result = wedding_season_check(monthly_avg)

    print(f"Average price in wedding-season months {WEDDING_SEASON_MONTHS}: "
          f"{result['wedding_season_avg']}")
    print(f"Average price in remaining months: {result['other_months_avg']}")
    print(f"Difference: {result['difference_pct']}%")
    print(f"Top 3 highest-average months overall: {result['top_3_months_overall']}")
    print(f"Of those, wedding-season months: {result['wedding_months_in_top_3']}")

    # Simple, non-forced academic conclusion based on the numbers above
    if abs(result["difference_pct"]) >= 3 and len(result["wedding_months_in_top_3"]) >= 2:
        conclusion = ("There is some evidence of seasonal behavior: wedding-season "
                       "months show a noticeably higher average price and dominate "
                       "the top months overall.")
    elif abs(result["difference_pct"]) >= 3:
        conclusion = ("Wedding-season months show a somewhat higher average price, "
                       "but they do not clearly dominate the top months overall - "
                       "the pattern is present but not strong.")
    else:
        conclusion = ("The difference between wedding-season months and other months "
                       "is small. The evidence for a strong wedding-season effect in "
                       "this dataset is weak/inconclusive.")

    print(f"\nConclusion: {conclusion}")
    return result, conclusion


def run_phase2():
    global_df, indian_df = load_data()

    _, global_monthly_avg = analyze_global(global_df)
    _, indian_monthly_avg = analyze_indian(indian_df)
    wedding_result, wedding_conclusion = analyze_wedding_season(indian_monthly_avg)

    print("\nPhase 2 complete. Plots saved to:", PLOTS_DIR)
    return {
        "global_monthly_avg": global_monthly_avg,
        "indian_monthly_avg": indian_monthly_avg,
        "wedding_result": wedding_result,
        "wedding_conclusion": wedding_conclusion,
    }


if __name__ == "__main__":
    run_phase2()
