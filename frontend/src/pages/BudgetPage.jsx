import React, { useState, useEffect, useMemo } from "react";
import {
  PieChart, Pie, Cell, BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";
import {
  SlidersHorizontal, PiggyBank, TrendingUp, AlertTriangle,
  CheckCircle, HelpCircle, Activity, Landmark, Sparkles,
  Info, Compass, Target, Heart, ArrowRight
} from "lucide-react";
import { C } from "../constants/theme";
import {
  fetchRetirementProfile,
  fetchUserSettings,
  fetchHoldings,
  fetchTransactions
} from "../services/api";
import Header from "../components/Header";
import StatCard from "../components/StatCard";

// ── Helpers ──
function formatCurrency(val, currency = "₹") {
  if (Math.abs(val) >= 10000000) return `${currency}${(val / 10000000).toFixed(2)}Cr`;
  if (Math.abs(val) >= 100000) return `${currency}${(val / 100000).toFixed(1)}L`;
  if (Math.abs(val) >= 1000) return `${currency}${(val / 1000).toFixed(1)}K`;
  return `${currency}${Math.round(val).toLocaleString()}`;
}

function fvContributions(monthlyPmt, monthlyRate, months) {
  if (monthlyRate === 0) return monthlyPmt * months;
  return monthlyPmt * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate);
}

function requiredPMT(target, presentValue, monthlyRate, months) {
  if (months <= 0) return 0;
  if (monthlyRate === 0) return Math.max(0, (target - presentValue) / months);
  const fvPV = presentValue * Math.pow(1 + monthlyRate, months);
  const remaining = Math.max(0, target - fvPV);
  return remaining * monthlyRate / (Math.pow(1 + monthlyRate, months) - 1);
}

export default function BudgetPage({ userId, currency = "₹", onMenuToggle, healthScore, darkMode }) {
  // ── States ──
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState({
    startingCorpus: 120000000.0,
    startingWithdrawal: 4800000.0,
    inflationRate: 0.06,
    returnRate: 0.08,
  });
  const [settings, setSettings] = useState({
    currentAge: 35,
    targetRetirementAge: 60,
    equityAllocation: 65.0,
    debtAllocation: 25.0,
    goldAllocation: 5.0,
    realEstateAllocation: 5.0
  });
  const [holdings, setHoldings] = useState([]);
  const [transactions, setTransactions] = useState([]);

  // Configurable inputs
  const [monthlyIncome, setMonthlyIncome] = useState(150000);
  const [monthlyBudgetLimit, setMonthlyBudgetLimit] = useState(80000);

  // Category allocations (absolute values)
  const [categories, setCategories] = useState({
    Housing: 28000, // 35% of 80000
    "Groceries/Food": 16000, // 20%
    "Utilities/Bills": 12000, // 15%
    "Entertainment/Lifestyle": 12000, // 15%
    Transport: 12000, // 15%
  });

  // What-if simulator
  const [simulatedSavingsRate, setSimulatedSavingsRate] = useState(46);

  // ── API Loading ──
  useEffect(() => {
    if (userId) {
      setLoading(true);
      Promise.all([
        fetchRetirementProfile(userId),
        fetchUserSettings(userId),
        fetchHoldings(userId),
        fetchTransactions(userId)
      ])
        .then(([prof, setts, holds, txs]) => {
          if (prof) setProfile(prof);
          if (setts) {
            setSettings(setts);
          }
          if (holds) setHoldings(holds);
          if (txs) setTransactions(txs);

          // Attempt to extract typical income from profile or user settings if possible
          // Defaulting to 150000 as typical, but if transactions contain a Salary, use that.
          const salaryTx = txs?.filter(t => t.type === "INCOME" && t.category === "Salary");
          if (salaryTx && salaryTx.length > 0) {
            // Take the average salary or the latest
            const latestSalary = salaryTx[salaryTx.length - 1].amount;
            setMonthlyIncome(latestSalary);
            setMonthlyBudgetLimit(Math.round(latestSalary * 0.55)); // 55% as default budget
          }
        })
        .catch(err => console.error("Error loading budget context:", err))
        .finally(() => setLoading(false));
    }
  }, [userId]);

  // Adjust categories when monthlyBudgetLimit changes
  useEffect(() => {
    // Proportional distribution based on current weights
    const totalCurrentCats = Object.values(categories).reduce((sum, v) => sum + v, 0) || 1;
    const scaled = {};
    Object.keys(categories).forEach(key => {
      const weight = categories[key] / totalCurrentCats;
      scaled[key] = Math.round(monthlyBudgetLimit * weight);
    });
    setCategories(scaled);
  }, [monthlyBudgetLimit]);

  // Update simulated savings rate when income/budget limit changes initially
  useEffect(() => {
    const plannedSavings = Math.max(0, monthlyIncome - monthlyBudgetLimit);
    const rate = Math.round((plannedSavings / monthlyIncome) * 100) || 0;
    setSimulatedSavingsRate(rate);
  }, [monthlyIncome, monthlyBudgetLimit]);

  // Handle single category adjustment
  const handleCategoryChange = (key, rawValue) => {
    const value = Math.max(0, Number(rawValue));
    const updatedCats = { ...categories, [key]: value };
    setCategories(updatedCats);

    // Sum up categories to update the total budget limit
    const newTotal = Object.values(updatedCats).reduce((sum, v) => sum + v, 0);
    if (newTotal <= monthlyIncome) {
      setMonthlyBudgetLimit(newTotal);
    }
  };

  // ── Math Computations ──
  const startingCorpus = profile.startingCorpus;
  const startingWithdrawal = profile.startingWithdrawal;
  const returnRate = profile.returnRate;
  const inflationRate = profile.inflationRate;
  const currentAge = settings.currentAge || 35;
  const targetRetirementAge = settings.targetRetirementAge || 60;
  const yearsToRetirement = Math.max(0, targetRetirementAge - currentAge);
  const monthlyRate = returnRate / 12;

  // Target corpus calculation
  const netRate = Math.max(0.005, returnRate - inflationRate);
  const targetCorpus = startingWithdrawal / netRate;

  // Planned Savings
  const plannedSavings = Math.max(0, monthlyIncome - monthlyBudgetLimit);

  // Required monthly savings to meet retirement goals
  const requiredMonthlySavings = requiredPMT(targetCorpus, startingCorpus, monthlyRate, yearsToRetirement * 12);

  // What-if simulated monthly savings
  const simulatedMonthlySavings = monthlyIncome * (simulatedSavingsRate / 100);

  // Projected retirement corpus
  const fvCurrentCorpus = startingCorpus * Math.pow(1 + returnRate, yearsToRetirement);
  const projectedCorpusPlanned = fvCurrentCorpus + fvContributions(plannedSavings, monthlyRate, yearsToRetirement * 12);
  const projectedCorpusSimulated = fvCurrentCorpus + fvContributions(simulatedMonthlySavings, monthlyRate, yearsToRetirement * 12);

  // Retirement Age Helper
  const getAgeReachingTarget = (monthlySavings) => {
    const maxAge = 100;
    for (let age = currentAge; age <= maxAge; age++) {
      const years = age - currentAge;
      const fvCorpus = startingCorpus * Math.pow(1 + returnRate, years);
      const fvSavings = fvContributions(monthlySavings, monthlyRate, years * 12);
      const total = fvCorpus + fvSavings;
      if (total >= targetCorpus) {
        return age;
      }
    }
    return maxAge;
  };

  const plannedRetirementAge = getAgeReachingTarget(plannedSavings);
  const simulatedRetirementAge = getAgeReachingTarget(simulatedMonthlySavings);
  const ageDifference = plannedRetirementAge - simulatedRetirementAge;

  // ── Pie/Donut Chart Data ──
  const pieChartData = useMemo(() => {
    const colors = ["#6366f1", "#10b981", "#3b82f6", "#f59e0b", "#ec4899", "#8b5cf6"];
    const catsList = Object.keys(categories);
    const data = catsList.map((name, i) => ({
      name,
      value: categories[name],
      color: colors[i % colors.length]
    }));
    // Append planned savings
    data.push({
      name: "Savings",
      value: Math.max(0, monthlyIncome - monthlyBudgetLimit),
      color: "#8b5cf6"
    });
    return data.filter(d => d.value > 0);
  }, [categories, monthlyIncome, monthlyBudgetLimit]);

  // ── Transaction Categorization & Actuals ──
  const mapCategory = (txCat) => {
    if (!txCat) return "Entertainment/Lifestyle";
    const cat = txCat.toLowerCase();
    if (cat.includes("rent") || cat.includes("house") || cat.includes("home") || cat.includes("housing")) return "Housing";
    if (cat.includes("grocery") || cat.includes("groceries") || cat.includes("food") || cat.includes("dining") || cat.includes("supermarket")) return "Groceries/Food";
    if (cat.includes("utility") || cat.includes("utilities") || cat.includes("bill") || cat.includes("electric") || cat.includes("water") || cat.includes("internet") || cat.includes("gas") || cat.includes("phone")) return "Utilities/Bills";
    if (cat.includes("entertainment") || cat.includes("lifestyle") || cat.includes("leisure") || cat.includes("shopping") || cat.includes("restaurant") || cat.includes("other") || cat.includes("gadget")) return "Entertainment/Lifestyle";
    if (cat.includes("transport") || cat.includes("travel") || cat.includes("fuel") || cat.includes("car") || cat.includes("cab") || cat.includes("bus") || cat.includes("train") || cat.includes("flight")) return "Transport";
    return "Entertainment/Lifestyle";
  };

  // Latest month represented in transactions
  const latestMonth = useMemo(() => {
    if (!transactions || transactions.length === 0) return null;
    const dates = transactions.map(t => new Date(t.date)).filter(d => !isNaN(d));
    if (dates.length === 0) return null;
    const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));
    return maxDate.toLocaleString("default", { month: "short", year: "2-digit" });
  }, [transactions]);

  const latestMonthTx = useMemo(() => {
    if (!transactions || transactions.length === 0 || !latestMonth) return [];
    return transactions.filter(t => {
      try {
        const d = new Date(t.date);
        if (isNaN(d)) return false;
        const monthStr = d.toLocaleString("default", { month: "short", year: "2-digit" });
        return monthStr === latestMonth;
      } catch {
        return false;
      }
    });
  }, [transactions, latestMonth]);

  const actualSpendingByCategory = useMemo(() => {
    const spending = {
      Housing: 0,
      "Groceries/Food": 0,
      "Utilities/Bills": 0,
      "Entertainment/Lifestyle": 0,
      Transport: 0,
    };
    latestMonthTx.forEach(t => {
      if (t.type === "EXPENSE") {
        const mapped = mapCategory(t.category);
        if (spending[mapped] !== undefined) {
          spending[mapped] += t.amount;
        }
      }
    });
    return spending;
  }, [latestMonthTx]);

  const actualTotalExpense = Object.values(actualSpendingByCategory).reduce((a, b) => a + b, 0);

  // Bar Chart Data (Comparison)
  const barChartData = useMemo(() => {
    return [
      { name: "Housing", Budgeted: categories.Housing, Actual: actualSpendingByCategory.Housing },
      { name: "Groceries/Food", Budgeted: categories["Groceries/Food"], Actual: actualSpendingByCategory["Groceries/Food"] },
      { name: "Utilities/Bills", Budgeted: categories["Utilities/Bills"], Actual: actualSpendingByCategory["Utilities/Bills"] },
      { name: "Entertainment/Lifestyle", Budgeted: categories["Entertainment/Lifestyle"], Actual: actualSpendingByCategory["Entertainment/Lifestyle"] },
      { name: "Transport", Budgeted: categories.Transport, Actual: actualSpendingByCategory.Transport },
    ];
  }, [categories, actualSpendingByCategory]);

  // ── Timeline Growth Data ──
  const timelineData = useMemo(() => {
    const pts = [];
    const years = yearsToRetirement || 25;
    // Sample around 10 intervals
    const step = Math.max(1, Math.round(years / 10));
    for (let y = 0; y <= years; y += step) {
      const age = currentAge + y;
      const fvC = startingCorpus * Math.pow(1 + returnRate, y);
      const plannedCorpus = fvC + fvContributions(plannedSavings, monthlyRate, y * 12);
      const simulatedCorpus = fvC + fvContributions(simulatedMonthlySavings, monthlyRate, y * 12);
      pts.push({
        age,
        "Planned Savings": Math.round(plannedCorpus),
        "Simulated Savings": Math.round(simulatedCorpus)
      });
    }
    // Make sure we include target retirement age at the end
    if (pts[pts.length - 1].age !== currentAge + years) {
      const y = years;
      const age = currentAge + y;
      const fvC = startingCorpus * Math.pow(1 + returnRate, y);
      pts.push({
        age,
        "Planned Savings": Math.round(fvC + fvContributions(plannedSavings, monthlyRate, y * 12)),
        "Simulated Savings": Math.round(fvC + fvContributions(simulatedMonthlySavings, monthlyRate, y * 12))
      });
    }
    return pts;
  }, [currentAge, yearsToRetirement, startingCorpus, returnRate, monthlyRate, plannedSavings, simulatedMonthlySavings]);

  // ── Suggestions Computations ──
  const liquidHoldings = useMemo(() => {
    return holdings
      .filter(h => h.category === "Cash" || h.category === "Debt" || h.category === "Fixed Deposits")
      .reduce((sum, h) => sum + h.amount, 0);
  }, [holdings]);

  const emergencyRunwayMonths = monthlyBudgetLimit > 0 ? (liquidHoldings / monthlyBudgetLimit) : 0;
  const emergencyShortfall = Math.max(0, (6 * monthlyBudgetLimit) - liquidHoldings);

  // Asset allocation target vs actual skewness check
  const skewnessAnalysis = useMemo(() => {
    if (holdings.length === 0) return { skewed: false, detail: "" };
    const totalAssets = holdings.reduce((sum, h) => sum + h.amount, 0) || 1;
    const actualEquityPct = holdings.filter(h => h.category === "Equity").reduce((sum, h) => sum + h.amount, 0) / totalAssets * 100;
    const targetEquityPct = settings.equityAllocation || 65.0;

    const diff = actualEquityPct - targetEquityPct;
    if (Math.abs(diff) >= 8) {
      const dir = diff > 0 ? "overweight" : "underweight";
      const targetCat = diff > 0 ? "Debt/Gold" : "Equity";
      return {
        skewed: true,
        direction: dir,
        diff: Math.abs(diff).toFixed(1),
        current: actualEquityPct.toFixed(1),
        target: targetEquityPct,
        advice: `Your portfolio is ${dir} on Equity by ${Math.abs(diff).toFixed(1)}% (Actual ${actualEquityPct.toFixed(1)}% vs Target ${targetEquityPct}%). We suggest directing your new monthly savings of ${formatCurrency(plannedSavings, currency)} to ${targetCat} holdings.`
      };
    }
    return { skewed: false };
  }, [holdings, settings, plannedSavings, currency]);

  // 50/30/20 Rule Calculations
  const needsTotal = categories.Housing + categories["Groceries/Food"] + categories["Utilities/Bills"] + categories.Transport;
  const wantsTotal = categories["Entertainment/Lifestyle"];
  const savingsTotal = plannedSavings;

  const needsPct = Math.round((needsTotal / monthlyIncome) * 100) || 0;
  const wantsPct = Math.round((wantsTotal / monthlyIncome) * 100) || 0;
  const savingsPct = Math.round((savingsTotal / monthlyIncome) * 100) || 0;

  // Card background styling matching existing layout
  const cardBg = darkMode ? "#1e293b" : "#ffffff";
  const cardBorder = darkMode ? "rgba(51,65,85,0.7)" : "rgba(228,228,231,0.8)";
  const textPrimary = darkMode ? "#f1f5f9" : C.onSurface;
  const textMuted = darkMode ? "#94a3b8" : "#64748b";
  const inputClass = `w-full px-4 py-3 rounded-xl border outline-none text-sm font-semibold transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 ${darkMode ? "bg-slate-800 border-slate-600 text-slate-100" : "bg-white border-slate-200 text-slate-800"}`;

  return (
    <>
      <Header title="Budget Management" onMenuToggle={onMenuToggle} healthScore={healthScore} darkMode={darkMode} userId={userId} />

      <div className="flex-1 overflow-y-auto p-4 md:p-8 max-w-[1440px] mx-auto w-full space-y-6 animate-fade-in">
        {/* Loading Overlay */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-4">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2" style={{ borderColor: C.secondary }} />
              <p className="text-sm font-bold" style={{ color: textMuted }}>Analyzing retirement and portfolio balances...</p>
            </div>
          </div>
        ) : (
          <>
            {/* ── Key Metrics Cards Row ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="rounded-2xl border p-5 bg-white dark:bg-slate-800 dark:border-slate-700 hover:shadow-lg transition-all" style={{ borderColor: cardBorder }}>
                <p className="text-[10px] uppercase font-bold tracking-widest text-slate-400 dark:text-slate-500 mb-1">Monthly Net Income</p>
                <div className="text-2xl font-black text-slate-900 dark:text-slate-100 flex items-center justify-between">
                  <span>{formatCurrency(monthlyIncome, currency)}</span>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 text-sm">
                    <Activity size={16} />
                  </div>
                </div>
                <div className="mt-3">
                  <input
                    type="range"
                    min="50000"
                    max="500000"
                    step="5000"
                    value={monthlyIncome}
                    onChange={(e) => setMonthlyIncome(Number(e.target.value))}
                    className="w-full accent-indigo-500"
                  />
                </div>
              </div>

              <div className="rounded-2xl border p-5 bg-white dark:bg-slate-800 dark:border-slate-700 hover:shadow-lg transition-all" style={{ borderColor: cardBorder }}>
                <p className="text-[10px] uppercase font-bold tracking-widest text-slate-400 dark:text-slate-500 mb-1">Monthly Budget Limit</p>
                <div className="text-2xl font-black text-slate-900 dark:text-slate-100 flex items-center justify-between">
                  <span>{formatCurrency(monthlyBudgetLimit, currency)}</span>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-emerald-50 dark:bg-emerald-950/40 text-emerald-500 text-sm">
                    <SlidersHorizontal size={16} />
                  </div>
                </div>
                <div className="mt-3">
                  <input
                    type="range"
                    min="10000"
                    max={monthlyIncome}
                    step="1000"
                    value={monthlyBudgetLimit}
                    onChange={(e) => setMonthlyBudgetLimit(Number(e.target.value))}
                    className="w-full accent-indigo-500"
                  />
                </div>
              </div>

              <div className="rounded-2xl border p-5 bg-white dark:bg-slate-800 dark:border-slate-700 hover:shadow-lg transition-all" style={{ borderColor: cardBorder }}>
                <p className="text-[10px] uppercase font-bold tracking-widest text-slate-400 dark:text-slate-500 mb-1">Planned Savings</p>
                <div className="text-2xl font-black text-slate-900 dark:text-slate-100 flex items-center justify-between">
                  <span>{formatCurrency(plannedSavings, currency)}</span>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-violet-50 dark:bg-violet-950/40 text-violet-500 text-sm">
                    <PiggyBank size={16} />
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold mt-2">
                  Savings Rate: <span className="text-indigo-500 font-bold">{Math.round((plannedSavings / monthlyIncome) * 100)}%</span>
                </p>
              </div>

              <div className="rounded-2xl border p-5 bg-white dark:bg-slate-800 dark:border-slate-700 hover:shadow-lg transition-all" style={{ borderColor: cardBorder }}>
                <p className="text-[10px] uppercase font-bold tracking-widest text-slate-400 dark:text-slate-500 mb-1">Retirement Target Savings</p>
                <div className="text-2xl font-black text-slate-900 dark:text-slate-100 flex items-center justify-between">
                  <span style={{ color: plannedSavings >= requiredMonthlySavings ? "#10b981" : "#ef4444" }}>
                    {formatCurrency(requiredMonthlySavings, currency)}
                  </span>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-rose-50 dark:bg-rose-950/40 text-rose-500 text-sm">
                    <Target size={16} />
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold mt-2">
                  Required rate: <span className="font-bold text-slate-700 dark:text-slate-300">{Math.round((requiredMonthlySavings / monthlyIncome) * 100)}%</span>
                </p>
              </div>
            </div>

            {/* ── Category Planner & Comparisons ── */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Category Sliders and Allocation Pie */}
              <div className="lg:col-span-7 rounded-2xl border p-6 flex flex-col justify-between" style={{ background: cardBg, borderColor: cardBorder }}>
                <div>
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: textPrimary }}>
                    <SlidersHorizontal size={18} className="text-indigo-500" /> Category Budget Allocation
                  </h3>
                  <p className="text-xs text-slate-400 mb-6">Distribute your monthly budget limit of {formatCurrency(monthlyBudgetLimit, currency)} among categories.</p>

                  <div className="space-y-4">
                    {Object.keys(categories).map((name) => {
                      const value = categories[name];
                      const pct = Math.round((value / monthlyBudgetLimit) * 100) || 0;
                      return (
                        <div key={name} className="space-y-1">
                          <div className="flex justify-between text-xs font-semibold">
                            <span style={{ color: textPrimary }}>{name}</span>
                            <span style={{ color: textMuted }}>{formatCurrency(value, currency)} ({pct}%)</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <input
                              type="range"
                              min="0"
                              max={monthlyBudgetLimit}
                              step="500"
                              value={value}
                              onChange={(e) => handleCategoryChange(name, Number(e.target.value))}
                              className="w-full accent-indigo-500"
                            />
                            <input
                              type="number"
                              value={value}
                              onChange={(e) => handleCategoryChange(name, Number(e.target.value))}
                              className="w-24 px-2 py-1 text-xs border rounded-lg focus:border-indigo-500 bg-transparent dark:border-slate-700 text-right font-bold"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-8 flex flex-col md:flex-row items-center gap-6 justify-center border-t pt-6" style={{ borderColor: cardBorder }}>
                  <div className="flex-1 w-full flex justify-center">
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie
                          data={pieChartData}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={75}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {pieChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => formatCurrency(value, currency)} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs w-full md:w-auto">
                    {pieChartData.map((d, i) => (
                      <div key={d.name} className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: d.color }} />
                        <span className="truncate font-semibold max-w-[120px]" style={{ color: textPrimary }}>{d.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Comparative Spending (Budget vs Actual) */}
              <div className="lg:col-span-5 rounded-2xl border p-6 flex flex-col justify-between" style={{ background: cardBg, borderColor: cardBorder }}>
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <h3 className="text-lg font-bold flex items-center gap-2" style={{ color: textPrimary }}>
                      <Activity size={18} className="text-indigo-500" /> Spending Analysis
                    </h3>
                    {latestMonth && (
                      <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 rounded-full">
                        {latestMonth} Actuals
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mb-6">Compare budgeted boundaries with your actual monthly card ledger.</p>

                  {transactions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <HelpCircle size={36} className="text-slate-400 mb-2" />
                      <p className="text-sm font-semibold" style={{ color: textPrimary }}>No actual transaction records found.</p>
                      <p className="text-xs text-slate-500 mt-1 max-w-[280px]">Upload a CSV transaction log on the Cash Flow tab to see actual spending comparisons.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={barChartData} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? "#334155" : "#e2e8f0"} />
                          <XAxis dataKey="name" stroke={darkMode ? "#94a3b8" : "#64748b"} fontSize={10} />
                          <YAxis stroke={darkMode ? "#94a3b8" : "#64748b"} tickFormatter={(v) => formatCurrency(v, currency)} fontSize={10} />
                          <Tooltip formatter={(value) => formatCurrency(value, currency)} />
                          <Bar dataKey="Budgeted" fill="#6366f1" radius={[3, 3, 0, 0]} />
                          <Bar dataKey="Actual" fill="#ec4899" radius={[3, 3, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>

                      <div className="text-xs space-y-2 border-t pt-4" style={{ borderColor: cardBorder }}>
                        <div className="flex justify-between">
                          <span style={{ color: textMuted }}>Actual Monthly Expenditure:</span>
                          <span className="font-black" style={{ color: textPrimary }}>{formatCurrency(actualTotalExpense, currency)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span style={{ color: textMuted }}>Budget Envelope Limit:</span>
                          <span className="font-black" style={{ color: textPrimary }}>{formatCurrency(monthlyBudgetLimit, currency)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span style={{ color: textMuted }}>Variance Status:</span>
                          <span className={`font-black ${actualTotalExpense > monthlyBudgetLimit ? "text-red-500" : "text-emerald-500"}`}>
                            {actualTotalExpense > monthlyBudgetLimit
                              ? `Overspent by ${formatCurrency(actualTotalExpense - monthlyBudgetLimit, currency)}`
                              : `Within Limit by ${formatCurrency(monthlyBudgetLimit - actualTotalExpense, currency)}`
                            }
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* 50/30/20 Rule Check */}
                <div className="border-t pt-6 mt-6" style={{ borderColor: cardBorder }}>
                  <h4 className="text-xs font-black uppercase tracking-wider mb-3 flex items-center gap-1.5" style={{ color: textPrimary }}>
                    <Compass size={14} className="text-violet-500" /> 50/30/20 Budget Assessment
                  </h4>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-xs font-semibold mb-1">
                        <span style={{ color: textPrimary }}>Needs (Housing, Food, Bills): {needsPct}%</span>
                        <span style={{ color: textMuted }}>Target: 50%</span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${needsPct > 55 ? "bg-red-500" : "bg-indigo-500"}`} style={{ width: `${Math.min(100, needsPct)}%` }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs font-semibold mb-1">
                        <span style={{ color: textPrimary }}>Wants (Lifestyle, Entertainment): {wantsPct}%</span>
                        <span style={{ color: textMuted }}>Target: 30%</span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${wantsPct > 35 ? "bg-red-500" : "bg-emerald-500"}`} style={{ width: `${Math.min(100, wantsPct)}%` }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs font-semibold mb-1">
                        <span style={{ color: textPrimary }}>Savings (Retirement / SIP): {savingsPct}%</span>
                        <span style={{ color: textMuted }}>Target: 20%</span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${savingsPct >= 20 ? "bg-violet-500" : "bg-amber-500"}`} style={{ width: `${Math.min(100, savingsPct)}%` }} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── What-If Savings Calculator Panel ── */}
            <div className="rounded-2xl border p-6" style={{ background: cardBg, borderColor: cardBorder }}>
              <div className="flex items-center gap-2 mb-2">
                <Sparkles size={20} className="text-indigo-500" />
                <h3 className="text-lg font-bold" style={{ color: textPrimary }}>Retirement What-If Simulation</h3>
              </div>
              <p className="text-xs text-slate-400 mb-6">Simulate the direct impact of adjusting your monthly savings rate on your retirement timeline.</p>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                {/* Simulator Inputs & Key Stats */}
                <div className="lg:col-span-4 space-y-6">
                  <div className="space-y-2">
                    <label className="block text-xs font-bold" style={{ color: textPrimary }}>
                      Simulated Savings Rate: <span className="text-indigo-500 font-extrabold">{simulatedSavingsRate}%</span>
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="85"
                      step="1"
                      value={simulatedSavingsRate}
                      onChange={(e) => setSimulatedSavingsRate(Number(e.target.value))}
                      className="w-full accent-indigo-500"
                    />
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span>0% (No Savings)</span>
                      <span>85% (High Savings)</span>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl border space-y-3 bg-slate-50 dark:bg-slate-900/30" style={{ borderColor: cardBorder }}>
                    <div className="flex justify-between items-center text-xs">
                      <span style={{ color: textMuted }}>Current Planned Savings:</span>
                      <span className="font-bold" style={{ color: textPrimary }}>{formatCurrency(plannedSavings, currency)}/mo</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span style={{ color: textMuted }}>Simulated Monthly Savings:</span>
                      <span className="font-bold text-indigo-500">{formatCurrency(simulatedMonthlySavings, currency)}/mo</span>
                    </div>
                    <div className="flex justify-between items-center text-xs border-t pt-2" style={{ borderColor: cardBorder }}>
                      <span style={{ color: textMuted }}>Retirement Corpus (Planned):</span>
                      <span className="font-bold" style={{ color: textPrimary }}>{formatCurrency(projectedCorpusPlanned, currency)}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span style={{ color: textMuted }}>Retirement Corpus (Simulated):</span>
                      <span className="font-bold text-emerald-500">{formatCurrency(projectedCorpusSimulated, currency)}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs border-t pt-2 animate-pulse" style={{ borderColor: cardBorder }}>
                      <span style={{ color: textMuted }}>Retirement Milestone Age:</span>
                      <span className={`font-black px-2 py-0.5 rounded ${ageDifference > 0 ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-500" : ageDifference < 0 ? "bg-red-50 dark:bg-red-950/40 text-red-500" : "text-slate-500"}`}>
                        {simulatedRetirementAge} Yrs
                        {ageDifference !== 0 && (
                          <span className="text-[10px] ml-1 font-bold">
                            ({ageDifference > 0 ? `${ageDifference}y early` : `${Math.abs(ageDifference)}y delay`})
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Growth Chart Timeline */}
                <div className="lg:col-span-8">
                  <h4 className="text-xs font-black uppercase tracking-wider mb-2" style={{ color: textPrimary }}>Corpus Timeline Growth (₹ in Crores/Lakhs)</h4>
                  <ResponsiveContainer width="100%" height={260}>
                    <AreaChart data={timelineData} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                      <defs>
                        <linearGradient id="colorPlanned" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15}/>
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorSimulated" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.15}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? "#334155" : "#e2e8f0"} />
                      <XAxis dataKey="age" stroke={darkMode ? "#94a3b8" : "#64748b"} fontSize={10} />
                      <YAxis stroke={darkMode ? "#94a3b8" : "#64748b"} tickFormatter={(v) => formatCurrency(v, currency)} fontSize={10} />
                      <Tooltip formatter={(value) => formatCurrency(value, currency)} />
                      <Area type="monotone" dataKey="Planned Savings" stroke="#6366f1" strokeWidth={2.5} fillOpacity={1} fill="url(#colorPlanned)" />
                      <Area type="monotone" dataKey="Simulated Savings" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorSimulated)" />
                      <Legend />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* ── Suggestions panel ── */}
            <div className="space-y-4">
              <h3 className="text-lg font-bold flex items-center gap-2" style={{ color: textPrimary }}>
                <Heart size={18} className="text-rose-500" /> Personalized Financial Insights & Tips
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                {/* 1. Retirement Alignment Card */}
                <div className="rounded-2xl border p-5 flex flex-col justify-between" style={{ background: cardBg, borderColor: cardBorder }}>
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Target size={18} className="text-indigo-500" />
                      <h4 className="text-sm font-bold" style={{ color: textPrimary }}>Retirement Alignment</h4>
                    </div>
                    {plannedSavings >= requiredMonthlySavings ? (
                      <div className="space-y-2">
                        <div className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">
                          <CheckCircle size={10} /> Fully On Track
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                          Your current budget allocation allows for monthly savings of {formatCurrency(plannedSavings, currency)}, which exceeds your requirement of {formatCurrency(requiredMonthlySavings, currency)} to retire by {targetRetirementAge}. Excellent work!
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-amber-500 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-full">
                          <AlertTriangle size={10} /> Savings Deficit
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                          You are short by <span className="text-red-500 font-bold">{formatCurrency(requiredMonthlySavings - plannedSavings, currency)}/mo</span> compared to your required monthly savings. To bridge this gap, consider dialing back on lifestyle expenditures or adjusting your retirement milestone target.
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="mt-4 pt-3 border-t text-[10px] flex justify-between font-bold" style={{ borderColor: cardBorder, color: textMuted }}>
                    <span>Surplus/Gap:</span>
                    <span className={plannedSavings >= requiredMonthlySavings ? "text-emerald-500" : "text-red-500"}>
                      {formatCurrency(plannedSavings - requiredMonthlySavings, currency)}
                    </span>
                  </div>
                </div>

                {/* 2. Emergency Runway Card */}
                <div className="rounded-2xl border p-5 flex flex-col justify-between" style={{ background: cardBg, borderColor: cardBorder }}>
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Landmark size={18} className="text-indigo-500" />
                      <h4 className="text-sm font-bold" style={{ color: textPrimary }}>Emergency Fund Runway</h4>
                    </div>
                    {emergencyRunwayMonths >= 6 ? (
                      <div className="space-y-2">
                        <div className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">
                          <CheckCircle size={10} /> Safe Reserve
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                          With {formatCurrency(liquidHoldings, currency)} in liquid cash and debt assets, you hold a robust buffer of {emergencyRunwayMonths.toFixed(1)} months of expenses. You are fully prepared to weather temporary cash disruptions.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-red-500 bg-red-50 dark:bg-red-950/40 px-2 py-0.5 rounded-full">
                          <AlertTriangle size={10} /> Cushion Shortfall
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                          Your current cash/debt holdings only shield you for {emergencyRunwayMonths.toFixed(1)} months of expenses. We recommend accumulating an additional <span className="text-red-500 font-bold">{formatCurrency(emergencyShortfall, currency)}</span> in liquid holdings to establish a secure 6-month runway.
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="mt-4 pt-3 border-t text-[10px] flex justify-between font-bold" style={{ borderColor: cardBorder, color: textMuted }}>
                    <span>Liquid Cushion:</span>
                    <span className={emergencyRunwayMonths >= 6 ? "text-emerald-500" : "text-amber-500"}>
                      {emergencyRunwayMonths.toFixed(1)} Mo ({formatCurrency(liquidHoldings, currency)})
                    </span>
                  </div>
                </div>

                {/* 3. Asset Allocation Rebalance Card */}
                <div className="rounded-2xl border p-5 flex flex-col justify-between" style={{ background: cardBg, borderColor: cardBorder }}>
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Compass size={18} className="text-indigo-500" />
                      <h4 className="text-sm font-bold" style={{ color: textPrimary }}>Asset Rebalance Suggestion</h4>
                    </div>
                    {skewnessAnalysis.skewed ? (
                      <div className="space-y-2">
                        <div className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-amber-500 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-full">
                          <AlertTriangle size={10} /> Skewness Flagged
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                          {skewnessAnalysis.advice}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">
                          <CheckCircle size={10} /> Portfolio Aligned
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                          Your portfolio allocation remains within healthy deviation levels (+/- 8%) compared to your configured target. Keep routing contributions according to your target allocation model.
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="mt-4 pt-3 border-t text-[10px] flex justify-between font-bold" style={{ borderColor: cardBorder, color: textMuted }}>
                    <span>Equity Allocation:</span>
                    <span className="text-indigo-500">
                      {skewnessAnalysis.skewed ? `${skewnessAnalysis.current}% (T: ${skewnessAnalysis.target}%)` : "Aligned"}
                    </span>
                  </div>
                </div>

                {/* 4. 50/30/20 Rule Card */}
                <div className="rounded-2xl border p-5 flex flex-col justify-between" style={{ background: cardBg, borderColor: cardBorder }}>
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Info size={18} className="text-indigo-500" />
                      <h4 className="text-sm font-bold" style={{ color: textPrimary }}>50/30/20 Budget Summary</h4>
                    </div>
                    <div className="space-y-2 text-xs">
                      {savingsPct < 20 ? (
                        <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
                          Your savings rate is <span className="text-red-500 font-bold">{savingsPct}%</span> (target 20%). Consider trimming your Lifestyle allocation ({wantsPct}%) or utility bills to increase monthly investment rates.
                        </p>
                      ) : needsPct > 50 ? (
                        <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
                          Your needs constitute <span className="text-amber-500 font-bold">{needsPct}%</span> of income (guideline 50%). Fixed expenses are slightly high. Seek potential housing or recurring service charge optimization.
                        </p>
                      ) : (
                        <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
                          Your allocation setup represents a highly healthy configuration: Needs are {needsPct}%, Lifestyle (Wants) is {wantsPct}%, and your savings rate is a robust {savingsPct}%. Maintain this discipline.
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t text-[10px] flex justify-between font-bold" style={{ borderColor: cardBorder, color: textMuted }}>
                    <span>Needs / Wants / Savings:</span>
                    <span className={savingsPct >= 20 ? "text-emerald-500" : "text-amber-500"}>
                      {needsPct}/{wantsPct}/{savingsPct}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
