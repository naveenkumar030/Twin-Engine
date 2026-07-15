import React, { useState, useEffect, useMemo } from "react";
import {
  Brain, CheckCircle, AlertTriangle, Lightbulb, HelpCircle, Activity,
  RefreshCw, TrendingUp, TrendingDown, PiggyBank, ShieldCheck, Briefcase,
  Target, Zap, ArrowUpRight, ArrowDownRight, Sparkles,
} from "lucide-react";
import {
  RadialBarChart, RadialBar, PolarAngleAxis, ResponsiveContainer,
} from "recharts";
import { C, getScoreColor } from "../constants/theme";
import { fetchInsights, fetchTransactions, fetchHoldings } from "../services/api";
import Header from "../components/Header";
import ScoreGauge from "../components/ScoreGauge";

// ── Helpers ──
function formatCurrency(val, currency = "₹") {
  if (Math.abs(val) >= 10000000) return `${currency}${(val / 10000000).toFixed(2)}Cr`;
  if (Math.abs(val) >= 100000) return `${currency}${(val / 100000).toFixed(1)}L`;
  if (Math.abs(val) >= 1000) return `${currency}${(val / 1000).toFixed(1)}K`;
  return `${currency}${Math.round(val).toLocaleString()}`;
}

const iconMap = {
  success: CheckCircle,
  warning: AlertTriangle,
  tip: Lightbulb,
  info: HelpCircle,
};

const insightColors = {
  success: { bg: "rgba(16,185,129,0.08)", border: "#10b981", text: "#10b981", badge: "rgba(16,185,129,0.12)" },
  warning: { bg: "rgba(239,68,68,0.08)", border: "#ef4444", text: "#ef4444", badge: "rgba(239,68,68,0.12)" },
  tip:     { bg: "rgba(99,102,241,0.08)", border: "#6366f1", text: "#6366f1", badge: "rgba(99,102,241,0.12)" },
  info:    { bg: "rgba(59,130,246,0.08)", border: "#3b82f6", text: "#3b82f6", badge: "rgba(59,130,246,0.12)" },
};

// ── Client-side analytics ──
function computeClientInsights(transactions, holdings, currency = "₹") {
  const totalIncome = transactions.filter(t => t.type === "INCOME").reduce((s, t) => s + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === "EXPENSE").reduce((s, t) => s + t.amount, 0);
  const netSavings = totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? (netSavings / totalIncome) * 100 : 0;
  const totalInvestments = holdings.reduce((s, h) => s + h.amount, 0);
  const weightedReturn = totalInvestments > 0
    ? holdings.reduce((s, h) => s + (h.amount / totalInvestments) * (h.growthRate || 0), 0) : 0;
  const categories = [...new Set(holdings.map(h => h.category || ""))].filter(Boolean).length;

  // Monthly expenses
  const months = new Set(transactions.filter(t => t.type === "EXPENSE").map(t => {
    try { return new Date(t.date).toISOString().slice(0, 7); } catch { return ""; }
  })).size || 1;
  const monthlyExpense = totalExpense / months;
  const emergencyMonths = monthlyExpense > 0 ? Math.round(netSavings / monthlyExpense) : 0;

  // Category spend
  const catMap = {};
  transactions.filter(t => t.type === "EXPENSE").forEach(t => { catMap[t.category] = (catMap[t.category] || 0) + t.amount; });
  const topCat = Object.entries(catMap).sort((a, b) => b[1] - a[1])[0];
  const topCatPct = totalExpense > 0 && topCat ? Math.round((topCat[1] / totalExpense) * 100) : 0;

  // Scores
  const savingsScore  = Math.min(100, Math.round(savingsRate * 3));
  const investScore   = Math.min(100, Math.round(
    (totalInvestments > 0 ? 50 : 0) + (weightedReturn > 10 ? 25 : weightedReturn > 7 ? 15 : 5) + (categories > 3 ? 25 : categories > 1 ? 15 : 0)
  ));
  const budgetScore   = Math.min(100, Math.max(0, 100 - Math.round(topCatPct * 0.8)));
  const riskScore     = Math.min(100, Math.round(categories * 15 + (totalInvestments > 0 ? 25 : 0) + (emergencyMonths >= 6 ? 25 : emergencyMonths * 4)));

  return { savingsRate, savingsScore, investScore, budgetScore, riskScore, totalInvestments, totalExpense, totalIncome, netSavings, emergencyMonths, weightedReturn, topCat, topCatPct, categories, monthlyExpense };
}

function generateNarrative(metrics, currency) {
  const { savingsRate, savingsScore, investScore, totalInvestments, totalIncome, netSavings, emergencyMonths, weightedReturn, categories } = metrics;

  const condition = savingsScore >= 60 && investScore >= 60
    ? "Your overall financial condition is **strong**. You're saving consistently and your investment portfolio is well-diversified."
    : savingsScore >= 40
    ? "Your finances are **moderate**. Savings are building but investments need attention."
    : "Your financial condition needs **immediate attention**. Savings and investment gaps detected.";

  const strengths = [];
  if (savingsRate >= 20) strengths.push(`solid savings rate of ${savingsRate.toFixed(1)}%`);
  if (weightedReturn > 10) strengths.push(`high portfolio return of ${weightedReturn.toFixed(1)}%`);
  if (emergencyMonths >= 6) strengths.push(`${emergencyMonths}-month emergency fund`);
  if (categories >= 4) strengths.push(`${categories} diversified asset classes`);

  const weaknesses = [];
  if (savingsRate < 20) weaknesses.push("savings rate below recommended 20%");
  if (emergencyMonths < 6) weaknesses.push(`emergency fund covers only ${emergencyMonths} months`);
  if (categories < 3) weaknesses.push("low portfolio diversification");
  if (weightedReturn < 8) weaknesses.push("portfolio return below inflation-adjusted target");

  const nextActions = [];
  if (savingsRate < 20) nextActions.push(`Increase monthly savings by ${formatCurrency((totalIncome * 0.2 - netSavings) / 1, currency)}`);
  if (emergencyMonths < 6) nextActions.push("Build emergency fund to 6 months of expenses");
  if (categories < 3) nextActions.push("Add ETFs or bonds for diversification");
  nextActions.push("Review and rebalance portfolio quarterly");

  return { condition, strengths, weaknesses, nextActions };
}

export default function InsightsPage({ userId, onMenuToggle, healthScore: headerHealthScore, darkMode, currency = "₹" }) {
  const [insights, setInsights] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [holdings, setHoldings] = useState([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState("scores"); // scores | narrative | insights

  const loadData = () => {
    if (!userId) return;
    setLoading(true);
    Promise.all([
      fetchInsights(userId),
      fetchTransactions(userId),
      fetchHoldings(userId),
    ]).then(([ins, txns, hold]) => {
      setInsights(ins || []);
      setTransactions(txns || []);
      setHoldings(hold || []);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { if (userId) loadData(); }, [userId]);

  // Health score from insights
  let healthScore = 800;
  if (insights.length > 0) {
    const warnings = insights.filter(i => i.type === "warning").length;
    const successes = insights.filter(i => i.type === "success").length;
    const tips = insights.filter(i => i.type === "tip").length;
    healthScore = 800 - warnings * 120 + successes * 40 + tips * 20;
    healthScore = Math.max(250, Math.min(1000, healthScore));
  }

  const metrics = useMemo(() => computeClientInsights(transactions, holdings, currency), [transactions, holdings, currency]);
  const narrative = useMemo(() => generateNarrative(metrics, currency), [metrics, currency]);

  const overallScore = Math.round(
    Math.min(100, healthScore / 10) * 0.3 +
    metrics.savingsScore * 0.2 +
    metrics.investScore * 0.2 +
    metrics.budgetScore * 0.15 +
    metrics.riskScore * 0.15
  );

  const scoreRating = overallScore >= 80 ? { text: "Outstanding", color: "#10b981" }
    : overallScore >= 65 ? { text: "Strong", color: "#6366f1" }
    : overallScore >= 45 ? { text: "Moderate", color: "#f59e0b" }
    : { text: "Vulnerable", color: "#ef4444" };

  const filteredInsights = filter === "all" ? insights : insights.filter(i => i.category?.toLowerCase() === filter.toLowerCase());

  const cardBg = darkMode ? "#1e293b" : "#ffffff";
  const cardBorder = darkMode ? "rgba(51,65,85,0.7)" : "rgba(228,228,231,0.8)";
  const textPrimary = darkMode ? "#f1f5f9" : C.onSurface;
  const textMuted = darkMode ? "#94a3b8" : "#64748b";
  const subBg = darkMode ? "rgba(51,65,85,0.25)" : "#f8fafc";

  const scores = [
    { label: "Financial Health", score: Math.min(100, Math.round(healthScore / 10)), icon: Activity, color: getScoreColor(Math.min(100, Math.round(healthScore / 10))) },
    { label: "Savings Score",    score: metrics.savingsScore, icon: PiggyBank, color: getScoreColor(metrics.savingsScore) },
    { label: "Investment Score", score: metrics.investScore,  icon: Briefcase, color: getScoreColor(metrics.investScore) },
    { label: "Budget Score",     score: metrics.budgetScore,  icon: Target, color: getScoreColor(metrics.budgetScore) },
    { label: "Risk Score",       score: metrics.riskScore,    icon: ShieldCheck, color: getScoreColor(metrics.riskScore) },
  ];

  const recommendations = [
    metrics.savingsRate < 20 && {
      icon: PiggyBank, color: "#10b981", bg: "rgba(16,185,129,0.08)",
      title: "Boost Your Savings Rate",
      desc: `Current savings rate is ${metrics.savingsRate.toFixed(1)}%. Target 20%+ for financial independence. Try automating a SIP of ${formatCurrency((metrics.totalIncome * 0.2 - metrics.netSavings) / 12, currency)}/month.`,
    },
    metrics.emergencyMonths < 6 && {
      icon: ShieldCheck, color: "#f59e0b", bg: "rgba(245,158,11,0.08)",
      title: "Strengthen Emergency Fund",
      desc: `Your emergency fund covers ${metrics.emergencyMonths} months. Aim for 6 months of expenses (${formatCurrency(metrics.monthlyExpense * 6, currency)}).`,
    },
    metrics.categories < 3 && {
      icon: Briefcase, color: "#6366f1", bg: "rgba(99,102,241,0.08)",
      title: "Diversify Your Portfolio",
      desc: `You hold ${metrics.categories} asset class${metrics.categories === 1 ? "" : "es"}. Add ETFs, bonds, or gold to reduce concentration risk.`,
    },
    metrics.weightedReturn < 10 && metrics.totalInvestments > 0 && {
      icon: TrendingUp, color: "#8b5cf6", bg: "rgba(139,92,246,0.08)",
      title: "Improve Portfolio Returns",
      desc: `Current weighted return is ${metrics.weightedReturn.toFixed(1)}%. Consider index funds or equity mutual funds for 10–12% CAGR targets.`,
    },
    {
      icon: Target, color: "#3b82f6", bg: "rgba(59,130,246,0.08)",
      title: "Review Portfolio Quarterly",
      desc: "Rebalancing annually to your target allocation can improve returns by 1–2% while managing risk effectively.",
    },
  ].filter(Boolean).slice(0, 4);

  return (
    <>
      <Header title="Personalized Insights" onMenuToggle={onMenuToggle} healthScore={headerHealthScore} darkMode={darkMode} userId={userId} />

      <main className="flex-1 p-4 md:p-8 max-w-[1600px] mx-auto w-full overflow-y-auto animate-fade-in space-y-6">

        {/* ── Header Banner ── */}
        <div
          className="rounded-3xl p-6 md:p-8 relative overflow-hidden text-white"
          style={{ background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #1e1b4b 100%)" }}
        >
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-indigo-500/10 blur-3xl animate-blob" />
            <div className="absolute bottom-0 left-20 w-32 h-32 rounded-full bg-violet-500/10 blur-2xl animate-blob animation-delay-2000" />
          </div>
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Brain size={16} className="text-indigo-300" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-300">AI-Powered Analytics</span>
              </div>
              <h2 className="text-2xl md:text-3xl font-black tracking-tight mb-1">Personalized Insights</h2>
              <p className="text-indigo-200 text-sm font-medium">
                Overall Score: <span className="text-white font-black text-lg">{overallScore}</span>/100
                &nbsp;·&nbsp;
                <span style={{ color: scoreRating.color }}>{scoreRating.text}</span>
              </p>
            </div>
            <button
              onClick={loadData}
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 font-bold text-sm transition-all cursor-pointer active:scale-95 text-white disabled:opacity-60"
            >
              <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
              Re-evaluate
            </button>
          </div>
        </div>

        {/* ── Section Tabs ── */}
        <div className="flex gap-2 flex-wrap">
          {[
            { key: "scores", label: "Score Dashboard" },
            { key: "narrative", label: "AI Summary" },
            { key: "insights", label: "Insight Cards" },
          ].map(s => (
            <button
              key={s.key}
              onClick={() => setActiveSection(s.key)}
              className="px-4 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer"
              style={activeSection === s.key
                ? { background: C.secondary, color: "#fff", borderColor: C.secondary }
                : { background: cardBg, color: textMuted, borderColor: cardBorder }
              }
            >
              {s.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="h-64 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2" style={{ borderColor: C.secondary }} />
              <p className="text-sm font-semibold" style={{ color: textMuted }}>Analyzing your finances...</p>
            </div>
          </div>
        ) : (
          <>
            {/* ──────────────────────────────────────────────── */}
            {/* SCORES SECTION */}
            {/* ──────────────────────────────────────────────── */}
            {activeSection === "scores" && (
              <div className="space-y-6">
                {/* Overall Score Card */}
                <div
                  className="rounded-2xl border p-6 md:p-8 flex flex-col md:flex-row items-center gap-8"
                  style={{ background: cardBg, borderColor: cardBorder }}
                >
                  <div className="flex flex-col items-center shrink-0">
                    <ScoreGauge score={overallScore} max={100} color={scoreRating.color} size={140} strokeWidth={10}>
                      <div className="flex flex-col items-center">
                        <span className="text-4xl font-black" style={{ color: scoreRating.color }}>{overallScore}</span>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">/100</span>
                      </div>
                    </ScoreGauge>
                    <p className="mt-3 text-base font-black" style={{ color: scoreRating.color }}>{scoreRating.text}</p>
                    <p className="text-[10px] uppercase font-bold tracking-widest mt-1" style={{ color: textMuted }}>Overall Score</p>
                  </div>
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                    {[
                      { label: "Total Investments", value: formatCurrency(metrics.totalInvestments, currency), icon: Briefcase, up: metrics.totalInvestments > 0 },
                      { label: "Net Savings", value: formatCurrency(metrics.netSavings, currency), icon: PiggyBank, up: metrics.netSavings >= 0 },
                      { label: "Emergency Fund", value: `${metrics.emergencyMonths} months`, icon: ShieldCheck, up: metrics.emergencyMonths >= 6 },
                      { label: "Portfolio Return", value: `${metrics.weightedReturn.toFixed(1)}% p.a.`, icon: TrendingUp, up: metrics.weightedReturn >= 10 },
                    ].map((item, i) => (
                      <div key={i} className="flex items-center gap-3 p-4 rounded-xl" style={{ background: subBg }}>
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                          style={{ background: item.up ? "rgba(16,185,129,0.1)" : "rgba(245,158,11,0.1)", color: item.up ? "#10b981" : "#f59e0b" }}>
                          <item.icon size={16} />
                        </div>
                        <div>
                          <p className="text-[10px] uppercase font-bold tracking-widest" style={{ color: textMuted }}>{item.label}</p>
                          <p className="text-base font-black" style={{ color: textPrimary }}>{item.value}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 5 Score Gauges */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  {scores.map((s, i) => (
                    <div
                      key={i}
                      className="rounded-2xl border p-5 flex flex-col items-center card-hover transition-all duration-300"
                      style={{ background: cardBg, borderColor: cardBorder }}
                    >
                      <ScoreGauge score={s.score} max={100} color={s.color} size={90} strokeWidth={7}>
                        <div className="flex flex-col items-center">
                          <span className="text-xl font-black" style={{ color: s.color }}>{s.score}</span>
                          <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">/100</span>
                        </div>
                      </ScoreGauge>
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center mt-3 mb-1"
                        style={{ background: `${s.color}15`, color: s.color }}>
                        <s.icon size={16} />
                      </div>
                      <p className="text-[10px] uppercase font-bold tracking-widest text-center" style={{ color: textMuted }}>
                        {s.label}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Recommendations */}
                <div>
                  <h3 className="text-base font-bold mb-4 flex items-center gap-2" style={{ color: textPrimary }}>
                    <Sparkles size={16} className="text-indigo-500" />
                    Smart Recommendations
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {recommendations.map((rec, i) => (
                      <div
                        key={i}
                        className="rounded-2xl border p-5 card-hover transition-all duration-300"
                        style={{ background: cardBg, borderColor: cardBorder }}
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                            style={{ background: rec.bg, color: rec.color }}>
                            <rec.icon size={18} />
                          </div>
                          <div>
                            <p className="text-sm font-bold mb-1" style={{ color: textPrimary }}>{rec.title}</p>
                            <p className="text-xs font-medium leading-relaxed" style={{ color: textMuted }}>{rec.desc}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ──────────────────────────────────────────────── */}
            {/* AI NARRATIVE SECTION */}
            {/* ──────────────────────────────────────────────── */}
            {activeSection === "narrative" && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Main Narrative */}
                <div className="lg:col-span-8 space-y-5">
                  {/* Current Condition */}
                  <div className="rounded-2xl border p-6" style={{ background: cardBg, borderColor: cardBorder }}>
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-indigo-500/10">
                        <Brain size={16} className="text-indigo-500" />
                      </div>
                      <h3 className="font-bold text-base" style={{ color: textPrimary }}>AI Financial Summary</h3>
                    </div>
                    <p className="text-sm leading-relaxed mb-5" style={{ color: textMuted }}>
                      {narrative.condition.replace(/\*\*/g, "")}
                    </p>

                    {/* Strengths */}
                    {narrative.strengths.length > 0 && (
                      <div className="mb-4">
                        <p className="text-[10px] uppercase font-bold tracking-widest mb-3 text-emerald-600">Strengths</p>
                        <div className="space-y-2">
                          {narrative.strengths.map((s, i) => (
                            <div key={i} className="flex items-center gap-2.5">
                              <CheckCircle size={14} className="text-emerald-500 shrink-0" />
                              <span className="text-sm font-semibold capitalize" style={{ color: textPrimary }}>{s}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Weaknesses */}
                    {narrative.weaknesses.length > 0 && (
                      <div className="mb-4">
                        <p className="text-[10px] uppercase font-bold tracking-widest mb-3 text-red-500">Areas to Improve</p>
                        <div className="space-y-2">
                          {narrative.weaknesses.map((w, i) => (
                            <div key={i} className="flex items-center gap-2.5">
                              <AlertTriangle size={14} className="text-amber-500 shrink-0" />
                              <span className="text-sm font-semibold capitalize" style={{ color: textPrimary }}>{w}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Next Actions */}
                    <div className="pt-4 border-t" style={{ borderColor: cardBorder }}>
                      <p className="text-[10px] uppercase font-bold tracking-widest mb-3 text-indigo-500">Next Actions</p>
                      <div className="space-y-2">
                        {narrative.nextActions.map((a, i) => (
                          <div key={i} className="flex items-start gap-2.5">
                            <Zap size={14} className="text-indigo-400 shrink-0 mt-0.5" />
                            <span className="text-sm font-semibold" style={{ color: textPrimary }}>{a}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sidebar: Score Cards */}
                <div className="lg:col-span-4 space-y-4">
                  <div className="rounded-2xl border p-6" style={{ background: cardBg, borderColor: cardBorder }}>
                    <h4 className="font-bold text-sm mb-5 flex items-center gap-2" style={{ color: textPrimary }}>
                      <Activity size={14} className="text-indigo-500" />
                      Quick Score Breakdown
                    </h4>
                    <div className="space-y-4">
                      {scores.map((s, i) => (
                        <div key={i}>
                          <div className="flex justify-between items-center mb-1.5">
                            <span className="text-xs font-semibold" style={{ color: textPrimary }}>{s.label}</span>
                            <span className="text-xs font-black" style={{ color: s.color }}>{s.score}/100</span>
                          </div>
                          <div className="h-1.5 rounded-full" style={{ background: darkMode ? "#334155" : "#f1f5f9" }}>
                            <div
                              className="h-full rounded-full animate-progress-fill transition-all duration-1000"
                              style={{ width: `${s.score}%`, background: s.color }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Key Metrics */}
                  <div className="rounded-2xl border p-5" style={{ background: cardBg, borderColor: cardBorder }}>
                    <h4 className="font-bold text-sm mb-4" style={{ color: textPrimary }}>Key Metrics</h4>
                    <div className="space-y-3">
                      {[
                        { label: "Savings Rate", value: `${metrics.savingsRate.toFixed(1)}%`, good: metrics.savingsRate >= 20 },
                        { label: "Emergency Fund", value: `${metrics.emergencyMonths} months`, good: metrics.emergencyMonths >= 6 },
                        { label: "Avg Portfolio Return", value: `${metrics.weightedReturn.toFixed(1)}%`, good: metrics.weightedReturn >= 10 },
                        { label: "Asset Classes", value: `${metrics.categories}`, good: metrics.categories >= 4 },
                      ].map((m, i) => (
                        <div key={i} className="flex justify-between items-center">
                          <span className="text-xs font-semibold" style={{ color: textMuted }}>{m.label}</span>
                          <span className="text-xs font-black" style={{ color: m.good ? "#10b981" : "#f59e0b" }}>
                            {m.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ──────────────────────────────────────────────── */}
            {/* INSIGHTS CARDS SECTION */}
            {/* ──────────────────────────────────────────────── */}
            {activeSection === "insights" && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-4">
                  <div
                    className="rounded-2xl border p-6 flex flex-col items-center text-center sticky top-4"
                    style={{ background: cardBg, borderColor: cardBorder }}
                  >
                    <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-10 pointer-events-none"
                      style={{ background: scoreRating.color }} />
                    <h3 className="text-base font-bold mb-5 self-start flex items-center gap-2" style={{ color: textPrimary }}>
                      <Activity size={16} className="text-indigo-500" />
                      Plan Health Index
                    </h3>
                    <ScoreGauge score={Math.min(100, Math.round(healthScore / 10))} max={100} color={scoreRating.color} size={140} strokeWidth={10}>
                      <div className="flex flex-col items-center">
                        <span className="text-3xl font-black" style={{ color: scoreRating.color }}>{healthScore}</span>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">/ 1000</span>
                      </div>
                    </ScoreGauge>
                    <div className="w-full text-center border-t pt-5 mt-5" style={{ borderColor: cardBorder }}>
                      <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: textMuted }}>Twin Status Rating</p>
                      <h4 className="text-2xl font-black" style={{ color: scoreRating.color }}>{scoreRating.text}</h4>
                      <p className="text-xs mt-3 px-2 font-medium leading-relaxed" style={{ color: textMuted }}>
                        Represents resilience of your retirement corpus against inflation, allocation risk, and cash-flow volatility.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-8 space-y-5">
                  {/* Category Filters */}
                  <div
                    className="flex p-1.5 rounded-2xl border max-w-md"
                    style={{ background: cardBg, borderColor: cardBorder }}
                  >
                    {[
                      { key: "all", label: "All" },
                      { key: "retirement", label: "Retirement" },
                      { key: "allocation", label: "Allocation" },
                      { key: "liquidity", label: "Liquidity" },
                    ].map(item => (
                      <button
                        key={item.key}
                        onClick={() => setFilter(item.key)}
                        className="flex-1 py-2 text-xs font-bold rounded-xl transition-all outline-none cursor-pointer"
                        style={filter === item.key
                          ? { background: C.secondary, color: "#ffffff" }
                          : { color: textMuted }
                        }
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>

                  {filteredInsights.length === 0 ? (
                    <div className="rounded-2xl border p-12 text-center" style={{ background: cardBg, borderColor: cardBorder }}>
                      <HelpCircle size={40} className="mx-auto mb-4 opacity-20" style={{ color: textMuted }} />
                      <p className="text-sm font-bold" style={{ color: textMuted }}>No insights found under this category.</p>
                    </div>
                  ) : (
                    <div className="space-y-4 animate-slide-up">
                      {filteredInsights.map((insight, idx) => {
                        const IconComponent = iconMap[insight.type] || HelpCircle;
                        const ic = insightColors[insight.type] || insightColors.info;
                        return (
                          <div
                            key={idx}
                            className="rounded-2xl border overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5"
                            style={{ background: cardBg, borderColor: cardBorder, borderLeft: `4px solid ${ic.border}` }}
                          >
                            <div className="p-6">
                              <div className="flex justify-between items-start gap-4 mb-3">
                                <div className="flex items-center gap-3">
                                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                                    style={{ background: ic.badge, color: ic.text }}>
                                    <IconComponent size={18} />
                                  </div>
                                  <div>
                                    <span
                                      className="text-[9px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded-full inline-block"
                                      style={{ background: subBg, color: textMuted }}
                                    >
                                      {insight.category}
                                    </span>
                                    <h4 className="text-sm font-bold mt-1" style={{ color: textPrimary }}>{insight.title}</h4>
                                  </div>
                                </div>
                                <div
                                  className="text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full whitespace-nowrap shrink-0"
                                  style={{ background: ic.badge, color: ic.text }}
                                >
                                  {insight.impactMetric}
                                </div>
                              </div>
                              <p className="text-xs mb-4 leading-relaxed font-medium" style={{ color: textMuted }}>
                                {insight.description}
                              </p>
                              {insight.actionableStep && (
                                <div
                                  className="p-3 rounded-xl border text-xs flex gap-2 items-start"
                                  style={{ background: subBg, borderColor: cardBorder }}
                                >
                                  <strong className="shrink-0 text-indigo-500 font-bold uppercase tracking-wider text-[9px] mt-0.5">Action:</strong>
                                  <span className="font-medium leading-relaxed" style={{ color: textMuted }}>{insight.actionableStep}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </>
  );
}
