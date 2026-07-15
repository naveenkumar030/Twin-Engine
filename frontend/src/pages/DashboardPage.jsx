import React, { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";
import {
  TrendingUp, TrendingDown, Wallet, Target, ShieldCheck, PiggyBank,
  Briefcase, AlertTriangle, ArrowUpRight, ArrowDownRight, Brain,
  CheckCircle, Clock, ChevronRight, Zap, BarChart2, Flame,
} from "lucide-react";
import { C, getScoreColor } from "../constants/theme";
import {
  fetchHoldings, fetchTransactions, fetchInsights, fetchRetirementProfile,
  fetchUserSettings,
} from "../services/api";
import Header from "../components/Header";
import ScoreGauge from "../components/ScoreGauge";
import AnimatedCounter from "../components/AnimatedCounter";
import { SkeletonCard, SkeletonChart } from "../components/LoadingSkeleton";

const staggerContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};
const staggerItem = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } },
};

const CARD_BORDER = "rgba(228, 228, 231, 0.8)";

function formatCurrency(val, currency = "₹") {
  if (Math.abs(val) >= 10000000) return `${currency}${(val / 10000000).toFixed(2)}Cr`;
  if (Math.abs(val) >= 100000) return `${currency}${(val / 100000).toFixed(1)}L`;
  if (Math.abs(val) >= 1000) return `${currency}${(val / 1000).toFixed(1)}K`;
  return `${currency}${Math.round(val).toLocaleString()}`;
}

function formatCurrencyRaw(val, currency = "₹") {
  if (Math.abs(val) >= 10000000) return (val / 10000000).toFixed(2);
  if (Math.abs(val) >= 100000) return (val / 100000).toFixed(1);
  return Math.round(val);
}

function getCurrencyUnit(val) {
  if (Math.abs(val) >= 10000000) return "Cr";
  if (Math.abs(val) >= 100000) return "L";
  return "";
}

export default function DashboardPage({ userId, currency = "₹", onMenuToggle, healthScore, darkMode, onNavigate }) {
  const [holdings, setHoldings] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [insights, setInsights] = useState([]);
  const [retirementProfile, setRetirementProfile] = useState(null);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    Promise.all([
      fetchHoldings(userId),
      fetchTransactions(userId),
      fetchInsights(userId),
      fetchRetirementProfile(userId),
      fetchUserSettings(userId),
    ]).then(([h, t, ins, rp, st]) => {
      setHoldings(h || []);
      setTransactions(t || []);
      setInsights(ins || []);
      setRetirementProfile(rp);
      setSettings(st);
    }).finally(() => setLoading(false));
  }, [userId]);

  // ── Derived Metrics ──
  const totalInvestments = useMemo(() => holdings.reduce((s, h) => s + h.amount, 0), [holdings]);
  const totalIncome = useMemo(() => transactions.filter(t => t.type === "INCOME").reduce((s, t) => s + t.amount, 0), [transactions]);
  const totalExpense = useMemo(() => transactions.filter(t => t.type === "EXPENSE").reduce((s, t) => s + t.amount, 0), [transactions]);
  const netSavings = totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? (netSavings / totalIncome) * 100 : 0;

  // Net Worth approximation
  const netWorth = totalInvestments + netSavings;

  // Emergency Fund (months of expenses covered by savings)
  const monthlyExpense = useMemo(() => {
    if (transactions.length === 0) return 0;
    const months = new Set(transactions.filter(t => t.type === "EXPENSE").map(t => {
      try { return new Date(t.date).toISOString().slice(0, 7); } catch { return ""; }
    })).size || 1;
    return totalExpense / months;
  }, [transactions, totalExpense]);

  const emergencyMonths = monthlyExpense > 0 ? Math.round(netSavings / monthlyExpense) : 0;

  // Retirement Readiness
  const retirementPct = useMemo(() => {
    if (!retirementProfile) return 0;
    const { startingCorpus, startingWithdrawal, returnRate, inflationRate } = retirementProfile;
    const netRate = Math.max(0.01, (returnRate || 0.08) - (inflationRate || 0.06));
    const target = (startingWithdrawal || 4800000) / netRate;
    return Math.min(100, Math.round(((startingCorpus || 0) / target) * 100));
  }, [retirementProfile]);

  // Portfolio CAGR (weighted)
  const weightedReturn = useMemo(() => {
    if (totalInvestments === 0) return 0;
    return holdings.reduce((s, h) => s + (h.amount / totalInvestments) * h.growthRate, 0);
  }, [holdings, totalInvestments]);

  // Monthly cash flow for chart
  const cashFlowChart = useMemo(() => {
    const map = {};
    transactions.forEach(t => {
      let key = "Unknown";
      try {
        const d = new Date(t.date);
        if (!isNaN(d)) key = d.toLocaleString("default", { month: "short", year: "2-digit" });
      } catch {}
      if (!map[key]) map[key] = { month: key, income: 0, expense: 0, sortKey: 0 };
      try {
        const d = new Date(t.date);
        map[key].sortKey = new Date(d.getFullYear(), d.getMonth(), 1).getTime();
      } catch {}
      if (t.type === "INCOME") map[key].income += t.amount;
      else map[key].expense += t.amount;
    });
    return Object.values(map).sort((a, b) => a.sortKey - b.sortKey).slice(-6);
  }, [transactions]);

  // Category breakdown
  const categorySpend = useMemo(() => {
    const map = {};
    transactions.filter(t => t.type === "EXPENSE").forEach(t => {
      map[t.category] = (map[t.category] || 0) + t.amount;
    });
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, value]) => ({ name, value }));
  }, [transactions]);

  const recentTransactions = useMemo(() =>
    [...transactions].sort((a, b) => {
      try { return new Date(b.date) - new Date(a.date); } catch { return 0; }
    }).slice(0, 5),
    [transactions]
  );

  const topInsights = insights.slice(0, 3);

  // Scores
  const savingsScore = Math.min(100, Math.round(savingsRate * 3));
  const investmentScore = Math.min(100, Math.round((totalInvestments > 0 ? 60 : 0) + (weightedReturn > 10 ? 20 : weightedReturn > 7 ? 10 : 0) + (holdings.length > 3 ? 20 : holdings.length > 1 ? 10 : 0)));
  const emergencyScore = Math.min(100, Math.round(emergencyMonths * 16.67));
  const overallScore = Math.round((healthScore / 10) * 0.4 + savingsScore * 0.2 + investmentScore * 0.2 + emergencyScore * 0.2);

  const catColors = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#3b82f6"];

  const cardBg = darkMode ? "#1e293b" : "#ffffff";
  const cardBorder = darkMode ? "rgba(51,65,85,0.7)" : CARD_BORDER;
  const textPrimary = darkMode ? "#f1f5f9" : C.onSurface;
  const textMuted = darkMode ? "#94a3b8" : "#64748b";

  return (
    <>
      <Header title="Dashboard" onMenuToggle={onMenuToggle} healthScore={healthScore} darkMode={darkMode} userId={userId} />

      <main className="flex-1 p-4 md:p-8 max-w-[1600px] mx-auto w-full overflow-y-auto space-y-6 animate-fade-in">

        {/* ── Welcome Banner ── */}
        <div
          className="rounded-3xl p-6 md:p-8 relative overflow-hidden text-white"
          style={{ background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #1e1b4b 100%)" }}
        >
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-indigo-500/10 blur-3xl animate-blob" />
            <div className="absolute bottom-0 left-20 w-32 h-32 rounded-full bg-violet-500/10 blur-2xl animate-blob animation-delay-2000" />
          </div>
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Flame size={16} className="text-amber-400" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-300">
                  Financial Dashboard
                </span>
              </div>
              <h2 className="text-2xl md:text-3xl font-black tracking-tight mb-1">
                Welcome back, {userId}!
              </h2>
              <p className="text-indigo-200 text-sm font-medium">
                Your net worth is{" "}
                <span className="text-white font-black">
                  {formatCurrency(netWorth, currency)}
                </span>{" "}
                · Savings rate{" "}
                <span className={savingsRate >= 20 ? "text-emerald-300 font-black" : "text-amber-300 font-black"}>
                  {savingsRate.toFixed(1)}%
                </span>
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-center">
                <p className="text-[10px] uppercase font-bold tracking-widest text-indigo-300 mb-1">Health Score</p>
                <div className="text-4xl font-black text-white">{healthScore}</div>
                <div className="text-[10px] text-indigo-300 font-semibold mt-0.5">out of 1000</div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Top KPI Row ── */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1,2,3,4].map(i => <SkeletonCard key={i} />)}
          </div>
        ) : (
          <motion.div
            className="grid grid-cols-2 md:grid-cols-4 gap-4"
            variants={staggerContainer}
            initial="hidden"
            animate="show"
          >
            {[
              {
                label: "Net Worth",
                rawVal: netWorth,
                icon: Wallet,
                iconBg: "rgba(99,102,241,0.1)",
                iconColor: "#6366f1",
                trend: netSavings >= 0 ? "↑ Positive" : "↓ Negative",
                trendUp: netSavings >= 0,
              },
              {
                label: "Total Investments",
                rawVal: totalInvestments,
                icon: Briefcase,
                iconBg: "rgba(139,92,246,0.1)",
                iconColor: "#8b5cf6",
                trend: `${holdings.length} assets`,
                trendUp: undefined,
              },
              {
                label: "Monthly Savings",
                rawVal: netSavings,
                icon: PiggyBank,
                iconBg: netSavings >= 0 ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)",
                iconColor: netSavings >= 0 ? "#10b981" : "#ef4444",
                trend: `${savingsRate.toFixed(1)}% rate`,
                trendUp: savingsRate >= 20,
              },
              {
                label: "Emergency Fund",
                rawVal: emergencyMonths,
                formatter: v => `${Math.round(v)} mo`,
                icon: ShieldCheck,
                iconBg: emergencyMonths >= 6 ? "rgba(16,185,129,0.1)" : "rgba(245,158,11,0.1)",
                iconColor: emergencyMonths >= 6 ? "#10b981" : "#f59e0b",
                trend: emergencyMonths >= 6 ? "✓ Adequate" : "⚠ Low",
                trendUp: emergencyMonths >= 6,
              },
            ].map((stat, i) => (
              <motion.div
                key={i}
                variants={staggerItem}
                className="rounded-2xl border p-5 flex items-center justify-between hover:shadow-lg transition-all duration-300 card-hover"
                style={{ background: cardBg, borderColor: cardBorder }}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] uppercase font-bold tracking-widest mb-1" style={{ color: textMuted }}>
                    {stat.label}
                  </p>
                  <div className="text-xl font-black" style={{ color: textPrimary }}>
                    <AnimatedCounter
                      value={stat.rawVal}
                      formatter={stat.formatter || ((v) => formatCurrency(v, currency))}
                    />
                  </div>
                  {stat.trend && (
                    <p
                      className="text-[10px] font-bold mt-1"
                      style={{ color: stat.trendUp === true ? "#10b981" : stat.trendUp === false ? "#ef4444" : textMuted }}
                    >
                      {stat.trend}
                    </p>
                  )}
                </div>
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center ml-3 shrink-0"
                  style={{ background: stat.iconBg, color: stat.iconColor }}
                >
                  <stat.icon size={18} />
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* ── Scores Row ── */}
        <motion.div
          className="grid grid-cols-2 md:grid-cols-4 gap-4"
          variants={staggerContainer}
          initial="hidden"
          animate="show"
        >
          {[
            { label: "Financial Health", score: Math.min(100, Math.round(healthScore / 10)), max: 100 },
            { label: "Savings Score", score: savingsScore, max: 100 },
            { label: "Investment Score", score: investmentScore, max: 100 },
            { label: "Emergency Score", score: emergencyScore, max: 100 },
          ].map((item, i) => {
            const color = getScoreColor(item.score, item.max);
            return (
              <motion.div
                key={i}
                variants={staggerItem}
                className="rounded-2xl border p-5 flex flex-col items-center card-hover transition-all duration-300"
                style={{ background: cardBg, borderColor: cardBorder }}
              >
                <ScoreGauge score={item.score} max={item.max} color={color} size={90} strokeWidth={7}>
                  <div className="flex flex-col items-center">
                    <span className="text-xl font-black" style={{ color }}>{item.score}</span>
                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">/100</span>
                  </div>
                </ScoreGauge>
                <p className="text-[10px] uppercase font-bold tracking-widest mt-3" style={{ color: textMuted }}>
                  {item.label}
                </p>
              </motion.div>
            );
          })}
        </motion.div>

        {/* ── Main Grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* Cash Flow Chart */}
          <div
            className="lg:col-span-8 rounded-2xl border p-6 card-hover transition-all duration-300"
            style={{ background: cardBg, borderColor: cardBorder }}
          >
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-lg font-bold" style={{ color: textPrimary }}>
                  Cash Flow Overview
                </h3>
                <p className="text-xs mt-0.5" style={{ color: textMuted }}>
                  Last 6 months · Income vs Expenses
                </p>
              </div>
              <button
                onClick={() => onNavigate("cashflow")}
                className="text-xs font-bold text-indigo-500 hover:text-indigo-600 flex items-center gap-1 transition-colors"
              >
                View All <ChevronRight size={14} />
              </button>
            </div>
            <div className="h-56">
              {cashFlowChart.length === 0 ? (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center">
                    <BarChart2 size={32} className="mx-auto mb-3 opacity-20" style={{ color: textMuted }} />
                    <p className="text-sm font-semibold" style={{ color: textMuted }}>
                      No transactions yet
                    </p>
                    <button
                      onClick={() => onNavigate("cashflow")}
                      className="mt-3 text-xs font-bold text-indigo-500 hover:underline"
                    >
                      Upload CSV to get started
                    </button>
                  </div>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={cashFlowChart} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke={darkMode ? "#1e293b" : "#f1f5f9"} vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: textMuted }} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: textMuted }} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        background: cardBg,
                        border: `1px solid ${cardBorder}`,
                        borderRadius: "12px",
                        boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
                        color: textPrimary,
                        fontSize: "12px",
                      }}
                    />
                    <Area type="monotone" dataKey="income" stroke="#10b981" fill="url(#incomeGrad)" strokeWidth={2} name="Income" />
                    <Area type="monotone" dataKey="expense" stroke="#ef4444" fill="url(#expenseGrad)" strokeWidth={2} name="Expense" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Portfolio Allocation Donut */}
          <div
            className="lg:col-span-4 rounded-2xl border p-6 card-hover transition-all duration-300"
            style={{ background: cardBg, borderColor: cardBorder }}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold" style={{ color: textPrimary }}>
                Portfolio Mix
              </h3>
              <button
                onClick={() => onNavigate("portfolio")}
                className="text-xs font-bold text-indigo-500 flex items-center gap-1"
              >
                Details <ChevronRight size={14} />
              </button>
            </div>
            {holdings.length === 0 ? (
              <div className="h-40 flex items-center justify-center">
                <p className="text-sm font-semibold text-center" style={{ color: textMuted }}>
                  No holdings yet.<br />
                  <button onClick={() => onNavigate("portfolio")} className="text-indigo-500 hover:underline text-xs mt-1">Add assets →</button>
                </p>
              </div>
            ) : (
              <>
                <div className="relative flex justify-center">
                  <ResponsiveContainer width="100%" height={160}>
                    <PieChart>
                      <Pie
                        data={holdings.slice(0, 5)}
                        dataKey="amount"
                        nameKey="assetName"
                        innerRadius={45}
                        outerRadius={70}
                        paddingAngle={2}
                      >
                        {holdings.slice(0, 5).map((_, i) => (
                          <Cell key={i} fill={catColors[i % catColors.length]} stroke="none" />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(v) => [formatCurrency(v, currency), ""]}
                        contentStyle={{
                          background: cardBg,
                          border: `1px solid ${cardBorder}`,
                          borderRadius: "12px",
                          fontSize: "11px",
                          color: textPrimary,
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-xs font-bold text-slate-400">Return</span>
                    <span className="text-2xl font-black" style={{ color: C.secondary }}>
                      {weightedReturn.toFixed(1)}%
                    </span>
                  </div>
                </div>
                <div className="mt-3 space-y-1.5">
                  {holdings.slice(0, 3).map((h, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ background: catColors[i] }} />
                        <span className="text-xs font-semibold truncate max-w-[100px]" style={{ color: textPrimary }}>
                          {h.assetName}
                        </span>
                      </div>
                      <span className="text-xs font-bold" style={{ color: C.secondary }}>
                        {totalInvestments > 0 ? Math.round((h.amount / totalInvestments) * 100) : 0}%
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* ── Bottom Grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* Recent Transactions */}
          <div
            className="lg:col-span-5 rounded-2xl border overflow-hidden card-hover transition-all duration-300"
            style={{ background: cardBg, borderColor: cardBorder }}
          >
            <div className="px-6 py-4 border-b flex justify-between items-center" style={{ borderColor: cardBorder }}>
              <h3 className="font-bold text-base" style={{ color: textPrimary }}>
                Recent Transactions
              </h3>
              <button
                onClick={() => onNavigate("cashflow")}
                className="text-xs font-bold text-indigo-500 flex items-center gap-1"
              >
                All <ChevronRight size={12} />
              </button>
            </div>
            <div className="divide-y" style={{ borderColor: darkMode ? "rgba(51,65,85,0.5)" : "rgba(228,228,231,0.5)" }}>
              {recentTransactions.length === 0 ? (
                <div className="px-6 py-8 text-center">
                  <Clock size={28} className="mx-auto mb-2 opacity-20" style={{ color: textMuted }} />
                  <p className="text-sm font-semibold" style={{ color: textMuted }}>No transactions yet</p>
                </div>
              ) : (
                recentTransactions.map((t, i) => (
                  <div key={i} className="px-6 py-3.5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-xl flex items-center justify-center"
                        style={{
                          background: t.type === "INCOME" ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)",
                          color: t.type === "INCOME" ? "#10b981" : "#ef4444",
                        }}
                      >
                        {t.type === "INCOME" ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                      </div>
                      <div>
                        <p className="text-xs font-bold" style={{ color: textPrimary }}>{t.description}</p>
                        <p className="text-[10px] font-medium" style={{ color: textMuted }}>{t.category} · {t.date}</p>
                      </div>
                    </div>
                    <span
                      className="text-sm font-black"
                      style={{ color: t.type === "INCOME" ? "#10b981" : textPrimary }}
                    >
                      {t.type === "INCOME" ? "+" : "-"}{formatCurrency(t.amount, currency)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* AI Insights Preview */}
          <div
            className="lg:col-span-4 rounded-2xl border overflow-hidden card-hover transition-all duration-300"
            style={{ background: cardBg, borderColor: cardBorder }}
          >
            <div className="px-6 py-4 border-b flex justify-between items-center" style={{ borderColor: cardBorder }}>
              <h3 className="font-bold text-base flex items-center gap-2" style={{ color: textPrimary }}>
                <Brain size={16} className="text-indigo-500" />
                AI Insights
              </h3>
              <button
                onClick={() => onNavigate("insights")}
                className="text-xs font-bold text-indigo-500 flex items-center gap-1"
              >
                All <ChevronRight size={12} />
              </button>
            </div>
            <div className="p-4 space-y-3">
              {topInsights.length === 0 ? (
                <div className="py-6 text-center">
                  <Zap size={28} className="mx-auto mb-2 opacity-20" style={{ color: textMuted }} />
                  <p className="text-sm font-semibold" style={{ color: textMuted }}>
                    Insights loading...
                  </p>
                </div>
              ) : (
                topInsights.map((ins, i) => {
                  const colors = {
                    success: { bg: "rgba(16,185,129,0.08)", border: "#10b981", text: "#10b981" },
                    warning: { bg: "rgba(239,68,68,0.08)", border: "#ef4444", text: "#ef4444" },
                    tip: { bg: "rgba(99,102,241,0.08)", border: "#6366f1", text: "#6366f1" },
                    info: { bg: "rgba(59,130,246,0.08)", border: "#3b82f6", text: "#3b82f6" },
                  };
                  const c = colors[ins.type] || colors.info;
                  return (
                    <div
                      key={i}
                      className="rounded-xl p-3.5"
                      style={{ background: c.bg, borderLeft: `3px solid ${c.border}` }}
                    >
                      <p className="text-xs font-bold mb-0.5" style={{ color: c.text }}>{ins.title}</p>
                      <p className="text-[11px] font-medium leading-relaxed" style={{ color: textMuted }}>
                        {ins.description?.slice(0, 80)}...
                      </p>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Retirement & Goals */}
          <div
            className="lg:col-span-3 rounded-2xl border p-6 card-hover transition-all duration-300"
            style={{ background: cardBg, borderColor: cardBorder }}
          >
            <h3 className="font-bold text-base mb-5" style={{ color: textPrimary }}>
              Goal Progress
            </h3>
            <div className="space-y-5">
              {/* Retirement */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold" style={{ color: textPrimary }}>Retirement</span>
                  <span className="text-xs font-black" style={{ color: retirementPct >= 80 ? "#10b981" : C.secondary }}>
                    {retirementPct}%
                  </span>
                </div>
                <div className="h-2 rounded-full" style={{ background: darkMode ? "#1e293b" : "#f1f5f9" }}>
                  <div
                    className="h-full rounded-full animate-progress-fill transition-all duration-1000"
                    style={{
                      width: `${retirementPct}%`,
                      background: retirementPct >= 80 ? "#10b981" : `linear-gradient(90deg, ${C.secondary}, ${C.secondaryContainer})`,
                    }}
                  />
                </div>
              </div>

              {/* Emergency Fund */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold" style={{ color: textPrimary }}>Emergency Fund</span>
                  <span className="text-xs font-black" style={{ color: emergencyMonths >= 6 ? "#10b981" : "#f59e0b" }}>
                    {Math.min(emergencyMonths, 6)}/6 mo
                  </span>
                </div>
                <div className="h-2 rounded-full" style={{ background: darkMode ? "#1e293b" : "#f1f5f9" }}>
                  <div
                    className="h-full rounded-full animate-progress-fill transition-all duration-1000"
                    style={{
                      width: `${Math.min(100, (emergencyMonths / 6) * 100)}%`,
                      background: emergencyMonths >= 6 ? "#10b981" : "#f59e0b",
                    }}
                  />
                </div>
              </div>

              {/* Savings Rate */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold" style={{ color: textPrimary }}>Savings Rate</span>
                  <span className="text-xs font-black" style={{ color: savingsRate >= 20 ? "#10b981" : "#f59e0b" }}>
                    {savingsRate.toFixed(0)}% / 20%
                  </span>
                </div>
                <div className="h-2 rounded-full" style={{ background: darkMode ? "#1e293b" : "#f1f5f9" }}>
                  <div
                    className="h-full rounded-full animate-progress-fill transition-all duration-1000"
                    style={{
                      width: `${Math.min(100, (savingsRate / 20) * 100)}%`,
                      background: savingsRate >= 20 ? "#10b981" : `linear-gradient(90deg, #f59e0b, #f97316)`,
                    }}
                  />
                </div>
              </div>

              {/* Investment Growth */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold" style={{ color: textPrimary }}>Portfolio Return</span>
                  <span className="text-xs font-black" style={{ color: weightedReturn >= 10 ? "#10b981" : C.secondary }}>
                    {weightedReturn.toFixed(1)}% p.a.
                  </span>
                </div>
                <div className="h-2 rounded-full" style={{ background: darkMode ? "#1e293b" : "#f1f5f9" }}>
                  <div
                    className="h-full rounded-full animate-progress-fill transition-all duration-1000"
                    style={{
                      width: `${Math.min(100, (weightedReturn / 15) * 100)}%`,
                      background: `linear-gradient(90deg, ${C.secondary}, #8b5cf6)`,
                    }}
                  />
                </div>
              </div>
            </div>

            <button
              onClick={() => onNavigate("retirement")}
              className="mt-6 w-full py-2.5 rounded-xl text-xs font-bold text-indigo-600 border border-indigo-200 hover:bg-indigo-50 dark:border-indigo-900/50 dark:hover:bg-indigo-900/20 transition-all"
            >
              View Retirement Plan →
            </button>
          </div>
        </div>

        {/* ── Top Spending Categories ── */}
        {categorySpend.length > 0 && (
          <div
            className="rounded-2xl border p-6 card-hover transition-all duration-300"
            style={{ background: cardBg, borderColor: cardBorder }}
          >
            <div className="flex justify-between items-center mb-5">
              <h3 className="font-bold text-base" style={{ color: textPrimary }}>
                Top Spending Categories
              </h3>
              <button
                onClick={() => onNavigate("cashflow")}
                className="text-xs font-bold text-indigo-500 flex items-center gap-1"
              >
                Analyze <ChevronRight size={14} />
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {categorySpend.map((cat, i) => {
                const pct = totalExpense > 0 ? Math.round((cat.value / totalExpense) * 100) : 0;
                return (
                  <div
                    key={i}
                    className="rounded-xl p-4 text-center"
                    style={{ background: darkMode ? "rgba(51,65,85,0.3)" : "#f8fafc" }}
                  >
                    <div
                      className="w-8 h-8 rounded-full mx-auto mb-2 flex items-center justify-center text-white text-[10px] font-black"
                      style={{ background: catColors[i % catColors.length] }}
                    >
                      {pct}%
                    </div>
                    <p className="text-[10px] font-bold truncate" style={{ color: textPrimary }}>{cat.name}</p>
                    <p className="text-[10px] font-semibold" style={{ color: textMuted }}>
                      {formatCurrency(cat.value, currency)}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </>
  );
}
