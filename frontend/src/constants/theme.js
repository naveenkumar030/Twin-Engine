export const BRAND_PALETTE = {
  50: "#a9d6e5",
  100: "#89c2d9",
  200: "#61a5c2",
  300: "#468faf",
  400: "#2c7da0",
  500: "#2a6f97",
  600: "#014f86",
  700: "#01497c",
  800: "#013a63",
  900: "#012a4a",
};

// ---------- Design tokens - Light + Dark Mode ----------
export const C = {
  primary: "#0f172a",
  primaryFixed: BRAND_PALETTE[100],
  primaryContainer: BRAND_PALETTE[900],
  onPrimaryContainer: BRAND_PALETTE[50],
  secondary: BRAND_PALETTE[500],
  secondaryContainer: BRAND_PALETTE[600],
  onSecondaryContainer: "#ffffff",
  tertiaryContainer: "#064e3b",
  onTertiaryContainer: "#10b981",
  tertiaryFixedDim: "#34d399",
  surface: "#fafafa",
  surfaceBright: "#ffffff",
  surfaceContainerLowest: "#ffffff",
  surfaceContainerLow: "#f4f4f5",
  surfaceContainer: "#e4e4e7",
  surfaceContainerHigh: "#d4d4d8",
  surfaceContainerHighest: "#a1a1aa",
  surfaceTint: BRAND_PALETTE[500],
  onSurface: "#09090b",
  onSurfaceVariant: "#52525b",
  onBackground: "#09090b",
  outline: "#71717a",
  outlineVariant: "#e4e4e7",
  error: "#ef4444",
  errorContainer: "#fee2e2",
  gold: "#f59e0b",
  amber: "#f59e0b",
  violet: "#8b5cf6",
  rose: "#f43f5e",
  sky: "#0ea5e9",
  teal: "#14b8a6",
};

// Dark mode tokens (used when .dark class is on html)
export const CD = {
  primary: "#f1f5f9",
  primaryContainer: BRAND_PALETTE[800],
  secondary: BRAND_PALETTE[400],
  secondaryContainer: BRAND_PALETTE[500],
  surface: "#0f172a",
  surfaceBright: "#1e293b",
  surfaceContainerLowest: "#1e293b",
  surfaceContainerLow: "#1e293b",
  surfaceContainer: "#334155",
  onSurface: "#f1f5f9",
  onSurfaceVariant: "#94a3b8",
  onBackground: "#f1f5f9",
  outline: "#64748b",
  outlineVariant: "#334155",
  error: "#f87171",
  errorContainer: "#450a0a",
  gold: "#fbbf24",
};

// Asset category color map
export const ASSET_COLORS = {
  Stocks: "#6366f1",
  "Mutual Funds": "#8b5cf6",
  ETFs: "#3b82f6",
  Gold: "#f59e0b",
  Crypto: "#f97316",
  "Fixed Deposits": "#10b981",
  Bonds: "#14b8a6",
  REITs: "#06b6d4",
  "Real Estate": "#0ea5e9",
  Cash: "#64748b",
  EPF: "#84cc16",
  PPF: "#22c55e",
  NPS: "#a3e635",
  Equity: "#6366f1",
  Debt: "#10b981",
  "Real Estate (Old)": "#3b82f6",
};

export const SCORE_COLORS = {
  excellent: "#10b981",
  good: "#6366f1",
  average: "#f59e0b",
  poor: "#ef4444",
};

export function getScoreColor(score, max = 100) {
  const pct = (score / max) * 100;
  if (pct >= 80) return SCORE_COLORS.excellent;
  if (pct >= 60) return SCORE_COLORS.good;
  if (pct >= 40) return SCORE_COLORS.average;
  return SCORE_COLORS.poor;
}
