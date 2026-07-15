import {
  BrainCog,
  LineChart as LineChartIcon,
  Landmark,
  Brain,
  Settings,
  Car,
  Home as HomeIcon,
  Briefcase,
  GraduationCap,
  Repeat,
  ShieldPlus,
  Wallet,
} from "lucide-react";
import { C } from "./theme";

export const navItems = [
  { key: "simulator", label: "Simulator", icon: BrainCog },
  { key: "retirement", label: "Retirement", icon: LineChartIcon },
  { key: "portfolio", label: "Portfolio", icon: Landmark },
  { key: "cashflow", label: "Cash Flow", icon: Wallet },
  { key: "insights", label: "Insights", icon: Brain },
  { key: "settings", label: "Settings", icon: Settings },
];

export function projectionData() {
  const data = [];
  let corpus = 120000000; // 12 Cr
  let withdrawal = 4800000; // 48L
  const inflation = 1.06;
  const ret = 1.08;
  for (let age = 60; age <= 90; age++) {
    data.push({
      age,
      corpus: +(corpus / 10000000).toFixed(2),
      withdrawal: +(withdrawal / 100000).toFixed(1),
    });
    corpus = Math.max(0, (corpus - withdrawal) * ret);
    withdrawal *= inflation;
  }
  return data;
}

export const allocationData = [
  { name: "Equity", value: 65, color: C.secondary },
  { name: "Debt", value: 25, color: C.tertiaryContainer },
  { name: "Gold", value: 5, color: C.gold },
  { name: "Real Estate", value: 5, color: C.surfaceTint },
];

export const lifeEvents = [
  { key: "car", label: "Buy Car", icon: Car },
  { key: "house", label: "Buy House", icon: HomeIcon },
  { key: "career", label: "Career Shift", icon: Briefcase },
  { key: "edu", label: "Education", icon: GraduationCap },
  { key: "pivot", label: "Career Pivot", icon: Repeat },
  { key: "emergency", label: "Emergency Fund", icon: ShieldPlus },
];

export const wealthProjection = [
  { year: 2024, baseline: 0.6, simulated: 0.6 },
  { year: 2027, baseline: 1.2, simulated: 0.85 },
  { year: 2030, baseline: 1.9, simulated: 1.55 },
  { year: 2034, baseline: 2.9, simulated: 2.45 },
  { year: 2039, baseline: 4.0, simulated: 3.5 },
  { year: 2044, baseline: 5.1, simulated: 4.5 },
];
