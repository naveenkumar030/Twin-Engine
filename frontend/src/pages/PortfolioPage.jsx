import React, { useState, useEffect, useMemo } from "react";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, Legend,
} from "recharts";
import {
  Landmark, Plus, Trash, AlertTriangle, ArrowUpDown, CheckCircle,
  Wallet, ArrowUpRight, Layers, Upload, FileText, Search, Filter,
  TrendingUp, TrendingDown, Download, Star, AlertCircle, RefreshCw,
  ChevronDown, BarChart2, Target,
} from "lucide-react";
import { C, ASSET_COLORS, getScoreColor } from "../constants/theme";
import { ASSET_CATEGORIES } from "../constants/data";
import {
  fetchHoldings, saveHolding, deleteHolding, fetchUserSettings,
  uploadHoldingsCSV, clearHoldings,
} from "../services/api";
import Header from "../components/Header";
import ScoreGauge from "../components/ScoreGauge";
import AnimatedCounter from "../components/AnimatedCounter";
import toast from "react-hot-toast";

// ── Helpers ──
function formatCurrency(val, currency = "₹") {
  if (Math.abs(val) >= 10000000) return `${currency}${(val / 10000000).toFixed(2)}Cr`;
  if (Math.abs(val) >= 100000) return `${currency}${(val / 100000).toFixed(1)}L`;
  if (Math.abs(val) >= 1000) return `${currency}${(val / 1000).toFixed(1)}K`;
  return `${currency}${Math.round(val).toLocaleString()}`;
}

function getAssetColor(category) {
  return ASSET_COLORS[category] || "#6366f1";
}

function calcCAGR(current, invested, years) {
  if (invested <= 0 || years <= 0) return 0;
  return (Math.pow(current / invested, 1 / years) - 1) * 100;
}

function calcDiversificationScore(holdings, totalValue) {
  if (holdings.length === 0) return 0;
  const categories = [...new Set(holdings.map(h => h.category))];
  const catCount = categories.length;
  const maxConcentration = holdings.reduce((max, h) =>
    Math.max(max, totalValue > 0 ? (h.amount / totalValue) * 100 : 0), 0);
  const catScore = Math.min(40, catCount * 8);
  const concScore = Math.max(0, 60 - maxConcentration);
  return Math.min(100, Math.round(catScore + concScore));
}

export default function PortfolioPage({ userId, currency = "₹", onMenuToggle, healthScore, darkMode }) {
  const [holdings, setHoldings] = useState([]);
  const [targetAlloc, setTargetAlloc] = useState({ equityAllocation: 65, debtAllocation: 25, goldAllocation: 5, realEstateAllocation: 5 });
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [uploadTab, setUploadTab] = useState("manual");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("amount");
  const [sortDir, setSortDir] = useState("desc");
  const [filterCategory, setFilterCategory] = useState("All");
  const [activeTab, setActiveTab] = useState("overview"); // overview | holdings | analytics

  // Form state
  const [assetName, setAssetName] = useState("");
  const [category, setCategory] = useState("Stocks");
  const [amount, setAmount] = useState("");
  const [investedAmount, setInvestedAmount] = useState("");
  const [growthRate, setGrowthRate] = useState("");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [notes, setNotes] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const loadData = () => {
    setLoading(true);
    Promise.all([fetchHoldings(userId), fetchUserSettings(userId)])
      .then(([holdingsData, settingsData]) => {
        setHoldings(holdingsData || []);
        if (settingsData) {
          setTargetAlloc({
            equityAllocation: settingsData.equityAllocation || 65,
            debtAllocation: settingsData.debtAllocation || 25,
            goldAllocation: settingsData.goldAllocation || 5,
            realEstateAllocation: settingsData.realEstateAllocation || 5,
          });
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { if (userId) loadData(); }, [userId]);

  // ── Portfolio Metrics ──
  const totalPortfolioValue = useMemo(() => holdings.reduce((s, h) => s + h.amount, 0), [holdings]);
  const totalInvested = useMemo(() => holdings.reduce((s, h) => s + (h.investedAmount || h.amount * 0.8), 0), [holdings]);
  const totalPL = totalPortfolioValue - totalInvested;
  const totalReturnPct = totalInvested > 0 ? ((totalPL / totalInvested) * 100) : 0;
  const weightedReturnRate = totalPortfolioValue > 0
    ? holdings.reduce((s, h) => s + (h.amount / totalPortfolioValue) * (h.growthRate || 0), 0) : 0;
  const diversificationScore = useMemo(() => calcDiversificationScore(holdings, totalPortfolioValue), [holdings, totalPortfolioValue]);

  // Category breakdown
  const categoryBreakdown = useMemo(() => {
    const map = {};
    holdings.forEach(h => {
      if (!map[h.category]) map[h.category] = 0;
      map[h.category] += h.amount;
    });
    return Object.entries(map)
      .map(([cat, value]) => ({
        name: cat,
        value,
        pct: totalPortfolioValue > 0 ? Math.round((value / totalPortfolioValue) * 100) : 0,
        color: getAssetColor(cat),
      }))
      .sort((a, b) => b.value - a.value);
  }, [holdings, totalPortfolioValue]);

  // Top & Worst performers
  const sortedByReturn = [...holdings].sort((a, b) => (b.growthRate || 0) - (a.growthRate || 0));
  const topPerformers = sortedByReturn.slice(0, 3);
  const worstPerformers = [...sortedByReturn].reverse().slice(0, 3);

  // Filtered & sorted holdings
  const filteredHoldings = useMemo(() => {
    let list = [...holdings];
    if (filterCategory !== "All") list = list.filter(h => h.category === filterCategory);
    if (searchTerm) list = list.filter(h =>
      h.assetName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      h.category.toLowerCase().includes(searchTerm.toLowerCase())
    );
    list.sort((a, b) => {
      const av = sortBy === "amount" ? a.amount : sortBy === "growthRate" ? (a.growthRate || 0) : a.assetName.localeCompare(b.assetName);
      const bv = sortBy === "amount" ? b.amount : sortBy === "growthRate" ? (b.growthRate || 0) : b.assetName.localeCompare(a.assetName);
      return sortDir === "desc" ? (typeof av === "number" ? bv - av : 0) : (typeof av === "number" ? av - bv : 0);
    });
    return list;
  }, [holdings, filterCategory, searchTerm, sortBy, sortDir]);

  // Rebalancing suggestions
  const rebalancingAdvice = useMemo(() => {
    const advice = [];
    const classMap = { Equity: 0, Debt: 0, Gold: 0, "Real Estate": 0 };
    const targetMap = {
      Equity: targetAlloc.equityAllocation,
      Debt: targetAlloc.debtAllocation,
      Gold: targetAlloc.goldAllocation,
      "Real Estate": targetAlloc.realEstateAllocation,
    };
    holdings.forEach(h => {
      const cls = ["Stocks", "Mutual Funds", "ETFs", "Equity"].includes(h.category) ? "Equity"
        : ["Fixed Deposits", "Bonds", "Debt"].includes(h.category) ? "Debt"
        : h.category === "Gold" ? "Gold"
        : ["REITs", "Real Estate"].includes(h.category) ? "Real Estate" : null;
      if (cls) classMap[cls] += h.amount;
    });
    Object.keys(targetMap).forEach(cls => {
      const actualPct = totalPortfolioValue > 0 ? Math.round((classMap[cls] / totalPortfolioValue) * 100) : 0;
      const targetPct = targetMap[cls];
      const diff = actualPct - targetPct;
      if (Math.abs(diff) > 3) {
        advice.push({
          category: cls,
          action: diff > 0 ? "SELL" : "BUY",
          pctDiff: Math.abs(diff),
          amount: Math.abs((diff / 100) * totalPortfolioValue),
          text: diff > 0
            ? `Over-allocated by ${Math.abs(diff)}%. Reduce by ${formatCurrency(Math.abs((diff / 100) * totalPortfolioValue), currency)}.`
            : `Under-allocated by ${Math.abs(diff)}%. Add ${formatCurrency(Math.abs((diff / 100) * totalPortfolioValue), currency)}.`,
        });
      }
    });
    return advice;
  }, [holdings, targetAlloc, totalPortfolioValue, currency]);

  // Monthly performance simulation
  const performanceChart = useMemo(() => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return months.map((m, i) => ({
      month: m,
      value: Math.round(totalPortfolioValue * (0.9 + 0.1 * Math.sin(i * 0.5) + i * 0.008)),
    }));
  }, [totalPortfolioValue]);

  const handleAddHolding = async (e) => {
    e.preventDefault();
    if (!assetName.trim() || !amount || !growthRate) {
      toast.error("Please fill all required fields.");
      return;
    }
    if (Number(amount) <= 0) { toast.error("Amount must be positive."); return; }
    setActionLoading(true);
    try {
      await saveHolding(userId, {
        assetName: assetName.trim(),
        category,
        amount: Number(amount),
        investedAmount: Number(investedAmount) || Number(amount),
        growthRate: Number(growthRate),
        purchaseDate,
        notes,
      });
      setAssetName(""); setAmount(""); setInvestedAmount(""); setGrowthRate("");
      setPurchaseDate(""); setNotes(""); setShowAddForm(false);
      loadData();
      window.dispatchEvent(new Event("fintwin_portfolio_changed"));
      toast.success("Asset added successfully!");
    } catch {
      toast.error("Failed to add holding.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteHolding = async (holdingId) => {
    if (!confirm("Delete this asset?")) return;
    try {
      await deleteHolding(userId, holdingId);
      loadData();
      window.dispatchEvent(new Event("fintwin_portfolio_changed"));
      toast.success("Asset removed.");
    } catch { toast.error("Failed to delete asset."); }
  };

  const handleFileUpload = (file) => {
    if (!file.name.endsWith(".csv")) { toast.error("Please upload a .csv file."); return; }
    setUploading(true);
    uploadHoldingsCSV(userId, file)
      .then((data) => { toast.success(`Imported ${data.length} holdings!`); loadData(); window.dispatchEvent(new Event("fintwin_portfolio_changed")); })
      .catch((err) => toast.error(err.message || "Failed to process CSV."))
      .finally(() => setUploading(false));
  };

  const exportCSV = () => {
    const rows = [["Asset Name", "Category", "Current Value", "Invested", "Return Rate", "P&L"]];
    holdings.forEach(h => {
      const pl = h.amount - (h.investedAmount || h.amount * 0.8);
      rows.push([h.assetName, h.category, h.amount, h.investedAmount || "", h.growthRate, pl.toFixed(0)]);
    });
    const csv = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "portfolio.csv"; a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported!");
  };

  const cardBg = darkMode ? "#1e293b" : "#ffffff";
  const cardBorder = darkMode ? "rgba(51,65,85,0.7)" : "rgba(228,228,231,0.8)";
  const textPrimary = darkMode ? "#f1f5f9" : C.onSurface;
  const textMuted = darkMode ? "#94a3b8" : "#64748b";
  const inputCls = `w-full px-4 py-3 rounded-xl border outline-none text-sm font-semibold transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 ${darkMode ? "bg-slate-800 border-slate-600 text-slate-100" : "bg-white border-slate-200"}`;

  const divScoreColor = getScoreColor(diversificationScore);
  const uniqueCategories = ["All", ...new Set(holdings.map(h => h.category))];

  return (
    <>
      <Header title="Asset Portfolio" onMenuToggle={onMenuToggle} healthScore={healthScore} darkMode={darkMode} userId={userId} />
      <main className="flex-1 p-4 md:p-8 max-w-[1600px] mx-auto w-full overflow-y-auto animate-fade-in space-y-6">

        {/* ── Page Header ── */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-3xl font-extrabold tracking-tight" style={{ color: textPrimary }}>Asset Portfolio</h2>
            <p className="text-sm mt-1" style={{ color: textMuted }}>
              Manage, analyze and optimize your investment portfolio
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {holdings.length > 0 && (
              <>
                <button onClick={exportCSV}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-bold transition-all hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                  style={{ background: cardBg, borderColor: cardBorder, color: textPrimary }}>
                  <Download size={15} /> Export CSV
                </button>
                <button onClick={() => { if (confirm("Clear all holdings?")) clearHoldings(userId).then(() => { setHoldings([]); toast.success("All holdings cleared."); window.dispatchEvent(new Event("fintwin_portfolio_changed")); }); }}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-bold text-red-500 border-red-200 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all cursor-pointer"
                  style={{ background: cardBg }}>
                  <Trash size={15} /> Clear All
                </button>
              </>
            )}
            <button onClick={() => setShowAddForm(s => !s)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm text-white transition-all active:scale-95 cursor-pointer shadow-lg hover:shadow-indigo-500/25"
              style={{ background: `linear-gradient(135deg, ${C.secondary}, ${C.secondaryContainer})` }}>
              <Plus size={16} /> {showAddForm ? "Close Form" : "Add Asset"}
            </button>
          </div>
        </div>

        {/* ── KPI Cards ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Portfolio Value", val: totalPortfolioValue, fmt: v => formatCurrency(v, currency), icon: Wallet, iconBg: "rgba(99,102,241,0.1)", iconColor: C.secondary },
            { label: "Total P&L", val: totalPL, fmt: v => formatCurrency(v, currency), icon: totalPL >= 0 ? TrendingUp : TrendingDown, iconBg: totalPL >= 0 ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)", iconColor: totalPL >= 0 ? "#10b981" : "#ef4444", valColor: totalPL >= 0 ? "#10b981" : "#ef4444" },
            { label: "Weighted Return", val: weightedReturnRate, fmt: v => `${v.toFixed(2)}% p.a.`, icon: BarChart2, iconBg: "rgba(139,92,246,0.1)", iconColor: "#8b5cf6" },
            { label: "Total Assets", val: holdings.length, fmt: v => `${Math.round(v)} Assets`, icon: Layers, iconBg: "rgba(245,158,11,0.1)", iconColor: "#f59e0b" },
          ].map((stat, i) => (
            <div key={i} className="rounded-2xl border p-5 flex items-center justify-between hover:shadow-lg transition-all duration-300 card-hover"
              style={{ background: cardBg, borderColor: cardBorder }}>
              <div>
                <p className="text-[10px] uppercase font-bold tracking-widest mb-1" style={{ color: textMuted }}>{stat.label}</p>
                <div className="text-xl font-black" style={{ color: stat.valColor || textPrimary }}>
                  <AnimatedCounter value={stat.val} formatter={stat.fmt} />
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: stat.iconBg, color: stat.iconColor }}>
                <stat.icon size={18} />
              </div>
            </div>
          ))}
        </div>

        {/* ── Add Form ── */}
        {showAddForm && (
          <div className="rounded-2xl border p-6 animate-slide-up" style={{ background: cardBg, borderColor: cardBorder }}>
            <h3 className="text-lg font-bold mb-5" style={{ color: textPrimary }}>Add Portfolio Asset</h3>
            <div className="flex border-b mb-6 gap-6" style={{ borderColor: cardBorder }}>
              {["manual", "csv"].map(t => (
                <button key={t} onClick={() => setUploadTab(t)}
                  className="pb-2.5 text-xs font-bold transition-all relative cursor-pointer outline-none capitalize"
                  style={{ color: uploadTab === t ? C.secondary : textMuted }}>
                  {t === "manual" ? "Manual Entry" : "Upload CSV"}
                  {uploadTab === t && <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t-full" style={{ background: C.secondary }} />}
                </button>
              ))}
            </div>

            {uploadTab === "manual" ? (
              <form onSubmit={handleAddHolding} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-extrabold uppercase tracking-widest mb-2" style={{ color: textMuted }}>Asset Name *</label>
                  <input required type="text" placeholder="e.g. Nifty 50 Index Fund" value={assetName} onChange={e => setAssetName(e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold uppercase tracking-widest mb-2" style={{ color: textMuted }}>Category *</label>
                  <select value={category} onChange={e => setCategory(e.target.value)} className={inputCls}>
                    {ASSET_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold uppercase tracking-widest mb-2" style={{ color: textMuted }}>Current Value ({currency}) *</label>
                  <input required type="number" placeholder="Current market value" value={amount} onChange={e => setAmount(e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold uppercase tracking-widest mb-2" style={{ color: textMuted }}>Invested Amount ({currency})</label>
                  <input type="number" placeholder="Amount originally invested" value={investedAmount} onChange={e => setInvestedAmount(e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold uppercase tracking-widest mb-2" style={{ color: textMuted }}>Expected Return (% p.a.) *</label>
                  <input required type="number" step="0.1" placeholder="e.g. 12.5" value={growthRate} onChange={e => setGrowthRate(e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold uppercase tracking-widest mb-2" style={{ color: textMuted }}>Purchase Date</label>
                  <input type="date" value={purchaseDate} onChange={e => setPurchaseDate(e.target.value)} className={inputCls} />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-extrabold uppercase tracking-widest mb-2" style={{ color: textMuted }}>Notes</label>
                  <input type="text" placeholder="Optional notes about this asset..." value={notes} onChange={e => setNotes(e.target.value)} className={inputCls} />
                </div>
                <div className="md:col-span-3">
                  <button type="submit" disabled={actionLoading}
                    className="w-full py-3.5 rounded-xl text-sm font-bold text-white transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 shadow-lg"
                    style={{ background: `linear-gradient(135deg, ${C.secondary}, ${C.secondaryContainer})` }}>
                    <Plus size={16} /> {actionLoading ? "Saving..." : "Add to Portfolio"}
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div
                  className="border-2 border-dashed rounded-xl p-10 text-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all"
                  style={{ borderColor: C.secondary + "40" }}
                  onClick={() => document.getElementById("holdings-csv-input").click()}
                >
                  <input id="holdings-csv-input" type="file" accept=".csv" className="hidden" onChange={e => e.target.files?.[0] && handleFileUpload(e.target.files[0])} disabled={uploading} />
                  <FileText size={40} className="mx-auto mb-3 text-slate-300" />
                  <p className="font-bold text-sm mb-1" style={{ color: textPrimary }}>{uploading ? "Processing..." : "Click to Upload Holdings CSV"}</p>
                  <p className="text-[10px]" style={{ color: textMuted }}>Format: AssetName, Category, Amount, GrowthRate</p>
                </div>
                <div className="p-4 rounded-xl border text-xs space-y-1" style={{ background: darkMode ? "rgba(51,65,85,0.3)" : "#f8fafc", borderColor: cardBorder }}>
                  <p className="font-bold" style={{ color: textPrimary }}>Expected CSV Headers:</p>
                  <code className="block bg-slate-800 text-slate-200 p-2 rounded font-mono">AssetName,Category,Amount,GrowthRate</code>
                  <p style={{ color: textMuted }}>Example: <code className="text-indigo-400">HDFC Nifty 50 ETF,Stocks,500000,12.5</code></p>
                </div>
              </div>
            )}
          </div>
        )}

        {loading ? (
          <div className="h-64 flex items-center justify-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2" style={{ borderColor: C.secondary }} />
          </div>
        ) : (
          <>
            {/* ── Tab Navigation ── */}
            <div className="flex gap-1 p-1 rounded-xl border w-fit" style={{ background: darkMode ? "rgba(51,65,85,0.3)" : "#f8fafc", borderColor: cardBorder }}>
              {[
                { key: "overview", label: "Overview" },
                { key: "holdings", label: `Holdings (${holdings.length})` },
                { key: "analytics", label: "Analytics" },
              ].map(tab => (
                <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                  className="px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer"
                  style={activeTab === tab.key
                    ? { background: C.secondary, color: "#fff" }
                    : { color: textMuted }}>
                  {tab.label}
                </button>
              ))}
            </div>

            {/* ── OVERVIEW TAB ── */}
            {activeTab === "overview" && (
              <div className="space-y-6 animate-fade-in">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Allocation Donut */}
                  <div className="lg:col-span-5 rounded-2xl border p-6" style={{ background: cardBg, borderColor: cardBorder }}>
                    <h3 className="text-base font-bold mb-4" style={{ color: textPrimary }}>Asset Allocation</h3>
                    {categoryBreakdown.length === 0 ? (
                      <div className="h-52 flex items-center justify-center">
                        <p className="text-sm font-semibold" style={{ color: textMuted }}>No holdings yet. Add assets to see allocation.</p>
                      </div>
                    ) : (
                      <>
                        <div className="relative flex justify-center">
                          <ResponsiveContainer width="100%" height={200}>
                            <PieChart>
                              <Pie data={categoryBreakdown} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={3}>
                                {categoryBreakdown.map((d, i) => <Cell key={i} fill={d.color} stroke="none" />)}
                              </Pie>
                              <Tooltip formatter={(v) => [formatCurrency(v, currency), ""]}
                                contentStyle={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: "12px", fontSize: "11px", color: textPrimary }} />
                            </PieChart>
                          </ResponsiveContainer>
                          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <span className="text-xs font-bold" style={{ color: textMuted }}>Total</span>
                            <span className="text-xl font-black" style={{ color: textPrimary }}>{formatCurrency(totalPortfolioValue, currency)}</span>
                          </div>
                        </div>
                        <div className="mt-4 grid grid-cols-2 gap-2">
                          {categoryBreakdown.slice(0, 6).map(cat => (
                            <div key={cat.name} className="flex items-center gap-2">
                              <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: cat.color }} />
                              <span className="text-xs font-semibold truncate" style={{ color: textPrimary }}>{cat.name}</span>
                              <span className="text-xs font-black ml-auto" style={{ color: textMuted }}>{cat.pct}%</span>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Scores + Rebalancing */}
                  <div className="lg:col-span-7 space-y-5">
                    {/* Scores row */}
                    <div className="grid grid-cols-3 gap-4">
                      {[
                        { label: "Diversification", score: diversificationScore },
                        { label: "Return Quality", score: Math.min(100, Math.round(weightedReturnRate * 6)) },
                        { label: "P&L Score", score: Math.min(100, Math.max(0, 50 + Math.round(totalReturnPct * 2))) },
                      ].map(item => {
                        const color = getScoreColor(item.score);
                        return (
                          <div key={item.label} className="rounded-xl border p-4 text-center" style={{ background: cardBg, borderColor: cardBorder }}>
                            <ScoreGauge score={item.score} max={100} color={color} size={70} strokeWidth={6}>
                              <span className="text-base font-black" style={{ color }}>{item.score}</span>
                            </ScoreGauge>
                            <p className="text-[10px] uppercase font-bold tracking-widest mt-2" style={{ color: textMuted }}>{item.label}</p>
                          </div>
                        );
                      })}
                    </div>

                    {/* Rebalancing */}
                    <div className="rounded-xl border p-5" style={{ background: cardBg, borderColor: rebalancingAdvice.length > 0 ? "rgba(245,158,11,0.3)" : "rgba(16,185,129,0.3)" }}>
                      <h4 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: textPrimary }}>
                        {rebalancingAdvice.length > 0
                          ? <><ArrowUpDown size={15} className="text-amber-500 animate-pulse" /> Rebalancing Required</>
                          : <><CheckCircle size={15} className="text-emerald-500" /> Portfolio Balanced</>}
                      </h4>
                      {rebalancingAdvice.length === 0 ? (
                        <p className="text-xs font-medium" style={{ color: textMuted }}>Your allocations closely follow target rules. No actions needed.</p>
                      ) : (
                        <div className="space-y-2">
                          {rebalancingAdvice.map((item, i) => (
                            <div key={i} className="flex items-start gap-3 p-3 rounded-xl border text-xs" style={{ borderColor: cardBorder, background: darkMode ? "rgba(51,65,85,0.2)" : "#f8fafc" }}>
                              <span className="px-2 py-0.5 rounded-lg font-black uppercase text-[9px] tracking-wider shrink-0"
                                style={{ background: item.action === "SELL" ? "#fee2e2" : "#d1fae5", color: item.action === "SELL" ? "#ef4444" : "#10b981" }}>
                                {item.action}
                              </span>
                              <div>
                                <strong style={{ color: textPrimary }}>{item.category}</strong>
                                <p style={{ color: textMuted }}>{item.text}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Top/Worst Performers */}
                    {holdings.length > 0 && (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="rounded-xl border p-4" style={{ background: cardBg, borderColor: cardBorder }}>
                          <h4 className="text-xs font-bold mb-3 flex items-center gap-1.5" style={{ color: textPrimary }}>
                            <Star size={12} className="text-amber-400" /> Top Performers
                          </h4>
                          {topPerformers.map((h, i) => (
                            <div key={i} className="flex justify-between items-center py-1.5">
                              <span className="text-xs font-semibold truncate max-w-[100px]" style={{ color: textPrimary }}>{h.assetName}</span>
                              <span className="text-xs font-black text-emerald-500">{h.growthRate}%</span>
                            </div>
                          ))}
                        </div>
                        <div className="rounded-xl border p-4" style={{ background: cardBg, borderColor: cardBorder }}>
                          <h4 className="text-xs font-bold mb-3 flex items-center gap-1.5" style={{ color: textPrimary }}>
                            <AlertCircle size={12} className="text-rose-400" /> Needs Attention
                          </h4>
                          {worstPerformers.map((h, i) => (
                            <div key={i} className="flex justify-between items-center py-1.5">
                              <span className="text-xs font-semibold truncate max-w-[100px]" style={{ color: textPrimary }}>{h.assetName}</span>
                              <span className="text-xs font-black text-rose-500">{h.growthRate}%</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ── HOLDINGS TAB ── */}
            {activeTab === "holdings" && (
              <div className="space-y-4 animate-fade-in">
                {/* Filters bar */}
                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative max-w-[220px]">
                    <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                    <input type="text" placeholder="Search assets..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                      className={`${inputCls} pl-9`} />
                  </div>
                  <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
                    className={`${inputCls} w-auto`}>
                    {uniqueCategories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <select value={sortBy} onChange={e => setSortBy(e.target.value)} className={`${inputCls} w-auto`}>
                    <option value="amount">Sort: Value</option>
                    <option value="growthRate">Sort: Return</option>
                    <option value="name">Sort: Name</option>
                  </select>
                  <button onClick={() => setSortDir(d => d === "desc" ? "asc" : "desc")}
                    className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl border text-xs font-bold cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-800"
                    style={{ background: cardBg, borderColor: cardBorder, color: textPrimary }}>
                    <ArrowUpDown size={13} /> {sortDir === "desc" ? "Desc" : "Asc"}
                  </button>
                </div>

                {/* Table */}
                <div className="rounded-2xl border overflow-hidden" style={{ background: cardBg, borderColor: cardBorder }}>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="text-[10px] font-extrabold uppercase tracking-widest"
                          style={{ background: darkMode ? "rgba(51,65,85,0.5)" : "#f4f4f5", color: textMuted }}>
                          <th className="py-4 px-5">Asset</th>
                          <th className="py-4 px-5">Category</th>
                          <th className="py-4 px-5 text-right">Allocation</th>
                          <th className="py-4 px-5 text-right">Current Value</th>
                          <th className="py-4 px-5 text-right">P&L</th>
                          <th className="py-4 px-5 text-right">Return</th>
                          <th className="py-4 px-5 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y" style={{ borderColor: cardBorder }}>
                        {filteredHoldings.length === 0 ? (
                          <tr>
                            <td colSpan="7" className="py-10 text-center text-sm font-semibold" style={{ color: textMuted }}>
                              {holdings.length === 0 ? "No assets yet. Add your first investment above." : "No assets match your filters."}
                            </td>
                          </tr>
                        ) : (
                          filteredHoldings.map(h => {
                            const pct = totalPortfolioValue > 0 ? Math.round((h.amount / totalPortfolioValue) * 100) : 0;
                            const invested = h.investedAmount || h.amount * 0.8;
                            const pl = h.amount - invested;
                            const plPct = invested > 0 ? ((pl / invested) * 100) : 0;
                            return (
                              <tr key={h.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                <td className="py-4 px-5">
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-[9px] font-black shrink-0"
                                      style={{ background: getAssetColor(h.category) }}>
                                      {h.assetName?.slice(0, 2).toUpperCase()}
                                    </div>
                                    <div>
                                      <p className="text-sm font-bold" style={{ color: textPrimary }}>{h.assetName}</p>
                                      {h.notes && <p className="text-[10px]" style={{ color: textMuted }}>{h.notes}</p>}
                                    </div>
                                  </div>
                                </td>
                                <td className="py-4 px-5">
                                  <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full"
                                    style={{ background: getAssetColor(h.category) + "20", color: getAssetColor(h.category) }}>
                                    {h.category}
                                  </span>
                                </td>
                                <td className="py-4 px-5 text-right">
                                  <div>
                                    <span className="text-sm font-bold" style={{ color: textPrimary }}>{pct}%</span>
                                    <div className="h-1 rounded-full mt-1 w-16 ml-auto" style={{ background: darkMode ? "#334155" : "#e4e4e7" }}>
                                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: getAssetColor(h.category) }} />
                                    </div>
                                  </div>
                                </td>
                                <td className="py-4 px-5 text-right">
                                  <span className="text-sm font-black" style={{ color: textPrimary }}>{formatCurrency(h.amount, currency)}</span>
                                </td>
                                <td className="py-4 px-5 text-right">
                                  <div>
                                    <span className="text-sm font-bold" style={{ color: pl >= 0 ? "#10b981" : "#ef4444" }}>
                                      {pl >= 0 ? "+" : ""}{formatCurrency(pl, currency)}
                                    </span>
                                    <p className="text-[10px]" style={{ color: pl >= 0 ? "#10b981" : "#ef4444" }}>
                                      {pl >= 0 ? "+" : ""}{plPct.toFixed(1)}%
                                    </p>
                                  </div>
                                </td>
                                <td className="py-4 px-5 text-right">
                                  <span className="text-sm font-black" style={{ color: C.secondary }}>{h.growthRate}%</span>
                                </td>
                                <td className="py-4 px-5 text-center">
                                  <button onClick={() => handleDeleteHolding(h.id)}
                                    className="p-2 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-400 rounded-lg transition-all cursor-pointer inline-flex">
                                    <Trash size={14} />
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ── ANALYTICS TAB ── */}
            {activeTab === "analytics" && (
              <div className="space-y-6 animate-fade-in">
                {/* Simulated performance chart */}
                <div className="rounded-2xl border p-6" style={{ background: cardBg, borderColor: cardBorder }}>
                  <h3 className="text-base font-bold mb-5" style={{ color: textPrimary }}>Estimated Monthly Portfolio Value</h3>
                  <div className="h-60">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={performanceChart} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid stroke={darkMode ? "#1e293b" : "#f1f5f9"} vertical={false} />
                        <XAxis dataKey="month" tick={{ fontSize: 11, fill: textMuted }} tickLine={false} />
                        <YAxis tick={{ fontSize: 10, fill: textMuted }} tickLine={false} />
                        <Tooltip formatter={(v) => [formatCurrency(v, currency), "Portfolio Value"]}
                          contentStyle={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: "12px", fontSize: "12px", color: textPrimary }} />
                        <Line type="monotone" dataKey="value" stroke={C.secondary} strokeWidth={2.5} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Category bars */}
                {categoryBreakdown.length > 0 && (
                  <div className="rounded-2xl border p-6" style={{ background: cardBg, borderColor: cardBorder }}>
                    <h3 className="text-base font-bold mb-5" style={{ color: textPrimary }}>Category Breakdown</h3>
                    <div className="space-y-4">
                      {categoryBreakdown.map(cat => (
                        <div key={cat.name}>
                          <div className="flex justify-between text-xs font-bold mb-1.5">
                            <span style={{ color: textPrimary }}>{cat.name}</span>
                            <div className="flex items-center gap-3">
                              <span style={{ color: textMuted }}>{formatCurrency(cat.value, currency)}</span>
                              <span style={{ color: cat.color }}>{cat.pct}%</span>
                            </div>
                          </div>
                          <div className="h-2 rounded-full" style={{ background: darkMode ? "#1e293b" : "#f1f5f9" }}>
                            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${cat.pct}%`, background: cat.color }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* P&L Summary */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { label: "Total Invested", val: totalInvested, color: textPrimary },
                    { label: "Current Value", val: totalPortfolioValue, color: C.secondary },
                    { label: "Total P&L", val: totalPL, color: totalPL >= 0 ? "#10b981" : "#ef4444" },
                  ].map(item => (
                    <div key={item.label} className="rounded-xl border p-5 text-center" style={{ background: cardBg, borderColor: cardBorder }}>
                      <p className="text-[10px] uppercase font-bold tracking-widest mb-2" style={{ color: textMuted }}>{item.label}</p>
                      <p className="text-2xl font-black" style={{ color: item.color }}>{formatCurrency(item.val, currency)}</p>
                      {item.label === "Total P&L" && (
                        <p className="text-xs font-bold mt-1" style={{ color: item.color }}>
                          {totalReturnPct >= 0 ? "+" : ""}{totalReturnPct.toFixed(1)}% overall
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </>
  );
}
