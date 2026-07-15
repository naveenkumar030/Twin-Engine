import React, { useState, useEffect } from "react";
import {
  ComposedChart,
  Area,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { SlidersHorizontal, Lightbulb, Brain, CheckCircle, Sparkles, TrendingUp, Compass } from "lucide-react";
import { C } from "../constants/theme";
import {
  fetchRetirementProjection,
  fetchRetirementAllocation,
  fetchRetirementProfile,
  saveRetirementProfile,
  fetchUserSettings,
  saveUserSettings,
} from "../services/api";
import Header from "../components/Header";
import Milestone from "../components/Milestone";

export default function RetirementPage({ userId, currency = "₹", onMenuToggle, healthScore }) {
  const [data, setData] = useState([]);
  const [allocData, setAllocData] = useState([]);
  const [currentAge, setCurrentAge] = useState(42);
  const [targetAge, setTargetAge] = useState(60);

  // Retirement profile state
  const [profile, setProfile] = useState({
    startingCorpus: 120000000.0,
    startingWithdrawal: 4800000.0,
    inflationRate: 0.06,
    returnRate: 0.08,
  });

  const [saveStatus, setSaveStatus] = useState("");

  // Load profile settings & user settings on mount
  useEffect(() => {
    if (userId) {
      fetchRetirementProfile(userId).then((prof) => {
        if (prof) {
          setProfile(prof);
        }
      });

      fetchUserSettings(userId).then((settings) => {
        if (settings) {
          if (settings.targetRetirementAge) {
            setTargetAge(settings.targetRetirementAge);
          }
          if (settings.currentAge) {
            setCurrentAge(settings.currentAge);
          }
        }
      });
    }
  }, [userId]);

  // Fetch projection points whenever profile changes
  useEffect(() => {
    if (userId && profile) {
      fetchRetirementProjection(userId, profile).then(setData);
    }
  }, [userId, profile]);

  const loadAllocation = () => {
    if (userId) {
      fetchRetirementAllocation(userId).then(setAllocData);
    }
  };

  useEffect(() => {
    loadAllocation();
  }, [userId]);

  useEffect(() => {
    window.addEventListener("fintwin_settings_changed", loadAllocation);
    return () => window.removeEventListener("fintwin_settings_changed", loadAllocation);
  }, [userId]);

  const updateProfileField = (key, val) => {
    const updated = {
      ...profile,
      [key]: val,
    };
    setProfile(updated);

    // Save changes to database
    if (userId) {
      saveRetirementProfile(userId, updated).then(() => {
        setSaveStatus("Changes auto-saved");
        setTimeout(() => setSaveStatus(""), 3000);
      });
    }
  };

  const updateSettingsField = (key, val) => {
    if (key === "currentAge") setCurrentAge(val);
    if (key === "targetRetirementAge") setTargetAge(val);

    if (userId) {
      fetchUserSettings(userId).then((currentSettings) => {
        const updatedSettings = {
          ...currentSettings,
          currency: currentSettings?.currency || currency,
          targetRetirementAge: key === "targetRetirementAge" ? val : (currentSettings?.targetRetirementAge || targetAge),
          currentAge: key === "currentAge" ? val : (currentSettings?.currentAge || currentAge),
          equityAllocation: currentSettings?.equityAllocation || 65,
          debtAllocation: currentSettings?.debtAllocation || 25,
          goldAllocation: currentSettings?.goldAllocation || 5,
          realEstateAllocation: currentSettings?.realEstateAllocation || 5,
        };
        saveUserSettings(userId, updatedSettings).then(() => {
          setSaveStatus("Preferences auto-saved");
          setTimeout(() => setSaveStatus(""), 3000);
          window.dispatchEvent(new Event("fintwin_settings_changed"));
        });
      });
    }
  };

  // Math variables
  const startingCorpus = profile.startingCorpus;
  const startingWithdrawal = profile.startingWithdrawal;
  const returnRate = profile.returnRate;
  const inflationRate = profile.inflationRate;

  // SWR and Net return rate
  const netRate = Math.max(0.01, returnRate - inflationRate);
  const targetCorpus = startingWithdrawal / netRate;
  const fundedPct = Math.min(100, Math.max(0, Math.round((startingCorpus / targetCorpus) * 100)));
  const shortfall = Math.max(0, targetCorpus - startingCorpus);
  const yearsToGo = Math.max(0, targetAge - currentAge);

  const equityPct = allocData.find((d) => d.name === "Equity")?.value || 65;
  const debtPct = 100 - equityPct;
  const safeWithdrawalRate = (equityPct * 0.04 / 65.0) + 0.015;

  // Format Large Currency Values
  const formatCurrency = (val) => {
    if (val >= 10000000) {
      return `${currency}${(val / 10000000).toFixed(2)}Cr`;
    }
    if (val >= 100000) {
      return `${currency}${(val / 100000).toFixed(1)}L`;
    }
    return `${currency}${val.toLocaleString()}`;
  };

  return (
    <>
      <Header title="Retirement Planning" onMenuToggle={onMenuToggle} healthScore={healthScore} />
      <div className="flex-1 overflow-y-auto p-4 md:p-10 max-w-[1440px] mx-auto w-full animate-fade-in space-y-8">
        {/* Save feedback indicator */}
        {saveStatus && (
          <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 text-xs font-bold animate-toast-slide">
            <CheckCircle size={15} />
            {saveStatus}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Welcome & Summary */}
          <div
            className="lg:col-span-8 rounded-3xl border p-6 md:p-8 flex flex-col justify-between relative overflow-hidden shadow-lg shadow-slate-100 bg-white hover:shadow-xl transition-all duration-300"
            style={{ borderColor: "rgba(228, 228, 231, 0.8)" }}
          >
            <div>
              <span className="px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-indigo-50 text-indigo-600 inline-block mb-3">
                Overview Engine
              </span>
              <h3 className="text-2xl md:text-4xl font-extrabold tracking-tight mb-3 leading-tight" style={{ color: C.onSurface }}>
                Your Trajectory is{" "}
                <span
                  className="font-black underline decoration-wavy decoration-2 inline-block"
                  style={{
                    color: fundedPct >= 100 ? "#10b981" : fundedPct >= 70 ? "#f59e0b" : "#ef4444",
                    textDecorationColor: fundedPct >= 100 ? "#10b981" : fundedPct >= 70 ? "#f59e0b" : "#ef4444",
                  }}
                >
                  {fundedPct >= 100 ? "Fully Funded" : fundedPct >= 70 ? "On Track" : "Needs Review"}
                </span>
              </h3>
              <p className="max-w-2xl text-sm md:text-base leading-relaxed text-slate-500 mt-2">
                Interactive parameters evaluate how asset base adjustments, returns, and inflation rates shift your timeline projection curves.
              </p>
            </div>
            <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Target Age", value: `${targetAge} Yrs` },
                { label: "Years to go", value: `${yearsToGo} Yrs` },
                { label: "Planned Income", value: formatCurrency(startingWithdrawal) },
                { label: "Est. Shortfall", value: formatCurrency(shortfall), accent: shortfall > 0 },
              ].map((s) => (
                <div
                  key={s.label}
                  className="p-4 rounded-2xl border flex flex-col justify-center transition-all duration-300 hover:border-indigo-100 hover:bg-slate-50/20"
                  style={{ background: "#ffffff", borderColor: "rgba(228, 228, 231, 0.6)" }}
                >
                  <p className="text-[10px] uppercase font-bold tracking-widest text-slate-400 mb-1">
                    {s.label}
                  </p>
                  <p
                    className="text-lg md:text-xl font-black tracking-tight"
                    style={{ color: s.accent ? C.error : C.primary }}
                  >
                    {s.value}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Corpus gauge progress dial */}
          <div
            className="lg:col-span-4 rounded-3xl border p-6 md:p-8 flex flex-col items-center justify-center text-center shadow-lg shadow-slate-100 bg-white hover:shadow-xl transition-all duration-300"
            style={{ borderColor: "rgba(228, 228, 231, 0.8)" }}
          >
            <h3 className="text-lg font-bold self-start w-full text-left flex items-center gap-2 mb-4" style={{ color: C.primary }}>
              <TrendingUp size={18} className="text-slate-400" />
              Corpus Funded Target
            </h3>
            <div className="relative w-36 h-36 flex items-center justify-center mb-4">
              <svg viewBox="0 0 120 120" className="w-36 h-36 -rotate-90">
                <circle cx="60" cy="60" r="52" fill="none" stroke="#f4f4f5" strokeWidth="8" />
                <circle
                  cx="60"
                  cy="60"
                  r="52"
                  fill="none"
                  stroke={fundedPct >= 100 ? "#10b981" : C.secondary}
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 52}
                  strokeDashoffset={2 * Math.PI * 52 * (1 - fundedPct / 100)}
                  className="transition-all duration-1000 ease-out"
                />
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className="text-3xl font-black tracking-tighter" style={{ color: C.primary }}>
                  {fundedPct}%
                </span>
                <span className="text-[9px] uppercase font-bold tracking-widest text-slate-400 mt-0.5">
                  Funded
                </span>
              </div>
            </div>
            <div className="w-full flex justify-between items-end mt-4 px-2 border-t pt-4 border-slate-100">
              <div className="text-left">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Current Base
                </p>
                <p className="text-base font-extrabold mt-0.5" style={{ color: C.primary }}>
                  {formatCurrency(startingCorpus)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Required Target
                </p>
                <p className="text-base font-extrabold mt-0.5 text-slate-500">
                  {formatCurrency(targetCorpus)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Mid-Row grid layout: Graph vs Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Controls Adjust Panel */}
          <div
            className="lg:col-span-4 rounded-3xl border p-6 md:p-8 shadow-lg shadow-slate-100 bg-white space-y-6"
            style={{ borderColor: "rgba(228, 228, 231, 0.8)" }}
          >
            <h3 className="text-lg font-bold flex items-center gap-2 border-b pb-4 text-slate-800" style={{ borderColor: "rgba(228, 228, 231, 0.4)" }}>
              <SlidersHorizontal size={18} className="text-indigo-500" />
              Variables Config
            </h3>

            {/* Starting Corpus slider */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-400 uppercase tracking-widest">
                  Starting Asset Base
                </span>
                <span className="font-extrabold text-indigo-600">
                  {formatCurrency(startingCorpus)}
                </span>
              </div>
              <input
                type="range"
                min={500000}
                max={300000000}
                step={500000}
                value={startingCorpus}
                onChange={(e) => updateProfileField("startingCorpus", Number(e.target.value))}
                className="w-full h-1.5 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            {/* Starting Withdrawal slider */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-400 uppercase tracking-widest">
                  Retirement Annual Income
                </span>
                <span className="font-extrabold text-indigo-600">
                  {formatCurrency(startingWithdrawal)}
                </span>
              </div>
              <input
                type="range"
                min={200000}
                max={25000000}
                step={100000}
                value={startingWithdrawal}
                onChange={(e) => updateProfileField("startingWithdrawal", Number(e.target.value))}
                className="w-full h-1.5 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            {/* Return Rate slider */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-400 uppercase tracking-widest">
                  Expected Growth Return
                </span>
                <span className="font-extrabold text-indigo-600">
                  {Math.round(returnRate * 100)}% p.a.
                </span>
              </div>
              <input
                type="range"
                min="4"
                max="18"
                value={Math.round(returnRate * 100)}
                onChange={(e) => updateProfileField("returnRate", Number(e.target.value) / 100)}
                className="w-full h-1.5 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            {/* Inflation rate slider */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-400 uppercase tracking-widest">
                  Projected Inflation
                </span>
                <span className="font-extrabold text-indigo-600">
                  {Math.round(inflationRate * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="3"
                max="12"
                value={Math.round(inflationRate * 100)}
                onChange={(e) => updateProfileField("inflationRate", Number(e.target.value) / 100)}
                className="w-full h-1.5 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            {/* Age adjustments */}
            <div className="grid grid-cols-2 gap-4 border-t pt-5 border-slate-100">
              <div className="space-y-1.5">
                <label className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                  Current Age
                </label>
                <input
                  type="number"
                  min="20"
                  max="65"
                  value={currentAge}
                  onChange={(e) => updateSettingsField("currentAge", Number(e.target.value))}
                  className="w-full px-3 py-2 border rounded-xl outline-none text-sm font-semibold transition-all focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 border-slate-200"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                  Target Age
                </label>
                <input
                  type="number"
                  min="40"
                  max="80"
                  value={targetAge}
                  onChange={(e) => updateSettingsField("targetRetirementAge", Number(e.target.value))}
                  className="w-full px-3 py-2 border rounded-xl outline-none text-sm font-semibold transition-all focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 border-slate-200"
                />
              </div>
            </div>
          </div>

          {/* Projection chart */}
          <div
            className="lg:col-span-8 rounded-3xl border p-6 md:p-8 flex flex-col shadow-lg shadow-slate-100 bg-white"
            style={{ borderColor: "rgba(228, 228, 231, 0.8)" }}
          >
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <div>
                <h3 className="text-lg font-bold text-slate-800">
                  Timeline Projection Curves
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Post-Retirement (Age {targetAge}-90) assuming {Math.round(inflationRate * 100)}% inflation
                </p>
              </div>
              <div className="flex gap-4 text-xs font-semibold text-slate-500">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full inline-block" style={{ background: C.secondary }} />
                  Portfolio Corpus
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full inline-block" style={{ background: "#10b981" }} />
                  Withdrawals
                </span>
              </div>
            </div>
            <div className="flex-1 min-h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={data} margin={{ top: 10, right: -5, left: -20, bottom: 0 }}>
                  <CartesianGrid stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="age" tick={{ fontSize: 11, fill: "#64748b" }} tickLine={false} />
                  <YAxis
                    yAxisId="left"
                    tick={{ fontSize: 11, fill: "#64748b" }}
                    tickLine={false}
                    label={{ value: `Corpus (${currency} Cr)`, angle: -90, position: "insideLeft", fontSize: 10, fill: "#64748b", offset: 10 }}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tick={{ fontSize: 11, fill: "#64748b" }}
                    tickLine={false}
                    label={{ value: `Withdrawal (${currency} L)`, angle: 90, position: "insideRight", fontSize: 10, fill: "#64748b", offset: 10 }}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#ffffff",
                      border: "1px solid rgba(228,228,231,0.8)",
                      borderRadius: "16px",
                      boxShadow: "0 10px 25px -5px rgba(0,0,0,0.05)",
                    }}
                  />
                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="corpus"
                    stroke={C.secondary}
                    fill="rgba(99, 102, 241, 0.05)"
                    strokeWidth={2.5}
                    name="Portfolio Value (Cr)"
                  />
                  <Bar yAxisId="right" dataKey="withdrawal" fill="#10b981" radius={[4, 4, 0, 0]} name="Annual Withdrawal (L)" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Bottom row: Milestones + Allocations & Insights */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Milestones Card */}
          <div
            className="lg:col-span-8 rounded-3xl border p-6 md:p-8 shadow-lg shadow-slate-100 bg-white"
            style={{ borderColor: "rgba(228, 228, 231, 0.8)" }}
          >
            <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
              <Compass size={18} className="text-slate-400" />
              Retirement Milestones
            </h3>
            <div className="relative w-full pt-4 pb-8">
              <div
                className="absolute top-[32px] left-4 right-4 h-1 rounded-full animate-pulse"
                style={{ background: "#f4f4f5" }}
              />
              <div
                className="absolute top-[32px] left-4 h-1 rounded-full transition-all duration-1000 ease-out z-0"
                style={{
                  background: `linear-gradient(90deg, ${C.secondary}, ${C.secondaryContainer})`,
                  width: `${Math.min(100, (startingCorpus / (targetCorpus * 1.3)) * 100)}%`,
                }}
              />
              <div className="relative z-10 flex justify-between items-start w-full px-4">
                <Milestone age={50} label="Barista FIRE" amount={formatCurrency(targetCorpus * 0.5)} />
                <Milestone age={60} label="Standard FIRE" amount={formatCurrency(targetCorpus)} active={fundedPct >= 100} />
                <Milestone age={65} label="Fat FIRE" amount={formatCurrency(targetCorpus * 1.3)} />
              </div>
            </div>
          </div>

          {/* Allocation Breakdown */}
          <div
            className="lg:col-span-4 rounded-3xl border p-6 md:p-8 flex flex-col shadow-lg shadow-slate-100 bg-white"
            style={{ borderColor: "rgba(228, 228, 231, 0.8)" }}
          >
            <h3 className="text-lg font-bold text-slate-800" style={{ color: C.primary }}>
              Retirement Mix
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Portfolio Allocations Profile
            </p>
            <div className="relative flex-1 flex justify-center items-center min-h-[160px]">
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={allocData} dataKey="value" innerRadius={50} outerRadius={70} paddingAngle={3}>
                    {allocData.map((d, i) => (
                      <Cell key={i} fill={d.color} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v, n) => [`${v}%`, n]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase">
                  {equityPct > 50 ? "Equity Hvy" : "Balanced"}
                </span>
                <span className="text-2xl font-black text-slate-800">
                  {equityPct}%
                </span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-4 border-t pt-4 border-slate-100">
              {allocData.map((d) => (
                <div key={d.name} className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
                  <span className="text-xs font-semibold text-slate-600">
                    {d.name} ({d.value}%)
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Advice card block */}
          <div
            className="lg:col-span-12 rounded-3xl p-8 relative overflow-hidden shadow-xl text-white border border-indigo-800/40"
            style={{ background: `linear-gradient(135deg, ${C.primaryContainer}, #0f0b40)` }}
          >
            {/* Background glowing sphere decoration */}
            <div className="absolute top-1/2 right-10 w-48 h-48 rounded-full bg-indigo-500/10 filter blur-3xl pointer-events-none" />

            <h3 className="text-lg font-bold mb-3 flex items-center gap-2.5">
              <Brain size={22} className="text-indigo-400" /> Advice & Safe Withdrawal Index
            </h3>
            <p className="text-sm leading-relaxed max-w-5xl relative z-10 text-indigo-100">
              Based on your custom <strong className="text-white">{equityPct}/{debtPct} Equity-Debt</strong> configuration, your recommended <strong className="text-white">Safe Withdrawal Rate (SWR)</strong> evaluates to <strong className="text-white">{safeWithdrawalRate.toFixed(2)}% SWR</strong>. This indicates that an initial annual budget withdrawal of <strong className="text-white">{formatCurrency(startingWithdrawal)}</strong> from a target nest egg of <strong className="text-white">{formatCurrency(targetCorpus)}</strong> has a high probability of survival through age 90, accounting for <strong className="text-white">{Math.round(inflationRate * 100)}% inflation</strong>.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
