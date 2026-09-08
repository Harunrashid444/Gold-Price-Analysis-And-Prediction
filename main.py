"""
Main entry point - Gold Price Analysis and Prediction using Time Series Modeling
(MCA Mini Project)

This entry point wires together all phases completed so far:

    Phase 1 -> data preparation             (src/prepare_data.py)
    Phase 2 -> EDA / trend & seasonality     (src/analysis.py)
    Phase 3 -> stationarity / ACF / PACF     (src/stationarity.py)
    Phase 4 -> Multiple Regression           (src/regression.py)
    Phase 5 -> SARIMA                        (src/sarima.py)
    Phase 6 -> Model comparison (R^2/RMSE)   (src/evaluation.py)
    Phase 7 -> Future gold price forecast    (src/forecast.py)

Note: Phase 6 internally re-runs Phase 4 and Phase 5 to gather their results,
and Phase 7 internally re-runs Phase 4 to get its test RMSE for the forecast
band. This means Phase 4 (and Phase 5) print their results more than once
when main.py runs end-to-end. This small duplication is kept deliberately
simple rather than adding shared-state plumbing between phases, which is not
needed for a project this size.

No UI, dashboard, API, or database is wired in - those are outside the
synopsis's scope.
"""

from pathlib import Path

from src.prepare_data import prepare_global_gold, prepare_indian_gold
from src.analysis import run_phase2
from src.stationarity import run_phase3
from src.evaluation import run_phase6
from src.forecast import run_phase7

BASE_DIR = Path(__file__).resolve().parent
PROCESSED_DIR = BASE_DIR / "data" / "processed"

REQUIRED_PROCESSED_FILES = [
    PROCESSED_DIR / "global_gold_monthly.csv",
    PROCESSED_DIR / "indian_gold_monthly.csv",
]


def ensure_data_prepared():
    """
    Run Phase 1 only if the processed datasets don't already exist, so that
    re-running main.py doesn't needlessly redo Phase 1 every time.
    """
    if all(f.exists() for f in REQUIRED_PROCESSED_FILES):
        print("Phase 1: processed datasets already exist, skipping re-preparation.")
        return

    print("Phase 1: processed datasets not found, running data preparation...")
    prepare_global_gold()
    prepare_indian_gold()


def main():
    print("Gold Price Analysis and Prediction - Project Runner")
    print("=" * 60)

    # Phase 1 - Data preparation (skipped if already done)
    ensure_data_prepared()

    # Phase 2 - EDA / trend & seasonality
    run_phase2()

    # Phase 3 - Stationarity / ACF / PACF
    run_phase3()

    # Phase 6 runs Phase 4 (Multiple Regression) and Phase 5 (SARIMA) itself,
    # then builds the R^2/RMSE comparison table.
    run_phase6()

    # Phase 7 - Future forecast using whichever model Phase 6 actually found
    # to perform better (decided by the real test results, not assumed).
    run_phase7()

    print("\nCompleted phases: Phase 1 (data prep), Phase 2 (EDA), "
          "Phase 3 (stationarity/ACF/PACF), Phase 4 (regression), "
          "Phase 5 (SARIMA), Phase 6 (comparison), Phase 7 (future forecast).")
    print("No UI/dashboard, API, or database has been implemented - out of scope.")


if __name__ == "__main__":
    main()

