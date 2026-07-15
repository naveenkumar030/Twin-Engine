import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Upload, Trash2, ArrowUpRight, ArrowDownRight, Coins, Search,
  Calendar, AlertCircle, PiggyBank, CheckCircle, FileText, Download,
  TrendingUp, TrendingDown, Flame, BarChart2, Filter, RefreshCw,
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { C } from "../constants/theme";
import { fetchTransactions, clearTransactions, uploadTransactionsCSV } from "../services/api";
import Header from "../components/Header";

// ── Helpers ──
function fmt(val, currency = "₹") {
  if (Math.abs(val) >= 10000000) return `${currency}${(val / 10000000).toFixed(2)}Cr`;
  if (Math.abs(val) >= 100000) return `${currency}${(val / 100000).toFixed(1)}L`;
  if (Math.abs(val) >= 1000) return `${currency}${(val / 1000).toFixed(1)}K`;
  return `${currency}${Math.round(val).toLocaleString()}`;
}

const DATE_RANGES = [
  { label: "1M", months: 1 },
  { label: "3M", months: 3 },
  { label: "6M", months: 6 },
  { label: "12M", months: 12 },
  { label: "All", months: 0 },
];

const CAT_COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#3b82f6", "#f97316", "#14b8a6"];

export default function CashFlowPage({ userId, currency = "₹", onMenuToggle, healthScore, darkMode }) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState({ type: "", message: "" });
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [dragActive, setDragActive] = useState(false);
  const [dateRange, setDateRange] = useState("All");
  const [activeChart, setActiveChart] = useState("area"); // area | bar
  const [activeView, setActiveView] = useState("overview"); // overview | transactions

  const loadData = useCallback(() => {
    setLoading(true);
    fetchTransactions(userId)
      .then(data => setTransactions(data || []))
      .catch(() => setStatus({ type: "error", message: "Failed to fetch transactions." }))
      .finally(() => setLoading(false));
  }, [userId]);

  useEffect(() => { if (userId) loadData(); }, [userId]);

  // ── Date Range Filtering ──
  const rangeFilteredTx = useMemo(() => {
    const range = DATE_RANGES.find(r => r.label === dateRange);
    if (!range || range.months === 0) return transactions;
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - range.months);
    return transactions.filter(t => {
      try { return new Date(t.date) >= cutoff; } catch { return true; }
    });
  }, [transactions, dateRange]);

  // ── Drag & Drop ──
  const handleDrag = e => {
    e.preventDefault(); e.stopPropagation();
    setDragActive(e.type === "dragenter" || e.type === "dragover");
  };
  const handleDrop = e => {
    e.preventDefault(); e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) handleFileUpload(e.dataTransfer.files[0]);
  };
  const handleFileChange = e => { if (e.target.files?.[0]) handleFileUpload(e.target.files[0]); };
  const handleFileUpload = file => {
    if (!file.name.endsWith(".csv")) { setStatus({ type: "error", message: "Please upload a valid .csv file." }); return; }
    setUploading(true);
    setStatus({ type: "info", message: "Uploading and processing CSV..." });
    uploadTransactionsCSV(userId, file)
      .then(data => { setStatus({ type: "success", message: `Imported ${data.length} transactions!` }); loadData(); })
      .catch(err => setStatus({ type: "error", message: err.message || "Failed to process CSV." }))
      .finally(() => setUploading(false));
  };
  const handleClearHistory = () => {
    if (window.confirm("Clear all transaction history?")) {
      clearTransactions(userId).then(() => {
        setStatus({ type: "success", message: "Transaction history cleared." });
        setTransactions([]);
      });
    }
  };

  // ── Computed Metrics ──
  const totalIncome  = useMemo(() => rangeFilteredTx.filter(t => t.type === "INCOME").reduce((s, t) => s + t.amount, 0), [rangeFilteredTx]);
  const totalExpense = useMemo(() => rangeFilteredTx.filter(t => t.type === "EXPENSE").reduce((s, t) => s + t.amount, 0), [rangeFilteredTx]);
  const netSavings   = totalIncome - totalExpense;
  const savingsRate  = totalIncome > 0 ? (netSavings / totalIncome) * 100 : 0;

  const monthsSet = useMemo(() => new Set(rangeFilteredTx.map(t => { try { return new Date(t.date).toISOString().slice(0, 7); } catch { return ""; } })).size || 1, [rangeFilteredTx]);
  const burnRate = useMemo(() => totalExpense / monthsSet, [totalExpense, monthsSet]);

  // Monthly chart data
  const chartData = useMemo(() => {
    const map = {};
    rangeFilteredTx.forEach(t => {
      let key = "Unknown"; let sortKey = 0;
      try {
        const d = new Date(t.date);
        if (!isNaN(d)) { key = d.toLocaleString("default", { month: "short", year: "2-digit" }); sortKey = new Date(d.getFullYear(), d.getMonth(), 1).getTime(); }
      } catch {}
      if (!map[key]) map[key] = { month: key, Income: 0, Expense: 0, Net: 0, sortKey };
      if (t.type === "INCOME") map[key].Income += t.amount;
      else map[key].Expense += t.amount;
    });
    return Object.values(map)
      .sort((a, b) => a.sortKey - b.sortKey)
      .map(d => ({ ...d, Net: d.Income - d.Expense }));
  }, [rangeFilteredTx]);

  // Best / worst months
  const bestMonth  = chartData.length ? chartData.reduce((best, d) => d.Net > best.Net ? d : best, chartData[0]) : null;
  const worstMonth = chartData.length ? chartData.reduce((worst, d) => d.Net < worst.Net ? d : worst, chartData[0]) : null;

  // Category breakdown
  const catData = useMemo(() => {
    const map = {};
    rangeFilteredTx.filter(t => t.type === "EXPENSE").forEach(t => { map[t.category] = (map[t.category] || 0) + t.amount; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, value]) => ({ name, value }));
  }, [rangeFilteredTx]);

  const categories = useMemo(() => ["ALL", ...new Set(transactions.map(t => t.category))], [transactions]);

  // Filtered table
  const filteredTx = useMemo(() => rangeFilteredTx.filter(t => {
    const matchSearch = t.description?.toLowerCase().includes(searchTerm.toLowerCase()) || t.category?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchType = typeFilter === "ALL" || t.type === typeFilter;
    const matchCat = categoryFilter === "ALL" || t.category === categoryFilter;
    return matchSearch && matchType && matchCat;
  }), [rangeFilteredTx, searchTerm, typeFilter, categoryFilter]);

  // CSV Export
  const exportCSV = () => {
    const rows = [["Date", "Description", "Category", "Type", "Amount"]];
    filteredTx.forEach(t => rows.push([t.date, t.description, t.category, t.type, t.amount]));
    const csv = rows.map(r => r.join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `transactions_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  // Theme
  const cardBg = darkMode ? "#1e293b" : "#ffffff";
  const cardBorder = darkMode ? "rgba(51,65,85,0.7)" : "rgba(228,228,231,0.8)";
  const textPrimary = darkMode ? "#f1f5f9" : C.onSurface;
  const textMuted = darkMode ? "#94a3b8" : "#64748b";
  const subBg = darkMode ? "rgba(51,65,85,0.25)" : "#f8fafc";
  const gridColor = darkMode ? "#1e293b" : "#f1f5f9";

  const kpis = [
    { label: "Total Income",  val: totalIncome, icon: ArrowUpRight,  iconBg: "rgba(16,185,129,0.1)", iconColor: "#10b981" },
    { label: "Total Expenses",val: totalExpense, icon: ArrowDownRight,iconBg: "rgba(239,68,68,0.1)",  iconColor: "#ef4444" },
    { label: "Net Savings",   val: netSavings,  icon: PiggyBank,     iconBg: netSavings >= 0 ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)", iconColor: netSavings >= 0 ? "#10b981" : "#ef4444" },
    { label: "Monthly Burn",  val: burnRate,    icon: Flame,         iconBg: "rgba(245,158,11,0.1)", iconColor: "#f59e0b" },
  ];

  return (
    <>
      <Header title="Cash Flow Analyzer" onMenuToggle={onMenuToggle} healthScore={healthScore} darkMode={darkMode} userId={userId} />
      <main className="flex-1 p-4 md:p-8 max-w-[1600px] mx-auto w-full overflow-y-auto space-y-6 animate-fade-in">

        {/* ── Header Banner ── */}
        <div
          className="rounded-3xl p-6 md:p-8 relative overflow-hidden text-white"
          style={{ background: "linear-gradient(135deg, #0f4c75 0%, #1b262c 100%)" }}
        >
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-sky-500/10 blur-3xl animate-blob" />
            <div className="absolute bottom-0 left-20 w-32 h-32 rounded-full bg-teal-500/10 blur-2xl animate-blob animation-delay-2000" />
          </div>
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Coins size={16} className="text-sky-300" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-sky-300">Cash Flow Analytics</span>
              </div>
              <h2 className="text-2xl md:text-3xl font-black tracking-tight mb-1">Cash Flow Analyzer</h2>
              <p className="text-sky-200 text-sm font-medium">
                Savings rate: <span className="text-white font-black">{savingsRate.toFixed(1)}%</span>
                &nbsp;·&nbsp;
                {transactions.length} transactions loaded
              </p>
            </div>
            <div className="flex gap-2 flex-wrap">
              {transactions.length > 0 && (
                <button
                  onClick={exportCSV}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 font-bold text-sm transition-all cursor-pointer active:scale-95 text-white"
                >
                  <Download size={15} /> Export CSV
                </button>
              )}
              {transactions.length > 0 && (
                <button
                  onClick={handleClearHistory}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-400/30 font-bold text-sm transition-all cursor-pointer active:scale-95 text-red-300"
                >
                  <Trash2 size={15} /> Clear
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Status Alert ── */}
        {status.message && (
          <div
            className="p-4 rounded-xl flex items-start gap-3 border"
            style={{
              background: status.type === "error" ? "rgba(239,68,68,0.08)" : status.type === "success" ? "rgba(16,185,129,0.08)" : subBg,
              borderColor: status.type === "error" ? "#ef4444" : status.type === "success" ? "#10b981" : cardBorder,
            }}
          >
            {status.type === "success" ? <CheckCircle size={18} className="text-emerald-500 shrink-0" /> : <AlertCircle size={18} className="text-red-500 shrink-0" />}
            <span className="text-sm font-medium flex-1" style={{ color: textPrimary }}>{status.message}</span>
            <button onClick={() => setStatus({ type: "", message: "" })} className="text-xs font-bold" style={{ color: textMuted }}>Dismiss</button>
          </div>
        )}

        {/* ── KPI Cards ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {kpis.map((k, i) => (
            <div key={i} className="rounded-2xl border p-5 flex items-center justify-between card-hover transition-all duration-300"
              style={{ background: cardBg, borderColor: cardBorder }}>
              <div>
                <p className="text-[10px] uppercase font-bold tracking-widest mb-1" style={{ color: textMuted }}>{k.label}</p>
                <p className="text-xl font-black" style={{ color: textPrimary }}>{fmt(k.val, currency)}</p>
              </div>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: k.iconBg, color: k.iconColor }}>
                <k.icon size={18} />
              </div>
            </div>
          ))}
        </div>

        {/* ── Date Range + Chart Type ── */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-1 p-1 rounded-xl border" style={{ background: cardBg, borderColor: cardBorder }}>
            {DATE_RANGES.map(r => (
              <button key={r.label} onClick={() => setDateRange(r.label)}
                className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer"
                style={dateRange === r.label
                  ? { background: C.secondary, color: "#fff" }
                  : { color: textMuted }}>
                {r.label}
              </button>
            ))}
          </div>
          <div className="flex gap-1 p-1 rounded-xl border ml-auto" style={{ background: cardBg, borderColor: cardBorder }}>
            {[{ key: "area", label: "Area" }, { key: "bar", label: "Bar" }].map(ct => (
              <button key={ct.key} onClick={() => setActiveChart(ct.key)}
                className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer"
                style={activeChart === ct.key ? { background: C.secondary, color: "#fff" } : { color: textMuted }}>
                {ct.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Charts Row ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Chart */}
          <div className="lg:col-span-8 rounded-2xl border p-6 card-hover transition-all duration-300"
            style={{ background: cardBg, borderColor: cardBorder }}>
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-base font-bold" style={{ color: textPrimary }}>
                  Income vs Expenses {dateRange !== "All" ? `· Last ${dateRange}` : "· All Time"}
                </h3>
                <p className="text-xs mt-0.5" style={{ color: textMuted }}>Monthly aggregation</p>
              </div>
            </div>
            <div className="h-64">
              {chartData.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center">
                  <BarChart2 size={32} className="mb-3 opacity-20" style={{ color: textMuted }} />
                  <p className="text-sm font-semibold" style={{ color: textMuted }}>Upload CSV to see charts</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  {activeChart === "area" ? (
                    <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="incGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ef4444" stopOpacity={0.15} />
                          <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke={gridColor} vertical={false} />
                      <XAxis dataKey="month" tick={{ fontSize: 11, fill: textMuted }} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: textMuted }} tickLine={false} tickFormatter={v => fmt(v, currency)} />
                      <Tooltip contentStyle={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: "12px", fontSize: "12px", color: textPrimary }}
                        formatter={(v, name) => [fmt(v, currency), name]} />
                      <Legend />
                      <Area type="monotone" dataKey="Income" stroke="#10b981" fill="url(#incGrad)" strokeWidth={2} />
                      <Area type="monotone" dataKey="Expense" stroke="#ef4444" fill="url(#expGrad)" strokeWidth={2} />
                    </AreaChart>
                  ) : (
                    <BarChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                      <CartesianGrid stroke={gridColor} vertical={false} />
                      <XAxis dataKey="month" tick={{ fontSize: 11, fill: textMuted }} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: textMuted }} tickLine={false} tickFormatter={v => fmt(v, currency)} />
                      <Tooltip contentStyle={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: "12px", fontSize: "12px", color: textPrimary }}
                        formatter={(v, name) => [fmt(v, currency), name]} />
                      <Legend />
                      <Bar dataKey="Income" fill="#10b981" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Expense" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  )}
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Category Pie */}
          <div className="lg:col-span-4 rounded-2xl border p-6 card-hover transition-all duration-300"
            style={{ background: cardBg, borderColor: cardBorder }}>
            <h3 className="text-base font-bold mb-4" style={{ color: textPrimary }}>Spending by Category</h3>
            {catData.length === 0 ? (
              <div className="h-40 flex items-center justify-center">
                <p className="text-sm font-semibold text-center" style={{ color: textMuted }}>No expense data yet</p>
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={catData} dataKey="value" nameKey="name" innerRadius={45} outerRadius={70} paddingAngle={2}>
                      {catData.map((_, i) => <Cell key={i} fill={CAT_COLORS[i % CAT_COLORS.length]} stroke="none" />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: "12px", fontSize: "11px", color: textPrimary }}
                      formatter={v => [fmt(v, currency), ""]} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-3 space-y-1.5">
                  {catData.slice(0, 4).map((cat, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ background: CAT_COLORS[i] }} />
                        <span className="text-xs font-semibold truncate max-w-[100px]" style={{ color: textPrimary }}>{cat.name}</span>
                      </div>
                      <span className="text-xs font-bold" style={{ color: textMuted }}>
                        {totalExpense > 0 ? Math.round((cat.value / totalExpense) * 100) : 0}%
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* ── Insights Row ── */}
        {(bestMonth || worstMonth) && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {bestMonth && (
              <div className="rounded-2xl border p-5" style={{ background: cardBg, borderColor: cardBorder }}>
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp size={16} className="text-emerald-500" />
                  <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-500">Best Month</span>
                </div>
                <p className="text-lg font-black" style={{ color: textPrimary }}>{bestMonth.month}</p>
                <p className="text-xs font-semibold mt-1 text-emerald-500">+{fmt(bestMonth.Net, currency)} net</p>
              </div>
            )}
            {worstMonth && (
              <div className="rounded-2xl border p-5" style={{ background: cardBg, borderColor: cardBorder }}>
                <div className="flex items-center gap-2 mb-2">
                  <TrendingDown size={16} className="text-red-500" />
                  <span className="text-[10px] uppercase font-bold tracking-widest text-red-500">Highest Expense Month</span>
                </div>
                <p className="text-lg font-black" style={{ color: textPrimary }}>{worstMonth.month}</p>
                <p className="text-xs font-semibold mt-1 text-red-500">{fmt(worstMonth.Expense, currency)} spent</p>
              </div>
            )}
            <div className="rounded-2xl border p-5" style={{ background: cardBg, borderColor: cardBorder }}>
              <div className="flex items-center gap-2 mb-2">
                <Flame size={16} className="text-amber-500" />
                <span className="text-[10px] uppercase font-bold tracking-widest text-amber-500">Monthly Burn Rate</span>
              </div>
              <p className="text-lg font-black" style={{ color: textPrimary }}>{fmt(burnRate, currency)}</p>
              <p className="text-xs font-semibold mt-1" style={{ color: textMuted }}>avg monthly expenses</p>
            </div>
          </div>
        )}

        {/* ── Upload + Table ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Upload */}
          <div className="lg:col-span-4 space-y-4">
            <div
              className={`rounded-2xl border p-6 transition-all relative overflow-hidden ${dragActive ? "border-indigo-500 scale-[1.01]" : ""}`}
              style={{ background: cardBg, borderColor: dragActive ? "#6366f1" : cardBorder }}
              onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
            >
              <h3 className="text-base font-bold mb-4 flex items-center gap-2" style={{ color: textPrimary }}>
                <Upload size={18} className="text-indigo-500" /> Upload CSV
              </h3>
              <div
                className={`border-2 border-dashed rounded-xl p-8 text-center flex flex-col items-center cursor-pointer transition-all ${dragActive ? "border-indigo-500 bg-indigo-50/10" : ""}`}
                style={{ borderColor: dragActive ? "#6366f1" : cardBorder }}
                onClick={() => document.getElementById("csv-file-input").click()}
              >
                <input id="csv-file-input" type="file" accept=".csv" className="hidden" onChange={handleFileChange} disabled={uploading} />
                <FileText size={40} className="mb-3" style={{ color: textMuted }} />
                <p className="text-sm font-semibold mb-1" style={{ color: textPrimary }}>Drag & Drop CSV here</p>
                <p className="text-xs mb-4" style={{ color: textMuted }}>or click to browse</p>
                <span className="px-4 py-2 rounded-lg text-xs font-semibold text-white" style={{ background: C.secondary }}>
                  {uploading ? "Uploading..." : "Choose File"}
                </span>
              </div>
              <div className="mt-4 p-3 rounded-xl border text-xs" style={{ background: darkMode ? "rgba(51,65,85,0.25)" : "#f8fafc", borderColor: cardBorder }}>
                <p className="font-bold mb-1 flex items-center gap-1" style={{ color: textPrimary }}>
                  <AlertCircle size={12} className="text-indigo-500" /> Expected Format
                </p>
                <code className="block bg-slate-800 text-slate-200 p-2 rounded text-[10px] select-all">
                  Date,Description,Category,Amount,Type
                </code>
              </div>
            </div>
          </div>

          {/* Transaction Table */}
          <div className="lg:col-span-8 rounded-2xl border overflow-hidden" style={{ background: cardBg, borderColor: cardBorder }}>
            <div className="px-6 py-4 border-b" style={{ borderColor: cardBorder }}>
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                <h3 className="font-bold text-base" style={{ color: textPrimary }}>
                  Transaction History ({filteredTx.length})
                </h3>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 w-4 h-4" style={{ color: textMuted }} />
                    <input
                      type="text" placeholder="Search..." value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      className="pl-9 pr-4 py-2 border rounded-xl text-xs outline-none focus:border-indigo-500 transition-colors"
                      style={{ borderColor: cardBorder, background: darkMode ? "#0f172a" : "#f8fafc", color: textPrimary, width: 160 }}
                    />
                  </div>
                  <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
                    className="px-3 py-2 border rounded-xl text-xs outline-none"
                    style={{ borderColor: cardBorder, background: darkMode ? "#0f172a" : "#f8fafc", color: textPrimary }}>
                    <option value="ALL">All Types</option>
                    <option value="INCOME">Income</option>
                    <option value="EXPENSE">Expense</option>
                  </select>
                  <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
                    className="px-3 py-2 border rounded-xl text-xs outline-none"
                    style={{ borderColor: cardBorder, background: darkMode ? "#0f172a" : "#f8fafc", color: textPrimary }}>
                    {categories.map((c, i) => <option key={i} value={c}>{c === "ALL" ? "All Categories" : c}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="h-48 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: C.secondary }} />
              </div>
            ) : filteredTx.length === 0 ? (
              <div className="p-12 text-center">
                <FileText size={36} className="mx-auto mb-3 opacity-20" style={{ color: textMuted }} />
                <p className="text-sm font-semibold" style={{ color: textMuted }}>
                  {transactions.length === 0 ? "Upload CSV to get started" : "No transactions match filters"}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto max-h-[480px] overflow-y-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0" style={{ background: cardBg }}>
                    <tr className="border-b" style={{ borderColor: cardBorder }}>
                      {["Date", "Description", "Category", "Type", "Amount"].map(h => (
                        <th key={h} className="pb-3 pt-3 px-4 text-[10px] font-bold uppercase tracking-wider" style={{ color: textMuted }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTx.map((t, i) => (
                      <tr key={t.id || i} className="border-b transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/20"
                        style={{ borderColor: darkMode ? "rgba(51,65,85,0.3)" : "rgba(228,228,231,0.4)" }}>
                        <td className="py-3 px-4 text-xs font-semibold" style={{ color: textMuted }}>
                          <span className="flex items-center gap-1.5"><Calendar size={11} />{t.date}</span>
                        </td>
                        <td className="py-3 px-4 text-xs font-bold" style={{ color: textPrimary }}>{t.description}</td>
                        <td className="py-3 px-4 text-xs">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                            style={{ background: darkMode ? "rgba(51,65,85,0.4)" : "#f1f5f9", color: textMuted }}>
                            {t.category}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-xs">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase inline-flex items-center gap-0.5 ${t.type === "INCOME" ? "bg-emerald-100/60 text-emerald-700" : "bg-rose-100/60 text-rose-700"}`}>
                            {t.type === "INCOME" ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                            {t.type}
                          </span>
                        </td>
                        <td className={`py-3 px-4 text-xs font-black text-right ${t.type === "INCOME" ? "text-emerald-600" : ""}`}
                          style={{ color: t.type !== "INCOME" ? textPrimary : undefined }}>
                          {t.type === "INCOME" ? "+" : "-"}{fmt(t.amount, currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
