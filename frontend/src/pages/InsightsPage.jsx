import React, { useState, useEffect } from "react";
import { Brain, CheckCircle, AlertTriangle, Lightbulb, HelpCircle, Activity, RefreshCw } from "lucide-react";
import { C } from "../constants/theme";
import { fetchInsights } from "../services/api";
import Header from "../components/Header";

const iconMap = {
  success: CheckCircle,
  warning: AlertTriangle,
  tip: Lightbulb,
  info: HelpCircle,
};

const borderStyles = {
  success: { borderLeft: `6px solid #10b981`, background: "rgba(16,185,129,0.01)" },
  warning: { borderLeft: `6px solid #ef4444`, background: "rgba(239,68,68,0.01)" },
  tip: { borderLeft: `6px solid #6366f1`, background: "rgba(99,102,241,0.01)" },
  info: { borderLeft: `6px solid #3b82f6`, background: "rgba(59,130,246,0.01)" },
};

const badgeColors = {
  success: { bg: "rgba(16,185,129,0.1)", text: "#10b981" },
  warning: { bg: "rgba(239,68,68,0.1)", text: "#ef4444" },
  tip: { bg: "rgba(99,102,241,0.1)", text: "#6366f1" },
  info: { bg: "rgba(59,130,246,0.1)", text: "#3b82f6" },
};

export default function InsightsPage({ userId, onMenuToggle, healthScore: headerHealthScore }) {
  const [insights, setInsights] = useState([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  const loadInsightsData = () => {
    setLoading(true);
    fetchInsights(userId)
      .then(setInsights)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (userId) {
      loadInsightsData();
    }
  }, [userId]);

  // Compute a dynamic Health Score from 0 to 1000
  let healthScore = 800; // starting default
  if (insights.length > 0) {
    const warnings = insights.filter((i) => i.type === "warning").length;
    const successes = insights.filter((i) => i.type === "success").length;
    const tips = insights.filter((i) => i.type === "tip").length;

    healthScore = 800 - warnings * 120 + successes * 40 + tips * 20;
    healthScore = Math.max(250, Math.min(1000, healthScore));
  }

  const getScoreRating = (score) => {
    if (score >= 850) return { text: "Outstanding", color: "#10b981" };
    if (score >= 700) return { text: "Strong", color: "#6366f1" };
    if (score >= 500) return { text: "#f59e0b" , color: "#f59e0b" };
    return { text: "Vulnerable", color: "#ef4444" };
  };

  const scoreRating = getScoreRating(healthScore);

  const filteredInsights =
    filter === "all" ? insights : insights.filter((i) => i.category.toLowerCase() === filter.toLowerCase());

  return (
    <>
      <Header title="Personalized Insights" onMenuToggle={onMenuToggle} healthScore={headerHealthScore} />
      <main className="flex-1 p-4 md:p-10 max-w-[1440px] mx-auto w-full overflow-y-auto animate-fade-in space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-2 flex items-center gap-3" style={{ color: C.onBackground }}>
              <Brain className="w-10 h-10 text-indigo-500" />
              Personalized Insights
            </h2>
            <p className="max-w-2xl text-lg text-slate-500">
              Dynamic evaluations of your asset allocation, withdrawal sustainability, and What-If plan configurations.
            </p>
          </div>
          <button
            onClick={loadInsightsData}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-3 rounded-2xl border font-bold text-sm transition-all bg-white hover:bg-slate-50 border-slate-200 cursor-pointer active:scale-95 shadow-sm text-slate-700 disabled:opacity-70"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Re-evaluate Plan
          </button>
        </div>

        {loading ? (
          <div className="h-64 flex items-center justify-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2" style={{ borderColor: C.secondary }}></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Health Score Summary Widget */}
            <div className="lg:col-span-4 space-y-6">
              <div
                className="rounded-3xl border shadow-lg shadow-slate-100 p-6 md:p-8 flex flex-col items-center justify-center text-center relative overflow-hidden bg-white"
                style={{ borderColor: "rgba(228, 228, 231, 0.8)" }}
              >
                {/* Decorative blob glow */}
                <div
                  className="absolute -top-10 -right-10 w-32 h-32 rounded-full filter blur-3xl opacity-10 pointer-events-none"
                  style={{ background: scoreRating.color }}
                />
                <h3 className="text-lg font-bold mb-6 self-start flex items-center gap-2 text-slate-800">
                  <Activity size={18} className="text-indigo-500" />
                  Plan Health Index
                </h3>

                <div className="relative w-44 h-44 flex items-center justify-center mb-6">
                  <svg viewBox="0 0 120 120" className="w-44 h-44 -rotate-90">
                    <circle cx="60" cy="60" r="50" fill="none" stroke="#f4f4f5" strokeWidth="8" />
                    <circle
                      cx="60"
                      cy="60"
                      r="50"
                      fill="none"
                      stroke={scoreRating.color}
                      strokeWidth="8"
                      strokeLinecap="round"
                      strokeDasharray={2 * Math.PI * 50}
                      strokeDashoffset={2 * Math.PI * 50 * (1 - healthScore / 1000)}
                      className="transition-all duration-1000 ease-out"
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center">
                    <span className="text-4xl font-black tracking-tighter text-slate-800">
                      {healthScore}
                    </span>
                    <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 mt-1">
                      Out of 1000
                    </span>
                  </div>
                </div>

                <div className="w-full text-center border-t border-slate-100 pt-5">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Twin Status Rating
                  </p>
                  <h4 className="text-2xl font-black mt-1" style={{ color: scoreRating.color }}>
                    {scoreRating.text}
                  </h4>
                  <p className="text-xs text-slate-400 mt-3 px-4 font-semibold leading-relaxed">
                    Your health rating represents the resilience of your target retirement corpus against inflation, volatile allocations, and event cash outlays.
                  </p>
                </div>
              </div>
            </div>

            {/* Insights Cards List */}
            <div className="lg:col-span-8 space-y-6">
              {/* Category Filter Segments */}
              <div
                className="flex p-1.5 rounded-2xl border max-w-md bg-white/70"
                style={{ borderColor: "rgba(228, 228, 231, 0.8)", backdropFilter: "blur(8px)" }}
              >
                {[
                  { key: "all", label: "All" },
                  { key: "retirement", label: "Retirement" },
                  { key: "allocation", label: "Allocation" },
                  { key: "liquidity", label: "Liquidity" },
                ].map((item) => {
                  const active = filter === item.key;
                  return (
                    <button
                      key={item.key}
                      onClick={() => setFilter(item.key)}
                      className="flex-1 py-2 text-xs font-bold rounded-xl transition-all outline-none cursor-pointer"
                      style={
                        active
                          ? { background: C.secondary, color: "#ffffff" }
                          : { color: C.onSurfaceVariant }
                      }
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>

              {filteredInsights.length === 0 ? (
                <div
                  className="rounded-3xl border p-12 text-center bg-white border-slate-200/60"
                >
                  <HelpCircle size={40} className="mx-auto mb-4 opacity-25" />
                  <p className="text-sm font-bold text-slate-500">
                    No insights found under this category.
                  </p>
                </div>
              ) : (
                <div className="space-y-4 animate-slide-up">
                  {filteredInsights.map((insight, idx) => {
                    const IconComponent = iconMap[insight.type] || HelpCircle;
                    const borderStyle = borderStyles[insight.type] || {};
                    const badgeColor = badgeColors[insight.type] || {};

                    return (
                      <div
                        key={idx}
                        className="rounded-2xl border shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 overflow-hidden bg-white"
                        style={{
                          borderColor: "rgba(228, 228, 231, 0.8)",
                          ...borderStyle,
                        }}
                      >
                        <div className="p-6">
                          <div className="flex justify-between items-start gap-4 mb-3">
                            <div className="flex items-center gap-3">
                              <div
                                className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                                style={{ background: badgeColor.bg, color: badgeColor.text }}
                              >
                                <IconComponent size={18} />
                              </div>
                              <div>
                                <span
                                  className="text-[9px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded-full inline-block bg-slate-100 text-slate-500"
                                >
                                  {insight.category}
                                </span>
                                <h4 className="text-lg font-bold mt-1 text-slate-800">
                                  {insight.title}
                                </h4>
                              </div>
                            </div>

                            <div
                              className="text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full whitespace-nowrap"
                              style={{ background: badgeColor.bg, color: badgeColor.text }}
                            >
                              {insight.impactMetric}
                            </div>
                          </div>

                          <p className="text-sm mb-4 leading-relaxed text-slate-500 font-medium">
                            {insight.description}
                          </p>

                          {insight.actionableStep && (
                            <div
                              className="p-3.5 rounded-xl border text-xs flex gap-2.5 items-start bg-slate-50/50"
                              style={{
                                borderColor: "rgba(228, 228, 231, 0.6)",
                              }}
                            >
                              <strong className="shrink-0 text-indigo-600 font-bold uppercase tracking-wider text-[9px] mt-0.5">
                                Actionable Step:
                              </strong>
                              <span className="text-slate-600 font-medium leading-relaxed">{insight.actionableStep}</span>
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
      </main>
    </>
  );
}
