/** Navigation model. `phase` ties each screen back to the Python pipeline
 *  phase that produced its numbers — a small orienting detail for reviewers. */
export interface NavItem {
  to: string;
  label: string;
  phase: string;
  /** Whether the Global/India switcher applies to this screen. */
  usesDataset: boolean;
  description: string;
}

export const NAV_ITEMS: NavItem[] = [
  {
    to: "/dashboard",
    label: "Overview",
    phase: "—",
    usesDataset: false,
    description: "Both markets at a glance",
  },
  {
    to: "/analysis",
    label: "Price Analysis",
    phase: "P2",
    usesDataset: true,
    description: "Historical trend, yearly and monthly averages",
  },
  {
    to: "/seasonality",
    label: "Seasonality",
    phase: "P2",
    usesDataset: true,
    description: "Calendar-month pattern and the wedding-season check",
  },
  {
    to: "/stationarity",
    label: "Stationarity",
    phase: "P3",
    usesDataset: true,
    description: "ADF tests, differencing order, ACF and PACF",
  },
  {
    to: "/models",
    label: "Model Comparison",
    phase: "P4–6",
    usesDataset: true,
    description: "Multiple Regression against SARIMA",
  },
  {
    to: "/forecast",
    label: "Forecast",
    phase: "P7",
    usesDataset: true,
    description: "Twelve-month projection from the selected model",
  },
];

export function navItemFor(pathname: string): NavItem | undefined {
  return NAV_ITEMS.find((item) => pathname.startsWith(item.to));
}
