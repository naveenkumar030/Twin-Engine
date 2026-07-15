import React, { useState, useEffect } from "react";
import { ResponsiveContainer, AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip } from "recharts";
import { SlidersHorizontal, Zap, Sparkles, TrendingUp, PiggyBank, Trash, Save, Calendar, Coins, ArrowUpRight } from "lucide-react";
import { C } from "../constants/theme";
import { lifeEvents } from "../constants/data";
import { fetchSimulationResult, fetchSavedScenarios, saveSimulationScenario, deleteSimulationScenario } from "../services/api";
import Header from "../components/Header";
import OptimizedPath from "../components/OptimizedPath";

const iconMap = {
  TrendingUp: TrendingUp,
  PiggyBank: PiggyBank
};

export default function SimulatorPage({ userId, currency = "₹", onMenuToggle, healthScore }) {
  const [selectedEvent, setSelectedEvent] = useState("car");
  const [amount, setAmount] = useState(1500000);
  const [months, setMonths] = useState(6);
  const [downpaymentPct, setDownpaymentPct] = useState(30);
  const [loanInterestRate, setLoanInterestRate] = useState(8.5);
  const [simulationData, setSimulationData] = useState(null);
  const [savedScenarios, setSavedScenarios] = useState([]);
  const [saveStatus, setSaveStatus] = useState("");

  // Fetch simulation calculation
  useEffect(() => {
    fetchSimulationResult(userId, selectedEvent, amount, months, downpaymentPct, loanInterestRate).then(setSimulationData);
  }, [userId, selectedEvent, amount, months, downpaymentPct, loanInterestRate]);

  // Load saved scenarios from MongoDB
  const loadScenarios = () => {
    if (userId) {
      fetchSavedScenarios(userId).then(setSavedScenarios);
    }
  };

  useEffect(() => {
    loadScenarios();
  }, [userId]);

  const handleSaveScenario = () => {
    if (!userId) return;
    const matchedEvent = lifeEvents.find(e => e.key === selectedEvent);
    const newScenario = {
      eventKey: selectedEvent,
      label: matchedEvent ? matchedEvent.label : "Life Event",
      amount: amount,
      months: months
    };
    saveSimulationScenario(userId, newScenario).then(() => {
      loadScenarios();
      setSaveStatus("Scenario saved successfully!");
      setTimeout(() => setSaveStatus(""), 3000);
      window.dispatchEvent(new Event("fintwin_scenarios_changed"));
    });
  };

  const handleDeleteScenario = (e, scenarioId) => {
    e.stopPropagation(); // prevent loading the values when clicking delete
    if (!userId) return;
    deleteSimulationScenario(userId, scenarioId).then(() => {
      loadScenarios();
      setSaveStatus("Scenario deleted");
      setTimeout(() => setSaveStatus(""), 3000);
      window.dispatchEvent(new Event("fintwin_scenarios_changed"));
    });
  };

  const handleLoadScenario = (scenario) => {
    setSelectedEvent(scenario.eventKey);
    setAmount(scenario.amount);
    setMonths(scenario.months);
  };

  const isLoaded = simulationData !== null;
  const wealthProjectionData = isLoaded ? simulationData.wealthProjection : [];
  const impact = isLoaded ? simulationData.predictedImpact : {
    lossAmountLakhs: 22.0,
    qualityOfLifeImprovementPct: 15,
    retirementAgeDeltaYears: 2,
    liquidityRisk: "Medium",
    timeToRecoveryYears: 8.5
  };
  const paths = isLoaded ? simulationData.optimizedPaths : [
    { title: "Delay by 12 Months", desc: "Recovers ₹14L of projected loss.", icon: "TrendingUp" },
    { title: "Increase Downpayment", desc: "Shift 10% from equity to reduce debt burden.", icon: "PiggyBank" }
  ];

  return (
    <>
      <Header title="What-If Simulator" onMenuToggle={onMenuToggle} healthScore={healthScore} />
      <main className="flex-1 p-4 md:p-10 max-w-[1440px] mx-auto w-full overflow-y-auto animate-fade-in space-y-8">
        {/* Toast alerts */}
        {saveStatus && (
          <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 text-xs font-bold animate-toast-slide">
            <Sparkles size={15} />
            {saveStatus}
          </div>
        )}

        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-2" style={{ color: C.onBackground }}>
              What-If Simulator
            </h2>
            <p className="max-w-2xl text-lg text-slate-500">
              Project the long-term impact of major life events on your financial trajectory using your personalized digital twin.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Config panel */}
          <div className="col-span-1 lg:col-span-4 space-y-6">
            <div
              className="rounded-3xl border shadow-lg shadow-slate-100 p-6 bg-white"
              style={{ borderColor: "rgba(228, 228, 231, 0.8)" }}
            >
              <h3
                className="text-lg font-bold border-b pb-4 mb-5 flex items-center gap-2 text-slate-800"
                style={{ borderColor: "rgba(228, 228, 231, 0.4)" }}
              >
                <SlidersHorizontal size={18} className="text-indigo-500" />
                Scenario Configuration
              </h3>

              <div className="space-y-6">
                <div>
                  <label className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-2">
                    Life Event
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {lifeEvents.map((ev) => {
                      const Icon = ev.icon;
                      const active = selectedEvent === ev.key;
                      return (
                        <button
                          key={ev.key}
                          onClick={() => setSelectedEvent(ev.key)}
                          className="p-3 border rounded-2xl text-center text-xs flex flex-col items-center gap-1.5 transition-all cursor-pointer font-bold"
                          style={
                            active
                              ? { background: "rgba(99, 102, 241, 0.08)", borderColor: C.secondary, color: C.secondary }
                              : { borderColor: "rgba(228, 228, 231, 0.8)", color: C.onSurfaceVariant }
                          }
                        >
                          <Icon size={18} className={active ? "text-indigo-600" : "text-slate-400"} />
                          {ev.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-2">
                    Estimated Amount
                  </label>
                  <div className="relative group">
                    <span className="absolute left-3.5 top-3.5 font-bold text-slate-400 group-focus-within:text-indigo-600">
                      {currency}
                    </span>
                    <input
                      className="w-full pl-8 pr-4 py-3.5 border rounded-2xl outline-none text-sm font-semibold transition-all focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 border-slate-200"
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(Number(e.target.value))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-400 uppercase tracking-widest">
                      Target Timeline
                    </span>
                    <span className="font-extrabold text-indigo-600">
                      In {months} Mo
                    </span>
                  </div>
                  <input
                    className="w-full h-1.5 rounded-lg appearance-none cursor-pointer"
                    max="60"
                    min="1"
                    type="range"
                    value={months}
                    onChange={(e) => setMonths(Number(e.target.value))}
                  />
                  <div className="flex justify-between text-[10px] font-bold text-slate-400">
                    <span>Now</span>
                    <span>5 Years</span>
                  </div>
                </div>

                <div className="border rounded-2xl p-4 bg-slate-50/50 space-y-4" style={{ borderColor: "rgba(228, 228, 231, 0.6)" }}>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <label className="font-bold text-slate-400 uppercase tracking-widest">
                        Cash Downpayment (%)
                      </label>
                      <span className="font-extrabold text-indigo-600">
                        {downpaymentPct}% Cash
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      value={downpaymentPct}
                      onChange={(e) => setDownpaymentPct(Number(e.target.value))}
                      className="w-full h-1.5 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <label className="font-bold text-slate-400 uppercase tracking-widest">
                        Loan Interest Rate (%)
                      </label>
                      <span className="font-extrabold text-indigo-600">
                        {loanInterestRate}% Interest
                      </span>
                    </div>
                    <input
                      type="range"
                      min="4"
                      max="18"
                      step="0.1"
                      value={loanInterestRate}
                      onChange={(e) => setLoanInterestRate(Number(e.target.value))}
                      className="w-full h-1.5 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>

                  <div className="h-2 flex rounded-full overflow-hidden mt-3 bg-zinc-200">
                    {downpaymentPct > 0 && <div style={{ width: `${downpaymentPct}%`, background: C.secondary }} />}
                    {downpaymentPct < 100 && <div style={{ width: `${100 - downpaymentPct}%`, background: "#93c5fd" }} />}
                  </div>
                  <div className="flex justify-between text-[10px] font-bold">
                    <span style={{ color: C.secondary }}>
                      ₹{(amount * downpaymentPct / 100 / 100000).toFixed(1)}L Cash
                    </span>
                    <span className="text-blue-500">
                      ₹{(amount * (100 - downpaymentPct) / 100 / 100000).toFixed(1)}L Loan
                    </span>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    className="flex-1 text-white font-bold py-3.5 rounded-2xl transition-all shadow-lg hover:shadow-indigo-500/20 active:scale-95 flex justify-center items-center gap-2 cursor-pointer"
                    style={{ background: `linear-gradient(135deg, ${C.secondary}, ${C.secondaryContainer})` }}
                  >
                    <Zap size={16} fill="#ffffff" /> SIMULATE
                  </button>
                  <button
                    onClick={handleSaveScenario}
                    title="Save current config to database"
                    className="px-4 py-3.5 rounded-2xl border font-bold transition-all flex items-center justify-center gap-2 hover:bg-slate-50 text-slate-700 active:scale-95 cursor-pointer bg-white"
                    style={{ borderColor: "rgba(228, 228, 231, 0.8)" }}
                  >
                    <Save size={16} /> Save
                  </button>
                </div>
              </div>
            </div>

            {/* Saved Scenarios Sidebar */}
            {savedScenarios.length > 0 && (
              <div
                className="rounded-3xl border shadow-lg shadow-slate-100 p-6 bg-white animate-slide-up"
                style={{ borderColor: "rgba(228, 228, 231, 0.8)" }}
              >
                <h4 className="text-xs font-extrabold uppercase tracking-widest text-slate-400 mb-4">
                  Saved What-If Scenarios ({savedScenarios.length})
                </h4>
                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                  {savedScenarios.map((sc) => (
                    <div
                      key={sc.id}
                      onClick={() => handleLoadScenario(sc)}
                      className="p-3 border rounded-2xl flex items-center justify-between text-xs cursor-pointer hover:bg-indigo-50/20 hover:border-indigo-150 transition-all bg-white"
                      style={{ borderColor: "rgba(228, 228, 231, 0.6)" }}
                    >
                      <div className="flex-1">
                        <span className="font-bold text-slate-700 block">
                          {sc.label}
                        </span>
                        <div className="text-[10px] text-slate-400 font-semibold mt-0.5">
                          {currency}{sc.amount / 100000}L • In {sc.months} months
                        </div>
                      </div>
                      <button
                        onClick={(e) => handleDeleteScenario(e, sc.id)}
                        className="p-1.5 hover:bg-rose-50 text-rose-500 rounded-xl transition-all cursor-pointer"
                      >
                        <Trash size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Results panel */}
          <div className="col-span-1 lg:col-span-8 space-y-6 flex flex-col">
            <div
              className="rounded-3xl border shadow-lg shadow-slate-100 p-6 md:p-8 flex-1 flex flex-col bg-white"
              style={{ borderColor: "rgba(228, 228, 231, 0.8)" }}
            >
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                  <h3 className="text-lg font-bold text-slate-800">
                    20-Year Wealth Projection
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">Baseline vs. Scenario Trajectory</p>
                </div>
                <div className="flex items-center gap-4 text-xs font-semibold text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full" style={{ background: C.secondary }} />
                    <span>Baseline</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full border-2 border-dashed border-rose-500" />
                    <span>Simulated</span>
                  </div>
                </div>
              </div>

              <div className="flex-1 min-h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={wealthProjectionData} margin={{ top: 10, right: -5, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="baselineGrad" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor={C.secondary} stopOpacity={0.15} />
                        <stop offset="100%" stopColor={C.secondary} stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="simGrad" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="#ef4444" stopOpacity={0.1} />
                        <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="year" tick={{ fontSize: 11, fill: "#64748b" }} tickLine={false} />
                    <YAxis
                      tick={{ fontSize: 11, fill: "#64748b" }}
                      tickLine={false}
                      tickFormatter={(v) => `${currency}${v}Cr`}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "#ffffff",
                        border: "1px solid rgba(228,228,231,0.8)",
                        borderRadius: "16px",
                        boxShadow: "0 10px 25px -5px rgba(0,0,0,0.05)",
                      }}
                      formatter={(v) => `${currency}${v}Cr`}
                    />
                    <Area
                      type="monotone"
                      dataKey="baseline"
                      stroke={C.secondary}
                      strokeWidth={2.5}
                      fill="url(#baselineGrad)"
                      name="Baseline"
                    />
                    <Area
                      type="monotone"
                      dataKey="simulated"
                      stroke="#ef4444"
                      strokeWidth={2}
                      strokeDasharray="4 4"
                      fill="url(#simGrad)"
                      name="Simulated"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Predicted Impact Card */}
              <div
                className="rounded-3xl border shadow-lg shadow-slate-100 p-6 relative overflow-hidden bg-white"
                style={{ borderColor: "rgba(228, 228, 231, 0.8)" }}
              >
                <div className="absolute top-1/2 right-4 w-40 h-40 rounded-full bg-indigo-500/5 filter blur-3xl pointer-events-none" />

                <h4 className="text-[10px] font-extrabold uppercase tracking-widest mb-3 flex items-center gap-1.5 text-indigo-600">
                  <Sparkles size={14} className="animate-pulse" /> Predicted Impact
                </h4>
                <p className="text-sm relative z-10 leading-relaxed text-slate-600">
                  This purchase will reduce your retirement corpus by{" "}
                  <span className="font-extrabold text-rose-500">
                    {currency}{impact.lossAmountLakhs} Lakh
                  </span>{" "}
                  but improve your quality of life score by{" "}
                  <span
                    className="font-extrabold px-2 py-0.5 rounded-full text-xs"
                    style={{ color: "#10b981", background: "rgba(16, 185, 129, 0.1)" }}
                  >
                    +{impact.qualityOfLifeImprovementPct}%
                  </span>
                  .
                </p>
                <div className="mt-6 grid grid-cols-3 gap-2 border-t pt-4 border-slate-100">
                  {[
                    { label: "Target Retirement", value: 60 + impact.retirementAgeDeltaYears, delta: `+${impact.retirementAgeDeltaYears}y`, color: "#ef4444" },
                    { label: "Liquidity Risk", value: impact.liquidityRisk, color: "#f59e0b" },
                    { label: "Recovery Time", value: `${impact.timeToRecoveryYears}Y`, color: "#10b981" },
                  ].map((s) => (
                    <div
                      key={s.label}
                      className="p-2.5 rounded-xl border text-center bg-slate-50/30"
                      style={{ borderColor: "rgba(228, 228, 231, 0.5)" }}
                    >
                      <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider leading-none mb-1.5 h-6 flex items-center justify-center">
                        {s.label}
                      </div>
                      <div className="text-sm font-black tracking-tight" style={{ color: s.color }}>
                        {s.value} {s.delta && <span className="text-[10px] block font-semibold text-rose-400 mt-0.5">{s.delta}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Optimized Paths Column */}
              <div className="space-y-3 flex flex-col justify-between">
                <h4 className="text-xs font-extrabold uppercase tracking-widest text-slate-400 pl-1">
                  Optimized Paths
                </h4>
                {paths.map((path, idx) => {
                  const IconComp = iconMap[path.icon] || TrendingUp;
                  return (
                    <OptimizedPath key={idx} title={path.title} desc={path.desc} icon={IconComp} />
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
