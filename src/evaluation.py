"""
Phase 6 - Model Comparison
Gold Price Analysis and Prediction using Time Series Modeling (MCA Mini Project)

Scope (per synopsis only):
    - Compare model results using R^2 and RMSE.

This script simply gathers the R^2/RMSE already computed in Phase 4
(Multiple Regression) and Phase 5 (SARIMA), builds a comparison table, and
reports - honestly, from the actual numbers - which model performed better
on its test set. No new modeling happens here, and no result is assumed in
advance.

Note: the two models are evaluated over the same test DATE RANGE (see
src/sarima.py for how this alignment is done), but they are not evaluated in
an identical way - Multiple Regression predicts each test month using that
month's real lagged/rolling price features (a one-step-style evaluation
repeated across the test set), while SARIMA produces a single static
multi-step forecast across the whole test horizon without seeing any actual
test-period prices in between. This difference is a natural consequence of
how each model works, not a flaw in the comparison, but it is worth keeping
in mind when reading the table - it especially explains why SARIMA can look
much weaker on the long (93-month) Global test window.
"""

import pandas as pd
import matplotlib.pyplot as plt
from pathlib import Path

from src.regression import run_phase4
from src.sarima import run_phase5

BASE_DIR = Path(__file__).resolve().parent.parent
PLOTS_DIR = BASE_DIR / "plots"
PLOTS_DIR.mkdir(exist_ok=True)


def build_comparison_table(regression_results, sarima_results, name):
    rows = [
        {"Model": "Multiple Regression",
         "R2": regression_results["r2"],
         "RMSE": regression_results["rmse"]},
        {"Model": f"SARIMA ({sarima_results['best']['label']})",
         "R2": sarima_results["r2"],
         "RMSE": sarima_results["rmse"]},
    ]
    table = pd.DataFrame(rows)
    print(f"\n{name} - Model Comparison")
    print(table.to_string(index=False))
    return table


def plot_comparison_bars(table, name, plot_prefix):
    fig, axes = plt.subplots(1, 2, figsize=(10, 4))

    axes[0].bar(table["Model"], table["R2"], color=["steelblue", "firebrick"])
    axes[0].set_title(f"{name} - R^2 (higher is better)")
    axes[0].axhline(0, color="black", linewidth=0.8)
    axes[0].tick_params(axis="x", rotation=15)

    axes[1].bar(table["Model"], table["RMSE"], color=["steelblue", "firebrick"])
    axes[1].set_title(f"{name} - RMSE (lower is better)")
    axes[1].tick_params(axis="x", rotation=15)

    plt.tight_layout()
    plt.savefig(PLOTS_DIR / f"{plot_prefix}_model_comparison.png")
    plt.close()


def declare_winner(table, name):
    """
    Pick the better model based on the actual test RMSE (the primary,
    scale-meaningful error metric for a price-prediction task). The result
    is whatever the numbers say - not decided in advance.
    """
    best_row = table.loc[table["RMSE"].idxmin()]
    print(f"\n{name}: better-performing model on the test set (lowest RMSE) = "
          f"{best_row['Model']} (R^2={best_row['R2']:.4f}, RMSE={best_row['RMSE']:.4f})")
    return best_row["Model"]


def run_phase6():
    print("Running Phase 4 (Multiple Regression) and Phase 5 (SARIMA) "
          "to gather results for comparison...")
    regression_all = run_phase4()
    sarima_all = run_phase5()

    print("\n" + "=" * 60)
    print("PHASE 6 - MODEL COMPARISON")
    print("=" * 60)

    comparison = {}
    for key, name, plot_prefix in [("global", "Global Gold (USD)", "global"),
                                    ("indian", "Indian Gold (INR)", "indian")]:
        table = build_comparison_table(regression_all[key], sarima_all[key], name)
        plot_comparison_bars(table, name, plot_prefix)
        winner = declare_winner(table, name)
        comparison[key] = {"table": table, "winner": winner}

    print("\nPhase 6 complete. Comparison plots saved to:", PLOTS_DIR)
    return {
        "regression": regression_all,
        "sarima": sarima_all,
        "comparison": comparison,
    }


if __name__ == "__main__":
    run_phase6()
