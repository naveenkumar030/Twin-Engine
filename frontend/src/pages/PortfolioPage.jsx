import React, { useState, useEffect } from "react";
import { Landmark, Plus, Trash, HelpCircle, AlertTriangle, ArrowUpDown, ChevronDown, CheckCircle, Wallet, ArrowUpRight, Percent, Layers, Upload, FileText } from "lucide-react";
import { C } from "../constants/theme";
import { fetchHoldings, saveHolding, deleteHolding, fetchUserSettings, uploadHoldingsCSV, clearHoldings } from "../services/api";
import Header from "../components/Header";

export default function PortfolioPage({ userId, currency = "₹", onMenuToggle, healthScore }) {
  const [holdings, setHoldings] = useState([]);
  const [targetAlloc, setTargetAlloc] = useState({
    equityAllocation: 65,
    debtAllocation: 25,
    goldAllocation: 5,
    realEstateAllocation: 5,
  });
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState({ type: "", message: "" });
  const [uploadTab, setUploadTab] = useState("manual"); // 'manual' or 'csv'

  // Form States
  const [showAddForm, setShowAddForm] = useState(false);
  const [assetName, setAssetName] = useState("");
  const [category, setCategory] = useState("Equity");
  const [amount, setAmount] = useState("");
  const [growthRate, setGrowthRate] = useState("");
  const [formError, setFormError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const loadData = () => {
    setLoading(true);
    Promise.all([fetchHoldings(userId), fetchUserSettings(userId)])
      .then(([holdingsData, settingsData]) => {
        setHoldings(holdingsData);
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

  useEffect(() => {
    if (userId) {
      loadData();
    }
  }, [userId]);

  const totalPortfolioValue = holdings.reduce((sum, h) => sum + h.amount, 0);

  // Actual Allocations Calculation
  const actualAlloc = { Equity: 0, Debt: 0, Gold: 0, "Real Estate": 0 };
  holdings.forEach((h) => {
    if (actualAlloc[h.category] !== undefined) {
      actualAlloc[h.category] += h.amount;
    }
  });

  const actualAllocPct = { Equity: 0, Debt: 0, Gold: 0, "Real Estate": 0 };
  if (totalPortfolioValue > 0) {
    Object.keys(actualAlloc).forEach((k) => {
      actualAllocPct[k] = Math.round((actualAlloc[k] / totalPortfolioValue) * 100);
    });
  }

  // Target allocations helper map
  const targetMap = {
    Equity: targetAlloc.equityAllocation,
    Debt: targetAlloc.debtAllocation,
    Gold: targetAlloc.goldAllocation,
    "Real Estate": targetAlloc.realEstateAllocation,
  };

  // Expected Weighted Return Rate
  const weightedReturnRate =
    totalPortfolioValue > 0
      ? holdings.reduce((sum, h) => sum + (h.amount / totalPortfolioValue) * h.growthRate, 0)
      : 0;

  const handleAddHolding = async (e) => {
    e.preventDefault();
    setFormError("");

    if (!assetName.trim() || !amount || !growthRate) {
      setFormError("All fields are required.");
      return;
    }

    if (Number(amount) <= 0 || Number(growthRate) <= 0) {
      setFormError("Amount and Return Rate must be positive numbers.");
      return;
    }

    setActionLoading(true);
    try {
      const newHolding = {
        assetName: assetName.trim(),
        category,
        amount: Number(amount),
        growthRate: Number(growthRate),
      };
      await saveHolding(userId, newHolding);
      setAssetName("");
      setAmount("");
      setGrowthRate("");
      setShowAddForm(false);
      loadData();
      window.dispatchEvent(new Event("fintwin_portfolio_changed"));
    } catch (err) {
      setFormError("Failed to add holding.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteHolding = async (holdingId) => {
    if (confirm("Are you sure you want to delete this investment asset?")) {
      try {
        await deleteHolding(userId, holdingId);
        loadData();
        window.dispatchEvent(new Event("fintwin_portfolio_changed"));
      } catch (err) {
        alert("Failed to delete asset.");
      }
    }
  };

  const handleFileUpload = (file) => {
    if (!file.name.endsWith(".csv")) {
      setStatus({ type: "error", message: "Please upload a valid .csv file." });
      return;
    }
    setUploading(true);
    setStatus({ type: "info", message: "Processing CSV..." });
    uploadHoldingsCSV(userId, file)
      .then((data) => {
        setStatus({ type: "success", message: `Successfully imported ${data.length} holdings!` });
        loadData();
        window.dispatchEvent(new Event("fintwin_portfolio_changed"));
      })
      .catch((err) => {
        setStatus({ type: "error", message: err.message || "Failed to process CSV file." });
      })
      .finally(() => setUploading(false));
  };

  const handleClearHoldings = () => {
    if (window.confirm("Are you sure you want to delete all portfolio holdings?")) {
      clearHoldings(userId).then(() => {
        setStatus({ type: "success", message: "All holdings cleared." });
        setHoldings([]);
        window.dispatchEvent(new Event("fintwin_portfolio_changed"));
      });
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
    }
  };

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

  // Generate automated rebalancing steps
  const generateRebalancingAdvice = () => {
    const advice = [];
    let needsRebalance = false;

    Object.keys(targetMap).forEach((category) => {
      const actualPct = actualAllocPct[category];
      const targetPct = targetMap[category];
      const diffPct = actualPct - targetPct;

      if (Math.abs(diffPct) > 2) {
        needsRebalance = true;
        const targetAmt = (targetPct / 100) * totalPortfolioValue;
        const currentAmt = actualAlloc[category];
        const diffAmt = currentAmt - targetAmt;

        if (diffAmt > 0) {
          advice.push({
            category,
            action: "SELL",
            amount: diffAmt,
            pctDiff: diffPct,
            text: `Over-allocated by ${diffPct}% (${formatCurrency(diffAmt)} above target). Sell excess holdings.`,
          });
        } else {
          advice.push({
            category,
            action: "BUY",
            amount: Math.abs(diffAmt),
            pctDiff: Math.abs(diffPct),
            text: `Under-allocated by ${Math.abs(diffPct)}% (${formatCurrency(Math.abs(diffAmt))} below target). Purchase more holdings.`,
          });
        }
      }
    });

    return { needsRebalance, advice };
  };

  const rebalancingResult = generateRebalancingAdvice();

  return (
    <>
      <Header title="Asset Portfolio" onMenuToggle={onMenuToggle} healthScore={healthScore} />
      <main className="flex-1 p-4 md:p-10 max-w-[1440px] mx-auto w-full overflow-y-auto animate-fade-in space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-2" style={{ color: C.onBackground }}>
              Asset Portfolio
            </h2>
            <p className="max-w-2xl text-lg text-slate-500">
              Manage your actual investments, visualize asset allocations, and rebalance your portfolios dynamically.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {holdings.length > 0 && (
              <button
                onClick={handleClearHoldings}
                className="flex items-center gap-2 px-5 py-3.5 rounded-2xl border font-bold text-sm transition-all bg-white hover:bg-red-50 text-red-600 border-red-200 cursor-pointer active:scale-95 shadow-sm"
              >
                <Trash size={16} />
                Clear All Assets
              </button>
            )}
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center gap-2 px-5 py-3.5 rounded-2xl shadow-lg hover:shadow-indigo-500/20 font-bold text-sm transition-all active:scale-95 text-white cursor-pointer"
              style={{ background: `linear-gradient(135deg, ${C.secondary}, ${C.secondaryContainer})` }}
            >
              <Plus size={18} />
              {showAddForm ? "Close Form" : "Add Asset Holding"}
            </button>
          </div>
        </div>

        {/* Status Alerts */}
        {status.message && (
          <div
            className="p-4 rounded-2xl border shadow-sm flex items-start gap-3 transition-all animate-toast-slide"
            style={{
              background:
                status.type === "error"
                  ? C.errorContainer
                  : status.type === "success"
                  ? "rgba(16,185,129,0.1)"
                  : C.surfaceContainerLow,
              borderColor:
                status.type === "error"
                  ? C.error
                  : status.type === "success"
                  ? "rgba(16,185,129,0.4)"
                  : C.outlineVariant,
              color: status.type === "error" ? C.error : status.type === "success" ? "#10b981" : C.primary,
            }}
          >
            <AlertTriangle size={20} className="shrink-0 mt-0.5" />
            <div className="flex-1 text-sm font-semibold">{status.message}</div>
            <button
              onClick={() => setStatus({ type: "", message: "" })}
              className="text-xs font-bold hover:underline ml-4 cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {loading ? (
          <div className="h-64 flex items-center justify-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2" style={{ borderColor: C.secondary }}></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left side column: Holdings and Forms */}
            <div className="lg:col-span-8 space-y-6">
              {/* Form to Add Holding */}
              {showAddForm && (
                <div
                  className="rounded-3xl border shadow-xl p-6 relative overflow-hidden animate-slide-up bg-white"
                  style={{ borderColor: "rgba(228, 228, 231, 0.8)" }}
                >
                  <h3 className="text-lg font-bold mb-4 text-slate-800">
                    Add Portfolio Assets
                  </h3>

                  {/* Mode Toggles */}
                  <div className="flex border-b border-slate-100 mb-6 gap-6">
                    <button
                      type="button"
                      onClick={() => setUploadTab("manual")}
                      className="pb-2.5 text-xs font-bold transition-all relative cursor-pointer outline-none"
                      style={{ color: uploadTab === "manual" ? C.secondary : "#71717a" }}
                    >
                      Manual Asset Entry
                      {uploadTab === "manual" && (
                        <div className="absolute bottom-0 left-0 right-0 h-[2px] rounded-t-full animate-fade-in" style={{ background: C.secondary }} />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setUploadTab("csv")}
                      className="pb-2.5 text-xs font-bold transition-all relative cursor-pointer outline-none"
                      style={{ color: uploadTab === "csv" ? C.secondary : "#71717a" }}
                    >
                      Upload CSV Batch
                      {uploadTab === "csv" && (
                        <div className="absolute bottom-0 left-0 right-0 h-[2px] rounded-t-full animate-fade-in" style={{ background: C.secondary }} />
                      )}
                    </button>
                  </div>

                  {formError && uploadTab === "manual" && (
                    <div
                      className="p-3.5 rounded-2xl border text-xs font-semibold mb-4"
                      style={{ background: C.errorContainer, color: C.error, borderColor: "rgba(239, 68, 68, 0.2)" }}
                    >
                      {formError}
                    </div>
                  )}

                  {uploadTab === "manual" ? (
                    <form onSubmit={handleAddHolding} className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-2">
                          Asset Name
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Nifty Index Fund, Corporate Bonds..."
                          value={assetName}
                          onChange={(e) => setAssetName(e.target.value)}
                          className="w-full px-4 py-3.5 rounded-2xl border outline-none text-sm font-semibold transition-all focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 border-slate-200"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-2">
                          Asset Class / Category
                        </label>
                        <select
                          value={category}
                          onChange={(e) => setCategory(e.target.value)}
                          className="w-full px-4 py-3.5 rounded-2xl border outline-none text-sm font-semibold transition-all bg-white border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 cursor-pointer"
                        >
                          <option value="Equity">Equity</option>
                          <option value="Debt">Debt</option>
                          <option value="Gold">Gold</option>
                          <option value="Real Estate">Real Estate</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-2">
                          Investment Amount
                        </label>
                        <div className="relative group">
                          <span className="absolute left-3.5 top-3.5 text-sm font-bold text-slate-400">
                            {currency}
                          </span>
                          <input
                            type="number"
                            required
                            placeholder="Current valuation"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="w-full pl-8 pr-4 py-3.5 rounded-2xl border outline-none text-sm font-semibold transition-all focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 border-slate-200"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-2">
                          Expected Return Rate (% p.a.)
                        </label>
                        <input
                          type="number"
                          required
                          step="0.1"
                          placeholder="Expected annual growth"
                          value={growthRate}
                          onChange={(e) => setGrowthRate(e.target.value)}
                          className="w-full px-4 py-3.5 rounded-2xl border outline-none text-sm font-semibold transition-all focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 border-slate-200"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={actionLoading}
                        className="md:col-span-2 w-full py-4 rounded-2xl text-sm font-bold shadow-lg hover:shadow-indigo-500/20 transition-all active:scale-[0.98] text-white flex items-center justify-center gap-2 cursor-pointer mt-2 disabled:opacity-70 disabled:cursor-not-allowed"
                        style={{ background: `linear-gradient(135deg, ${C.secondary}, ${C.secondaryContainer})` }}
                      >
                        <Plus size={16} />
                        {actionLoading ? "Saving holding..." : "Add Asset to Portfolio"}
                      </button>
                    </form>
                  ) : (
                    <div className="space-y-4 animate-slide-up">
                      <div
                        className="border-2 border-dashed rounded-2xl p-8 text-center flex flex-col items-center justify-center cursor-pointer transition-all hover:bg-slate-50/50 border-slate-200"
                        onClick={() => document.getElementById("holdings-csv-input").click()}
                      >
                        <input
                          id="holdings-csv-input"
                          type="file"
                          accept=".csv"
                          className="hidden"
                          onChange={handleFileChange}
                          disabled={uploading}
                        />
                        <FileText size={40} className="text-slate-400 mb-3" />
                        <p className="font-bold text-sm mb-1 text-slate-800">
                          Click or Drag & Drop Holdings CSV
                        </p>
                        <p className="text-[10px] text-slate-400 mb-4">Support .csv files only</p>
                        <span
                          className="px-4 py-2 rounded-xl text-xs font-bold text-white shadow-sm transition-all cursor-pointer"
                          style={{ background: C.secondary }}
                        >
                          Select File
                        </span>
                      </div>

                      {/* CSV Formatting Helper */}
                      <div className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50 text-[10px] font-semibold text-slate-400 space-y-1">
                        <h4 className="font-bold text-slate-700 text-xs mb-1">Expected Asset CSV Format</h4>
                        <p>Provide headers in the first row. The scanned column names are:</p>
                        <code className="block bg-slate-800 text-slate-200 p-2 rounded select-all font-mono leading-none">
                          AssetName,Category,Amount,GrowthRate
                        </code>
                        <p className="mt-1">Example: <code className="text-slate-600">HDFC Nifty 50 ETF,Equity,6500000,12.0</code></p>
                      </div>
                    </div>
                  )}
                </div>
              )}


              {/* Portfolio Summary Card */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                {[
                  { label: "Portfolio Value", value: formatCurrency(totalPortfolioValue), color: C.primary, icon: Wallet, bg: "rgba(99, 102, 241, 0.08)" },
                  { label: "Weighted Returns", value: `${weightedReturnRate.toFixed(2)}%`, color: "#10b981", icon: ArrowUpRight, bg: "rgba(16, 185, 129, 0.08)" },
                  { label: "Total Asset Types", value: holdings.length, color: C.secondary, icon: Layers, bg: "rgba(99, 102, 241, 0.08)" },
                ].map((stat, idx) => {
                  const Icon = stat.icon;
                  return (
                    <div
                      key={idx}
                      className="p-6 rounded-3xl border shadow-lg shadow-slate-100 flex items-center justify-between hover:shadow-xl transition-all duration-300 bg-white"
                      style={{ borderColor: "rgba(228, 228, 231, 0.8)" }}
                    >
                      <div>
                        <p className="text-[10px] uppercase font-bold tracking-widest text-slate-400 mb-1">
                          {stat.label}
                        </p>
                        <p className="text-2xl font-black tracking-tight" style={{ color: stat.color }}>
                          {stat.value}
                        </p>
                      </div>
                      <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: stat.bg, color: stat.color }}>
                        <Icon size={20} />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Holdings Table */}
              <div
                className="rounded-3xl border shadow-lg shadow-slate-100 overflow-hidden bg-white"
                style={{ borderColor: "rgba(228, 228, 231, 0.8)" }}
              >
                <div className="px-6 py-5 border-b flex justify-between items-center" style={{ borderColor: "rgba(228, 228, 231, 0.6)" }}>
                  <h3 className="font-bold text-lg text-slate-800">
                    Active Investment Assets
                  </h3>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="text-[10px] font-extrabold uppercase tracking-widest" style={{ background: "#f4f4f5", color: "#71717a" }}>
                        <th className="py-4 px-6">Asset Name</th>
                        <th className="py-4 px-6">Class</th>
                        <th className="py-4 px-6 text-right">Holding Pct</th>
                        <th className="py-4 px-6 text-right">Current Valuation</th>
                        <th className="py-4 px-6 text-right">Return Rate</th>
                        <th className="py-4 px-6 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y text-xs" style={{ borderColor: "rgba(228, 228, 231, 0.6)" }}>
                      {holdings.length === 0 ? (
                        <tr>
                          <td colSpan="6" className="py-8 text-center text-slate-400 font-semibold">
                            No holdings in portfolio yet. Click "Add Asset Holding" to insert.
                          </td>
                        </tr>
                      ) : (
                        holdings.map((h) => {
                          const holdingPct = totalPortfolioValue > 0 ? Math.round((h.amount / totalPortfolioValue) * 100) : 0;
                          return (
                            <tr key={h.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="py-4 px-6 font-bold text-slate-800 text-sm">
                                {h.assetName}
                              </td>
                              <td className="py-4 px-6">
                                <span
                                  className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full"
                                  style={{
                                    background:
                                      h.category === "Equity"
                                        ? "rgba(99,102,241,0.1)"
                                        : h.category === "Debt"
                                        ? "rgba(16,185,129,0.1)"
                                        : h.category === "Gold"
                                        ? "rgba(245,158,11,0.1)"
                                        : "rgba(99,102,241,0.1)",
                                    color:
                                      h.category === "Equity"
                                        ? C.secondary
                                        : h.category === "Debt"
                                        ? "#10b981"
                                        : h.category === "Gold"
                                        ? C.gold
                                        : C.surfaceTint,
                                  }}
                                >
                                  {h.category}
                                </span>
                              </td>
                              <td className="py-4 px-6 text-right font-bold text-slate-600 text-sm">
                                {holdingPct}%
                              </td>
                              <td className="py-4 px-6 text-right font-black text-slate-800 text-sm">
                                {formatCurrency(h.amount)}
                              </td>
                              <td className="py-4 px-6 text-right font-bold text-indigo-600 text-sm">
                                {h.growthRate}%
                              </td>
                              <td className="py-4 px-6 text-center">
                                <button
                                  onClick={() => handleDeleteHolding(h.id)}
                                  className="p-2 hover:bg-rose-50 text-rose-500 rounded-xl transition-all cursor-pointer inline-flex items-center justify-center active:scale-95"
                                >
                                  <Trash size={15} />
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

            {/* Right side column: Allocations & Rebalancing suggestions */}
            <div className="lg:col-span-4 space-y-6">
              {/* Actual vs Target Progress Bars */}
              <div
                className="rounded-3xl border shadow-lg shadow-slate-100 p-6 bg-white"
                style={{ borderColor: "rgba(228, 228, 231, 0.8)" }}
              >
                <h3 className="text-lg font-bold text-slate-800 mb-2">
                  Actual vs. Target Weights
                </h3>
                <p className="text-xs text-slate-400 mb-6">
                  Compares actual portfolio allocations against target settings.
                </p>

                <div className="space-y-6">
                  {[
                    { key: "Equity", color: C.secondary },
                    { key: "Debt", color: "#10b981" },
                    { key: "Gold", color: C.gold },
                    { key: "Real Estate", color: "#3b82f6" },
                  ].map((item) => {
                    const actualPct = actualAllocPct[item.key] || 0;
                    const targetPct = targetMap[item.key] || 0;

                    return (
                      <div key={item.key} className="space-y-1.5">
                        <div className="flex justify-between items-center text-xs font-bold">
                          <span className="text-slate-700">{item.key}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-slate-400 font-semibold">
                              Act: {actualPct}%
                            </span>
                            <span className="text-indigo-600">
                              Tgt: {targetPct}%
                            </span>
                          </div>
                        </div>

                        {/* Bar */}
                        <div className="relative h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                          {/* Actual progress */}
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${actualPct}%`, background: item.color }}
                          />
                        </div>

                        {/* Visual deviation check */}
                        {Math.abs(actualPct - targetPct) > 2 ? (
                          <div className="text-[10px] text-right font-bold mt-1">
                            {actualPct > targetPct ? (
                              <span className="text-rose-500">+{actualPct - targetPct}% Over target</span>
                            ) : (
                              <span className="text-amber-500">-{targetPct - actualPct}% Under target</span>
                            )}
                          </div>
                        ) : (
                          <div className="text-[10px] text-right font-bold mt-1 text-emerald-500 flex items-center justify-end gap-1">
                            <CheckCircle size={10} /> Aligned
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Automated Rebalancing Recommendations */}
              <div
                className="rounded-3xl border shadow-lg shadow-slate-100 p-6 relative overflow-hidden bg-white"
                style={{
                  borderColor: rebalancingResult.needsRebalance ? "rgba(245,158,11,0.2)" : "rgba(16,185,129,0.2)",
                }}
              >
                <div
                  className="absolute top-0 right-0 w-24 h-24 rounded-full filter blur-xl opacity-10 pointer-events-none"
                  style={{ background: rebalancingResult.needsRebalance ? C.gold : "#10b981" }}
                />

                <h3 className="text-lg font-bold mb-3 flex items-center gap-2 text-slate-800">
                  {rebalancingResult.needsRebalance ? (
                    <>
                      <ArrowUpDown size={18} className="text-amber-500 animate-pulse" />
                      Rebalancing Required
                    </>
                  ) : (
                    <>
                      <CheckCircle size={18} className="text-emerald-500" />
                      Portfolio Balanced
                    </>
                  )}
                </h3>

                <p className="text-xs leading-relaxed text-slate-400 mb-4 font-medium">
                  {rebalancingResult.needsRebalance
                    ? "Your investments have drifted from the core asset allocation target rules. Perform the following buy/sell recommendations to realign your risk index profile."
                    : "Excellent! Your portfolio actual allocations closely follow the target model rules. No actions required."}
                </p>

                {rebalancingResult.needsRebalance && (
                  <div className="space-y-3">
                    {rebalancingResult.advice.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 border rounded-2xl flex gap-3 items-start text-xs bg-white shadow-sm hover:shadow-md transition-shadow"
                        style={{ borderColor: "rgba(228, 228, 231, 0.8)" }}
                      >
                        <span
                          className="px-2 py-0.5 rounded-lg font-black uppercase text-[9px] tracking-wider"
                          style={{
                            background: item.action === "SELL" ? C.errorContainer : "rgba(16,185,129,0.1)",
                            color: item.action === "SELL" ? C.error : "#10b981",
                          }}
                        >
                          {item.action}
                        </span>
                        <div className="flex-1">
                          <strong className="text-slate-700 block">{item.category}</strong>
                          <p className="text-slate-400 mt-0.5 leading-normal font-semibold">{item.text}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
