"""
Phase 1 - Data Preparation
Gold Price Analysis and Prediction using Time Series Modeling (MCA Mini Project)

Purpose (per synopsis only):
    - Take the two raw datasets required by the synopsis:
        1. Global Gold Price Dataset  (World Gold Council, 1978-2018, Monthly)
        2. Indian Market Gold Price Dataset (Gold Price India, web scraped, 2011-2018,
           claimed Monthly in the synopsis, but verified on inspection to actually be
           DAILY data)
    - Produce clean, monthly, correctly-dated CSVs ready for the next phase
      (trend/seasonality analysis, stationarity testing, regression, SARIMA).

No modeling, EDA, stationarity testing, or forecasting is performed here.
No database, API, or extra datasets are introduced.

Inputs (raw, preserved as-is):
    data/raw/global_gold_raw.csv   -> copy of World Gold Council monthly USD series
    data/raw/indian_gold_raw.csv   -> copy of scraped Indian daily price series

Outputs (processed):
    data/processed/global_gold_monthly.csv
    data/processed/indian_gold_monthly.csv
"""

import pandas as pd
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
RAW_DIR = BASE_DIR / "data" / "raw"
PROCESSED_DIR = BASE_DIR / "data" / "processed"
PROCESSED_DIR.mkdir(parents=True, exist_ok=True)


def prepare_global_gold():
    """
    Global Gold Price Dataset (World Gold Council).
    Already monthly, already clean (no missing values, no duplicate dates).
    Minimum change only: standardize column names/date dtype, sort chronologically,
    drop the stray unnamed index column carried over from the source file.
    """
    src = RAW_DIR / "global_gold_raw.csv"
    df = pd.read_csv(src)

    # Drop the unnamed pass-through index column from the source file, if present
    unnamed_cols = [c for c in df.columns if c.lower().startswith("unnamed")]
    df = df.drop(columns=unnamed_cols, errors="ignore")

    df = df.rename(columns={"Name": "Date", "US dollar": "Price_USD"})
    df["Date"] = pd.to_datetime(df["Date"], errors="raise")
    df = df.sort_values("Date").reset_index(drop=True)

    # Sanity checks (assertions only - no silent fixing of unexpected issues)
    assert df["Date"].is_unique, "Duplicate dates found in global gold dataset"
    assert df["Price_USD"].isna().sum() == 0, "Missing prices found in global gold dataset"

    out_path = PROCESSED_DIR / "global_gold_monthly.csv"
    df.to_csv(out_path, index=False)
    return df, out_path


def prepare_indian_gold():
    """
    Indian Market Gold Price Dataset (Gold Price India, web scraped).
    Synopsis states this dataset is Monthly, but inspection shows it is actually
    DAILY (~1 row per calendar day, 2011-01-01 to 2018-11-16).
    Minimum necessary conversion: resample to monthly using the mean of daily
    prices within each calendar month (reduces day-to-day noise while preserving
    the monthly granularity required by the synopsis). The original daily data is
    preserved untouched in data/raw/indian_gold_raw.csv.
    """
    src = RAW_DIR / "indian_gold_raw.csv"
    df = pd.read_csv(src, header=None, names=["Date", "Price_INR"])
    df["Date"] = pd.to_datetime(df["Date"], format="%d-%m-%Y", errors="raise")
    df = df.sort_values("Date").reset_index(drop=True)

    # Sanity checks on the raw daily data before aggregating
    assert df["Price_INR"].isna().sum() == 0, "Missing prices found in Indian gold dataset"
    assert not df["Date"].duplicated().any(), "Duplicate daily dates found in Indian gold dataset"

    # Resample daily -> monthly (calendar month-end), using the mean daily price
    monthly = (
        df.set_index("Date")["Price_INR"]
        .resample("ME")
        .mean()
        .round(2)
        .reset_index()
    )
    monthly = monthly.rename(columns={"Date": "Date", "Price_INR": "Price_INR"})

    out_path = PROCESSED_DIR / "indian_gold_monthly.csv"
    monthly.to_csv(out_path, index=False)
    return df, monthly, out_path


if __name__ == "__main__":
    g_df, g_path = prepare_global_gold()
    i_daily, i_monthly, i_path = prepare_indian_gold()

    print("Global gold (monthly) ->", g_path, "| rows:", len(g_df))
    print("Indian gold daily source rows:", len(i_daily))
    print("Indian gold (resampled monthly) ->", i_path, "| rows:", len(i_monthly))
