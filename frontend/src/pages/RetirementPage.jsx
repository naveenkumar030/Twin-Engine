import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  ComposedChart, Area, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, LineChart,
} from "recharts";
import {
  SlidersHorizontal, Brain, CheckCircle, TrendingUp, Compass,
  Target, Flame, Zap, Download, Plus, RefreshCw, ChevronRight,
  Info, AlertTriangle, Star, FileDown,
} from "lucide-react";
import { C, getScoreColor } from "../constants/theme";
import {
  fetchRetirementProjection, fetchRetirementAllocation,
  fetchRetirementProfile, saveRetirementProfile,
  fetchUserSettings, saveUserSettings,
} from "../services/api";
import Header from "../components/Header";
import Milestone from "../components/Milestone";
import ScoreGauge from "../components/ScoreGauge";
import AnimatedCounter from "../components/AnimatedCounter";
import toast from "react-hot-toast";

// ── Helpers ──
function formatCurrency(val, currency = "₹") {
  if (Math.abs(val) >= 10000000) return `${currency}${(val / 10000000).toFixed(2)}Cr`;
  if (Math.abs(val) >= 100000) return `${currency}${(val / 100000).toFixed(1)}L`;
  return `${currency}${Math.round(val).toLocaleString()}`;
}

// Future Value of a series of monthly contributions
function fvContributions(monthlyPmt, monthlyRate, months) {
  if (monthlyRate === 0) return monthlyPmt * months;
  return monthlyPmt * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate);
}

// Required monthly PMT to reach target corpus in n months at monthly rate
function requiredPMT(target, presentValue, monthlyRate, months) {
  if (months <= 0) return 0;
  if (monthlyRate === 0) return Math.max(0, (target - presentValue) / months);
  const fvPV = presentValue * Math.pow(1 + monthlyRate, months);
  const remaining = Math.max(0, target - fvPV);
  return remaining * monthlyRate / (Math.pow(1 + monthlyRate, months) - 1);
}

// FIRE number
const SCENARIO_CONFIGS = {
  conservative: { label: "Conservative", returnRate: 0.08, inflationRate: 0.07, color: "#f59e0b" },
  moderate: { label: "Moderate", returnRate: 0.11, inflationRate: 0.06, color: "#6366f1" },
  aggressive: { label: "Aggressive", returnRate: 0.14, inflationRate: 0.05, color: "#10b981" },
};

export default function RetirementPage({ userId, currency = "₹", onMenuToggle, healthScore, darkMode }) {
  const summaryRef = useRef(null);
  const [pdfExporting, setPdfExporting] = useState(false);
  const [data, setData] = useState([]);
  const [allocData, setAllocData] = useState([]);
  const [currentAge, setCurrentAge] = useState(35);
  const [targetAge, setTargetAge] = useState(60);
  const [lifeExpectancy, setLifeExpectancy] = useState(85);
  const [scenario, setScenario] = useState("moderate");

  const [profile, setProfile] = useState({
    startingCorpus: 120000000.0,
    startingWithdrawal: 4800000.0,
    inflationRate: 0.06,
    returnRate: 0.11,
  });

  // Advanced inputs
  const [monthlyIncome, setMonthlyIncome] = useState(150000);
  const [monthlyExpenses, setMonthlyExpenses] = useState(80000);
  const [monthlyContribution, setMonthlyContribution] = useState(50000);
  const [employerContribution, setEmployerContribution] = useState(10000);
  const [pensionIncome, setPensionIncome] = useState(0);
  const [otherPassiveIncome, setOtherPassiveIncome] = useState(0);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [checklist, setChecklist] = useState([
    { id: 1, text: "Set up emergency fund (6 months)", done: false },
    { id: 2, text: "Start SIP in equity mutual funds", done: false },
    { id: 3, text: "Get term life insurance", done: false },
    { id: 4, text: "Open NPS account", done: false },
    { id: 5, text: "Create a will", done: false },
    { id: 6, text: "Maximize EPF/VPF contributions", done: false },
    { id: 7, text: "Invest in PPF (lock-in)", done: false },
    { id: 8, text: "Review portfolio annually", done: false },
  ]);

  useEffect(() => {
    if (userId) {
      fetchRetirementProfile(userId).then((prof) => { if (prof) setProfile(prof); });
      fetchUserSettings(userId).then((settings) => {
        if (settings) {
          if (settings.targetRetirementAge) setTargetAge(settings.targetRetirementAge);
          if (settings.currentAge) setCurrentAge(settings.currentAge);
        }
      });
      fetchRetirementAllocation(userId).then(setAllocData);
    }
  }, [userId]);

  useEffect(() => {
    if (userId && profile) {
      fetchRetirementProjection(userId, profile).then(setData);
    }
  }, [userId, profile]);

  const updateProfileField = useCallback((key, val) => {
    const updated = { ...profile, [key]: val };
    setProfile(updated);
    if (userId) {
      saveRetirementProfile(userId, updated).then(() => toast.success("Profile saved!"));
    }
  }, [profile, userId]);

  // Apply scenario presets
  const applyScenario = (s) => {
    setScenario(s);
    const cfg = SCENARIO_CONFIGS[s];
    const updated = { ...profile, returnRate: cfg.returnRate, inflationRate: cfg.inflationRate };
    setProfile(updated);
    if (userId) saveRetirementProfile(userId, updated);
  };

  // ── Math Calculations ──
  const startingCorpus = profile.startingCorpus;
  const startingWithdrawal = profile.startingWithdrawal;
  const returnRate = profile.returnRate;
  const inflationRate = profile.inflationRate;
  const yearsToRetirement = Math.max(0, targetAge - currentAge);
  const retirementYears = Math.max(0, lifeExpectancy - targetAge);
  const monthlyRate = returnRate / 12;

  // Corpus needed at retirement (present value of annuity)
  const netRate = Math.max(0.005, returnRate - inflationRate);
  const targetCorpus = startingWithdrawal / netRate;

  // Future value of current corpus
  const fvCurrentCorpus = startingCorpus * Math.pow(1 + returnRate, yearsToRetirement);

  // Future value of monthly contributions
  const totalMonthlyContrib = monthlyContribution + employerContribution;
  const fvContrib = fvContributions(totalMonthlyContrib, monthlyRate, yearsToRetirement * 12);

  // Projected corpus at retirement
  const projectedCorpus = fvCurrentCorpus + fvContrib;

  // Savings gap
  const savingsGap = Math.max(0, targetCorpus - projectedCorpus);

  // Required monthly contribution to close gap
  const requiredMonthly = requiredPMT(targetCorpus, startingCorpus, monthlyRate, yearsToRetirement * 12);

  // Funded percentage
  const fundedPct = Math.min(100, Math.max(0, Math.round((projectedCorpus / targetCorpus) * 100)));

  // Safe withdrawal (4% rule)
  const equityPct = allocData.find((d) => d.name === "Equity")?.value || 65;
  const safeWithdrawalRate = (equityPct * 0.04 / 65.0) + 0.015;
  const safeWithdrawalAmt = projectedCorpus * safeWithdrawalRate;

  // FIRE number
  const annualExpenses = monthlyExpenses * 12;
  const fireNumber = annualExpenses / 0.04;
  const leanFireNumber = annualExpenses * 0.7 / 0.04;
  const fatFireNumber = annualExpenses * 1.5 / 0.04;

  // Coast FIRE
  const coastFireNumber = fireNumber / Math.pow(1 + returnRate, yearsToRetirement);

  // FI Date prediction
  const monthsToFI = Math.ceil(
    Math.log((targetCorpus * monthlyRate + totalMonthlyContrib) / (startingCorpus * monthlyRate + totalMonthlyContrib))
    / Math.log(1 + monthlyRate)
  );
  const fiDate = new Date();
  fiDate.setMonth(fiDate.getMonth() + Math.max(0, monthsToFI));

  // Readiness score
  const readinessScore = Math.min(100, Math.round(
    fundedPct * 0.5 +
    (savingsGap === 0 ? 30 : Math.max(0, 30 - (savingsGap / targetCorpus) * 30)) +
    (yearsToRetirement > 10 ? 20 : yearsToRetirement > 5 ? 10 : 0)
  ));

  // Purchasing power chart
  const purchasingPowerData = useMemo(() => {
    return Array.from({ length: retirementYears + 1 }, (_, i) => ({
      year: targetAge + i,
      nominal: Math.round(startingWithdrawal / 100000),
      real: Math.round(startingWithdrawal / Math.pow(1 + inflationRate, i) / 100000),
    }));
  }, [targetAge, startingWithdrawal, inflationRate, retirementYears]);

  // Pre-retirement growth chart
  const growthChart = useMemo(() => {
    const pts = [];
    let corpus = startingCorpus;
    for (let y = 0; y <= yearsToRetirement; y++) {
      const fvContribPart = fvContributions(totalMonthlyContrib, monthlyRate, y * 12);
      pts.push({
        year: currentAge + y,
        corpus: Math.round((corpus * Math.pow(1 + returnRate, y) + fvContribPart) / 100000),
        target: Math.round(targetCorpus / 100000),
      });
    }
    return pts;
  }, [startingCorpus, currentAge, yearsToRetirement, returnRate, monthlyRate, totalMonthlyContrib, targetCorpus]);

  const cardBg = darkMode ? "#1e293b" : "#ffffff";
  const cardBorder = darkMode ? "rgba(51,65,85,0.7)" : "rgba(228,228,231,0.8)";
  const textPrimary = darkMode ? "#f1f5f9" : C.onSurface;
  const textMuted = darkMode ? "#94a3b8" : "#64748b";
  const inputCls = `w-full px-4 py-3 rounded-xl border outline-none text-sm font-semibold transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 ${darkMode ? "bg-slate-800 border-slate-600 text-slate-100" : "bg-white border-slate-200 text-slate-800"}`;

  const readinessColor = getScoreColor(readinessScore, 100);

  const exportPDF = async () => {
    setPdfExporting(true);
    try {
      const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
        import("jspdf"),
        import("html2canvas"),
      ]);
      const el = summaryRef.current;
      if (!el) { toast.error("Nothing to export"); return; }
      const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: darkMode ? "#1e293b" : "#ffffff" });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const ratio = canvas.height / canvas.width;
      const imgH = Math.min(pageH - 20, pageW * ratio);
      pdf.addImage(imgData, "PNG", 10, 10, pageW - 20, imgH);
      pdf.save(`retirement_plan_${userId}_${new Date().toISOString().slice(0, 10)}.pdf`);
      toast.success("PDF exported successfully!");
    } catch (e) {
      console.error(e);
      toast.error("PDF export failed. Please try again.");
    } finally {
      setPdfExporting(false);
    }
  };

  return (
    <>
      <Header title="Retirement Planning" onMenuToggle={onMenuToggle} healthScore={healthScore} darkMode={darkMode} userId={userId} />
      <div className="flex-1 overflow-y-auto p-4 md:p-8 max-w-[1440px] mx-auto w-full space-y-6 animate-fade-in">

        {/* ── Scenario Selector ── */}
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs font-bold uppercase tracking-widest" style={{ color: textMuted }}>
            Projection Scenario:
          </span>
          <div className="flex gap-2">
            {Object.entries(SCENARIO_CONFIGS).map(([key, cfg]) => (
              <button
                key={key}
                onClick={() => applyScenario(key)}
                className="px-4 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer"
                style={
                  scenario === key
                    ? { background: cfg.color, color: "#fff", borderColor: cfg.color }
                    : { background: cardBg, color: textMuted, borderColor: cardBorder }
                }
              >
                {cfg.label}
              </button>
            ))}
          </div>
          <span className="ml-auto text-[10px] font-semibold" style={{ color: textMuted }}>
            Return: {Math.round(returnRate * 100)}% · Inflation: {Math.round(inflationRate * 100)}%
          </span>
          {/* PDF Export Button */}
          <button
            onClick={exportPDF}
            disabled={pdfExporting}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer disabled:opacity-60 active:scale-95"
            style={{ background: cardBg, borderColor: cardBorder, color: C.secondary }}
          >
            <FileDown size={14} />
            {pdfExporting ? "Exporting..." : "Export PDF"}
          </button>
        </div>

        {/* ── Top Row: Summary + Gauge ── */}
        <div ref={summaryRef} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Summary */}
          <div
            className="lg:col-span-8 rounded-2xl border p-6 md:p-8 relative overflow-hidden"
            style={{ background: cardBg, borderColor: cardBorder }}
          >
            <div className="absolute top-0 right-0 w-56 h-56 rounded-full blur-3xl opacity-10 pointer-events-none"
              style={{ background: SCENARIO_CONFIGS[scenario].color }} />
            <span className="px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider inline-block mb-3"
              style={{ background: "rgba(99,102,241,0.1)", color: C.secondary }}>
              Retirement Overview
            </span>
            <h3 className="text-2xl md:text-4xl font-extrabold tracking-tight mb-2 leading-tight" style={{ color: textPrimary }}>
              Your Plan is{" "}
              <span
                className="font-black underline decoration-wavy decoration-2"
                style={{
                  color: fundedPct >= 100 ? "#10b981" : fundedPct >= 70 ? "#f59e0b" : "#ef4444",
                  textDecorationColor: fundedPct >= 100 ? "#10b981" : fundedPct >= 70 ? "#f59e0b" : "#ef4444",
                }}
              >
                {fundedPct >= 100 ? "Fully Funded" : fundedPct >= 70 ? "On Track" : "Needs Review"}
              </span>
            </h3>
            <p className="text-sm text-slate-500 max-w-2xl leading-relaxed mb-6">
              Based on a{" "}
              <strong style={{ color: textPrimary }}>{Math.round(returnRate * 100)}% annual return</strong> and{" "}
              <strong style={{ color: textPrimary }}>{Math.round(inflationRate * 100)}% inflation</strong> projection.
              You have <strong style={{ color: textPrimary }}>{yearsToRetirement} years</strong> until retirement.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "Target Age", value: `${targetAge} yrs` },
                { label: "Years Left", value: `${yearsToRetirement} yrs` },
                { label: "Projected Corpus", value: formatCurrency(projectedCorpus, currency), accent: false },
                { label: "Savings Gap", value: formatCurrency(savingsGap, currency), accent: savingsGap > 0 },
              ].map((s) => (
                <div
                  key={s.label}
                  className="p-4 rounded-xl border"
                  style={{ background: darkMode ? "rgba(51,65,85,0.2)" : "#f8fafc", borderColor: cardBorder }}
                >
                  <p className="text-[10px] uppercase font-bold tracking-widest mb-1" style={{ color: textMuted }}>{s.label}</p>
                  <p className="text-lg font-black tracking-tight" style={{ color: s.accent ? "#ef4444" : C.secondary }}>
                    {s.value}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Readiness Gauge */}
          <div
            className="lg:col-span-4 rounded-2xl border p-6 flex flex-col items-center justify-center text-center"
            style={{ background: cardBg, borderColor: cardBorder }}
          >
            <h3 className="text-lg font-bold mb-4 self-start text-left w-full flex items-center gap-2" style={{ color: textPrimary }}>
              <Star size={16} className="text-amber-400" /> Readiness Score
            </h3>
            <ScoreGauge score={readinessScore} max={100} color={readinessColor} size={160} strokeWidth={12}>
              <div className="flex flex-col items-center">
                <span className="text-4xl font-black" style={{ color: readinessColor }}>{readinessScore}</span>
                <span className="text-[9px] uppercase font-bold tracking-widest text-slate-400 mt-0.5">/ 100</span>
              </div>
            </ScoreGauge>
            <div className="w-full border-t mt-4 pt-4 space-y-2" style={{ borderColor: cardBorder }}>
              <div className="flex justify-between text-xs">
                <span style={{ color: textMuted }}>Current Corpus</span>
                <span className="font-black" style={{ color: textPrimary }}>{formatCurrency(startingCorpus, currency)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span style={{ color: textMuted }}>Required Corpus</span>
                <span className="font-black" style={{ color: textMuted }}>{formatCurrency(targetCorpus, currency)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span style={{ color: textMuted }}>FI Date (est.)</span>
                <span className="font-black text-indigo-500">{fiDate.toLocaleString("default", { month: "short", year: "numeric" })}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Controls + Growth Chart ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Controls */}
          <div className="lg:col-span-4 rounded-2xl border p-6 space-y-5" style={{ background: cardBg, borderColor: cardBorder }}>
            <h3 className="text-lg font-bold flex items-center gap-2 border-b pb-4" style={{ color: textPrimary, borderColor: cardBorder }}>
              <SlidersHorizontal size={18} className="text-indigo-500" /> Parameters
            </h3>

            {/* Age inputs */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-widest mb-2" style={{ color: textMuted }}>Current Age</label>
                <input type="number" min="20" max="65" value={currentAge}
                  onChange={(e) => setCurrentAge(Number(e.target.value))} className={inputCls} />
              </div>
              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-widest mb-2" style={{ color: textMuted }}>Retire Age</label>
                <input type="number" min="40" max="80" value={targetAge}
                  onChange={(e) => setTargetAge(Number(e.target.value))} className={inputCls} />
              </div>
              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-widest mb-2" style={{ color: textMuted }}>Life Expectancy</label>
                <input type="number" min="60" max="100" value={lifeExpectancy}
                  onChange={(e) => setLifeExpectancy(Number(e.target.value))} className={inputCls} />
              </div>
            </div>

            {/* Sliders */}
            {[
              { label: "Current Corpus", key: "startingCorpus", min: 500000, max: 300000000, step: 500000, display: formatCurrency(startingCorpus, currency) },
              { label: "Annual Income Need", key: "startingWithdrawal", min: 200000, max: 25000000, step: 100000, display: formatCurrency(startingWithdrawal, currency) },
              { label: "Return Rate", key: "returnRate", min: 4, max: 20, step: 1, isRate: true, display: `${Math.round(returnRate * 100)}%` },
              { label: "Inflation Rate", key: "inflationRate", min: 3, max: 12, step: 1, isRate: true, display: `${Math.round(inflationRate * 100)}%` },
            ].map((sl) => (
              <div key={sl.key} className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="font-bold uppercase tracking-widest" style={{ color: textMuted }}>{sl.label}</span>
                  <span className="font-extrabold text-indigo-500">{sl.display}</span>
                </div>
                <input
                  type="range" min={sl.min} max={sl.max} step={sl.step || 1}
                  value={sl.isRate ? Math.round(profile[sl.key] * 100) : profile[sl.key]}
                  onChange={(e) => updateProfileField(sl.key, sl.isRate ? Number(e.target.value) / 100 : Number(e.target.value))}
                  className="w-full"
                />
              </div>
            ))}

            {/* Monthly contribution */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="font-bold uppercase tracking-widest" style={{ color: textMuted }}>Monthly Contribution</span>
                <span className="font-extrabold text-indigo-500">{formatCurrency(monthlyContribution, currency)}</span>
              </div>
              <input type="range" min={0} max={500000} step={5000} value={monthlyContribution}
                onChange={(e) => setMonthlyContribution(Number(e.target.value))} className="w-full" />
            </div>

            {/* Advanced toggle */}
            <button
              onClick={() => setShowAdvanced(s => !s)}
              className="w-full flex items-center justify-between text-xs font-bold text-indigo-500 pt-2 border-t cursor-pointer"
              style={{ borderColor: cardBorder }}
            >
              {showAdvanced ? "Hide Advanced" : "Show Advanced Inputs"}
              <ChevronRight size={14} className={`transition-transform ${showAdvanced ? "rotate-90" : ""}`} />
            </button>

            {showAdvanced && (
              <div className="space-y-3 animate-slide-up">
                {[
                  { label: "Monthly Income", value: monthlyIncome, setter: setMonthlyIncome },
                  { label: "Monthly Expenses", value: monthlyExpenses, setter: setMonthlyExpenses },
                  { label: "Employer Contribution", value: employerContribution, setter: setEmployerContribution },
                  { label: "Pension Income (Annual)", value: pensionIncome, setter: setPensionIncome },
                  { label: "Other Passive Income", value: otherPassiveIncome, setter: setOtherPassiveIncome },
                ].map((field) => (
                  <div key={field.label}>
                    <label className="block text-[10px] font-extrabold uppercase tracking-widest mb-1" style={{ color: textMuted }}>
                      {field.label}
                    </label>
                    <input type="number" value={field.value} onChange={(e) => field.setter(Number(e.target.value))}
                      className={inputCls} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Growth Chart */}
          <div className="lg:col-span-8 rounded-2xl border p-6 flex flex-col" style={{ background: cardBg, borderColor: cardBorder }}>
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-lg font-bold" style={{ color: textPrimary }}>Corpus Growth Projection</h3>
                <p className="text-xs mt-0.5" style={{ color: textMuted }}>
                  Pre-retirement accumulation (Age {currentAge}–{targetAge})
                </p>
              </div>
            </div>
            <div className="flex-1 min-h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={growthChart} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid stroke={darkMode ? "#1e293b" : "#f1f5f9"} vertical={false} />
                  <XAxis dataKey="year" tick={{ fontSize: 11, fill: textMuted }} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: textMuted }} tickLine={false}
                    label={{ value: `(${currency} L)`, angle: -90, position: "insideLeft", fontSize: 10, fill: textMuted, offset: 12 }} />
                  <Tooltip
                    contentStyle={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: "12px", color: textPrimary, fontSize: "12px" }}
                    formatter={(v, n) => [`${currency}${v}L`, n === "corpus" ? "Projected Corpus" : "Target"]}
                  />
                  <defs>
                    <linearGradient id="corpusGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={C.secondary} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={C.secondary} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="corpus" stroke={C.secondary} fill="url(#corpusGrad)" strokeWidth={2.5} name="Projected Corpus" />
                  <Line type="monotone" dataKey="target" stroke="#ef4444" strokeWidth={1.5} strokeDasharray="5 3" dot={false} name="Target" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* ── FIRE Calculators ── */}
        <div
          className="rounded-2xl border p-6"
          style={{ background: cardBg, borderColor: cardBorder }}
        >
          <h3 className="text-lg font-bold mb-5 flex items-center gap-2" style={{ color: textPrimary }}>
            <Flame size={18} className="text-orange-500" /> FIRE Calculator
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              { label: "Lean FIRE", amount: leanFireNumber, desc: "70% of current expenses", icon: "🏕️", color: "#10b981" },
              { label: "Standard FIRE", amount: fireNumber, desc: "100% of current expenses (4% rule)", icon: "🔥", color: C.secondary },
              { label: "Fat FIRE", amount: fatFireNumber, desc: "150% of current expenses (luxury)", icon: "👑", color: "#8b5cf6" },
              { label: "Coast FIRE", amount: coastFireNumber, desc: "Stop contributing, let it grow", icon: "🌊", color: "#f59e0b" },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-xl p-4 border text-center"
                style={{ background: darkMode ? "rgba(51,65,85,0.2)" : "#f8fafc", borderColor: cardBorder }}
              >
                <div className="text-2xl mb-2">{item.icon}</div>
                <p className="text-xs font-black uppercase tracking-widest mb-1" style={{ color: item.color }}>{item.label}</p>
                <p className="text-xl font-black" style={{ color: textPrimary }}>{formatCurrency(item.amount, currency)}</p>
                <p className="text-[10px] font-medium mt-1" style={{ color: textMuted }}>{item.desc}</p>
                <div
                  className="mt-3 h-1 rounded-full"
                  style={{
                    background: darkMode ? "#334155" : "#e4e4e7",
                  }}
                >
                  <div
                    className="h-full rounded-full transition-all duration-1000"
                    style={{
                      width: `${Math.min(100, (projectedCorpus / item.amount) * 100)}%`,
                      background: item.color,
                    }}
                  />
                </div>
                <p className="text-[10px] font-bold mt-1.5" style={{ color: textMuted }}>
                  {Math.round(Math.min(100, (projectedCorpus / item.amount) * 100))}% achieved
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Post-retirement + Purchasing Power ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Post-retirement chart */}
          <div className="lg:col-span-7 rounded-2xl border p-6 flex flex-col" style={{ background: cardBg, borderColor: cardBorder }}>
            <div className="mb-6">
              <h3 className="text-lg font-bold" style={{ color: textPrimary }}>Post-Retirement Drawdown</h3>
              <p className="text-xs mt-0.5" style={{ color: textMuted }}>
                Age {targetAge}–{lifeExpectancy} assuming {Math.round(inflationRate * 100)}% inflation
              </p>
            </div>
            <div className="flex-1 min-h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <CartesianGrid stroke={darkMode ? "#1e293b" : "#f1f5f9"} vertical={false} />
                  <XAxis dataKey="age" tick={{ fontSize: 11, fill: textMuted }} tickLine={false} />
                  <YAxis yAxisId="left" tick={{ fontSize: 10, fill: textMuted }} tickLine={false} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: textMuted }} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: "12px", color: textPrimary, fontSize: "12px" }}
                  />
                  <Area yAxisId="left" type="monotone" dataKey="corpus" stroke={C.secondary}
                    fill={`rgba(99,102,241,${darkMode ? "0.1" : "0.05"})`} strokeWidth={2.5} name="Portfolio (Cr)" />
                  <Bar yAxisId="right" dataKey="withdrawal" fill="#10b981" radius={[3, 3, 0, 0]} name="Withdrawal (L)" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Purchasing Power + Key Metrics */}
          <div className="lg:col-span-5 space-y-4">
            {/* Key calculations */}
            <div className="rounded-2xl border p-6" style={{ background: cardBg, borderColor: cardBorder }}>
              <h3 className="text-base font-bold mb-4 flex items-center gap-2" style={{ color: textPrimary }}>
                <Zap size={16} className="text-indigo-500" /> Key Numbers
              </h3>
              <div className="space-y-3">
                {[
                  { label: "Safe Withdrawal Rate", value: `${(safeWithdrawalRate * 100).toFixed(2)}%` },
                  { label: "Safe Annual Withdrawal", value: formatCurrency(safeWithdrawalAmt, currency) },
                  { label: "Required Monthly SIP", value: formatCurrency(requiredMonthly, currency) },
                  { label: "FI Date (estimate)", value: fiDate.toLocaleString("default", { month: "short", year: "numeric" }) },
                  { label: "Corpus Funded", value: `${fundedPct}%` },
                ].map((item) => (
                  <div key={item.label} className="flex justify-between items-center py-2 border-b last:border-b-0" style={{ borderColor: cardBorder }}>
                    <span className="text-xs font-semibold" style={{ color: textMuted }}>{item.label}</span>
                    <span className="text-sm font-black" style={{ color: textPrimary }}>{item.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Allocation pie */}
            {allocData.length > 0 && (
              <div className="rounded-2xl border p-6" style={{ background: cardBg, borderColor: cardBorder }}>
                <h3 className="text-base font-bold mb-3" style={{ color: textPrimary }}>Retirement Mix</h3>
                <div className="flex items-center gap-4">
                  <ResponsiveContainer width={100} height={100}>
                    <PieChart>
                      <Pie data={allocData} dataKey="value" innerRadius={30} outerRadius={46} paddingAngle={2}>
                        {allocData.map((d, i) => <Cell key={i} fill={d.color} stroke="none" />)}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-1.5">
                    {allocData.map((d) => (
                      <div key={d.name} className="flex items-center gap-2 text-xs">
                        <span className="w-2 h-2 rounded-full" style={{ background: d.color }} />
                        <span style={{ color: textPrimary }}>{d.name}</span>
                        <span className="font-black ml-auto" style={{ color: textMuted }}>{d.value}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Milestones ── */}
        <div className="rounded-2xl border p-6" style={{ background: cardBg, borderColor: cardBorder }}>
          <h3 className="text-lg font-bold mb-6 flex items-center gap-2" style={{ color: textPrimary }}>
            <Compass size={18} className="text-slate-400" /> FIRE Milestones
          </h3>
          <div className="relative w-full pt-4 pb-10">
            <div className="absolute top-[32px] left-4 right-4 h-1 rounded-full" style={{ background: darkMode ? "#1e293b" : "#f4f4f5" }} />
            <div
              className="absolute top-[32px] left-4 h-1 rounded-full transition-all duration-1000"
              style={{
                background: `linear-gradient(90deg, ${C.secondary}, ${C.secondaryContainer})`,
                width: `${Math.min(100, (projectedCorpus / (fatFireNumber * 1.1)) * 100)}%`,
              }}
            />
            <div className="relative z-10 flex justify-between items-start w-full px-4">
              <Milestone age={currentAge + Math.round(yearsToRetirement * 0.4)} label="Lean FIRE" amount={formatCurrency(leanFireNumber, currency)} active={projectedCorpus >= leanFireNumber} />
              <Milestone age={targetAge} label="Standard FIRE" amount={formatCurrency(fireNumber, currency)} active={projectedCorpus >= fireNumber} />
              <Milestone age={targetAge + 5} label="Fat FIRE" amount={formatCurrency(fatFireNumber, currency)} active={projectedCorpus >= fatFireNumber} />
            </div>
          </div>
        </div>

        {/* ── Retirement Checklist ── */}
        <div className="rounded-2xl border p-6" style={{ background: cardBg, borderColor: cardBorder }}>
          <h3 className="text-lg font-bold mb-5 flex items-center gap-2" style={{ color: textPrimary }}>
            <CheckCircle size={18} className="text-emerald-500" /> Retirement Checklist
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {checklist.map((item) => (
              <label
                key={item.id}
                className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all hover:bg-slate-50 dark:hover:bg-slate-700/30"
              >
                <input
                  type="checkbox"
                  checked={item.done}
                  onChange={() => setChecklist(cl => cl.map(c => c.id === item.id ? { ...c, done: !c.done } : c))}
                  className="w-4 h-4 rounded accent-indigo-600 cursor-pointer"
                />
                <span
                  className={`text-sm font-semibold transition-all ${item.done ? "line-through" : ""}`}
                  style={{ color: item.done ? textMuted : textPrimary }}
                >
                  {item.text}
                </span>
                {item.done && <CheckCircle size={14} className="ml-auto text-emerald-500 shrink-0" />}
              </label>
            ))}
          </div>
          <div className="mt-4 p-3 rounded-xl" style={{ background: darkMode ? "rgba(99,102,241,0.1)" : "rgba(99,102,241,0.05)" }}>
            <div className="flex justify-between text-xs font-bold mb-1.5" style={{ color: textPrimary }}>
              <span>Progress</span>
              <span>{checklist.filter(c => c.done).length}/{checklist.length} completed</span>
            </div>
            <div className="h-1.5 rounded-full" style={{ background: darkMode ? "#1e293b" : "#f1f5f9" }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${(checklist.filter(c => c.done).length / checklist.length) * 100}%`,
                  background: `linear-gradient(90deg, ${C.secondary}, ${C.secondaryContainer})`,
                }}
              />
            </div>
          </div>
        </div>

        {/* ── Advice Card ── */}
        <div
          className="rounded-2xl p-8 relative overflow-hidden text-white border border-indigo-800/40"
          style={{ background: `linear-gradient(135deg, ${C.primaryContainer}, #0f0b40)` }}
        >
          <div className="absolute top-1/2 right-10 w-56 h-56 rounded-full bg-indigo-500/10 filter blur-3xl pointer-events-none" />
          <h3 className="text-lg font-bold mb-3 flex items-center gap-2.5">
            <Brain size={22} className="text-indigo-400" /> AI Advice & Safe Withdrawal Index
          </h3>
          <p className="text-sm leading-relaxed max-w-4xl text-indigo-100">
            Based on your{" "}
            <strong className="text-white">{equityPct}/{100 - equityPct} Equity-Debt</strong> allocation, your{" "}
            <strong className="text-white">Safe Withdrawal Rate (SWR)</strong> is{" "}
            <strong className="text-white">{(safeWithdrawalRate * 100).toFixed(2)}%</strong>. This means an annual
            budget of <strong className="text-white">{formatCurrency(safeWithdrawalAmt, currency)}</strong> from
            your projected corpus of <strong className="text-white">{formatCurrency(projectedCorpus, currency)}</strong>{" "}
            should sustain through age {lifeExpectancy} with {Math.round(inflationRate * 100)}% inflation.
            Your FIRE number is <strong className="text-white">{formatCurrency(fireNumber, currency)}</strong>,
            and you are currently <strong className="text-white">{Math.round((projectedCorpus / fireNumber) * 100)}%</strong>{" "}
            of the way there.
          </p>
        </div>
      </div>
    </>
  );
}
