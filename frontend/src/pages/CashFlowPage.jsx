import React, { useState, useEffect } from "react";
import {
  Upload,
  Trash2,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  Coins,
  Search,
  Calendar,
  AlertCircle,
  PiggyBank,
  CheckCircle,
  FileText,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { C } from "../constants/theme";
import { fetchTransactions, clearTransactions, uploadTransactionsCSV } from "../services/api";
import Header from "../components/Header";

export default function CashFlowPage({ userId, currency = "₹", onMenuToggle, healthScore }) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState({ type: "", message: "" });
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [dragActive, setDragActive] = useState(false);

  const loadData = () => {
    setLoading(true);
    fetchTransactions(userId)
      .then((data) => {
        setTransactions(data || []);
      })
      .catch((err) => {
        setStatus({ type: "error", message: "Failed to fetch transactions." });
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (userId) {
      loadData();
    }
  }, [userId]);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
    }
  };

  const handleFileUpload = (file) => {
    if (!file.name.endsWith(".csv")) {
      setStatus({ type: "error", message: "Please upload a valid .csv file." });
      return;
    }
    setUploading(true);
    setStatus({ type: "info", message: "Uploading and processing CSV..." });
    uploadTransactionsCSV(userId, file)
      .then((data) => {
        setStatus({ type: "success", message: `Successfully imported ${data.length} transactions!` });
        loadData();
      })
      .catch((err) => {
        setStatus({ type: "error", message: err.message || "Failed to process CSV file." });
      })
      .finally(() => setUploading(false));
  };

  const handleClearHistory = () => {
    if (window.confirm("Are you sure you want to clear all transaction history?")) {
      clearTransactions(userId).then(() => {
        setStatus({ type: "success", message: "Transaction history cleared." });
        setTransactions([]);
      });
    }
  };

  // Helper to format currency
  const formatCurrency = (val) => {
    return currency + " " + val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // Computed metrics
  const totalIncome = transactions
    .filter((t) => t.type === "INCOME")
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = transactions
    .filter((t) => t.type === "EXPENSE")
    .reduce((sum, t) => sum + t.amount, 0);

  const netSavings = totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? (netSavings / totalIncome) * 100 : 0;

  // Chart data aggregation by Month-Year
  const getChartData = () => {
    const map = {};
    transactions.forEach((t) => {
      let monthKey = "Unknown";
      let sortKey = 0;
      try {
        const dateObj = new Date(t.date);
        if (!isNaN(dateObj.getTime())) {
          monthKey = dateObj.toLocaleString("default", { month: "short", year: "numeric" });
          sortKey = new Date(dateObj.getFullYear(), dateObj.getMonth(), 1).getTime();
        } else {
          const parts = t.date.split(/[-/]/);
          if (parts.length === 3) {
            if (parts[0].length === 4) {
              const m = parseInt(parts[1], 10);
              const y = parts[0];
              const dateTemp = new Date(y, m - 1, 1);
              monthKey = dateTemp.toLocaleString("default", { month: "short" }) + " " + y;
              sortKey = dateTemp.getTime();
            } else if (parts[2].length === 4) {
              const m = parseInt(parts[1], 10);
              const y = parts[2];
              const dateTemp = new Date(y, m - 1, 1);
              monthKey = dateTemp.toLocaleString("default", { month: "short" }) + " " + y;
              sortKey = dateTemp.getTime();
            }
          }
        }
      } catch (e) {
        // ignore date error
      }

      if (!map[monthKey]) {
        map[monthKey] = { month: monthKey, Income: 0, Expense: 0, sortKey };
      }
      if (t.type === "INCOME") {
        map[monthKey].Income += t.amount;
      } else {
        map[monthKey].Expense += t.amount;
      }
    });

    return Object.values(map).sort((a, b) => a.sortKey - b.sortKey);
  };

  const chartData = getChartData();

  // Categories list for filtering
  const categories = ["ALL", ...new Set(transactions.map((t) => t.category))];

  // Filtering transactions
  const filteredTransactions = transactions.filter((t) => {
    const matchesSearch =
      t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === "ALL" || t.type === typeFilter;
    const matchesCategory = categoryFilter === "ALL" || t.category === categoryFilter;
    return matchesSearch && matchesType && matchesCategory;
  });

  return (
    <>
      <Header title="Cash Flow & History" onMenuToggle={onMenuToggle} healthScore={healthScore} />
      <main className="flex-1 p-4 md:p-10 max-w-[1440px] mx-auto w-full overflow-y-auto">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-8">
          <div>
            <h2 className="text-3xl md:text-5xl font-bold mb-2 flex items-center gap-3" style={{ color: C.onBackground }}>
              <Coins className="w-10 h-10" style={{ color: C.secondary }} />
              Cash Flow Analyzer
            </h2>
            <p className="max-w-2xl text-lg" style={{ color: C.onSurfaceVariant }}>
              Upload and analyze your historical cash flow records to dynamically evaluate savings rates and spending behaviors.
            </p>
          </div>
          {transactions.length > 0 && (
            <button
              onClick={handleClearHistory}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg border font-semibold text-sm transition-all bg-white hover:bg-red-50 text-red-600 border-red-200 cursor-pointer active:scale-95 shadow-sm"
            >
              <Trash2 size={16} />
              Clear Transaction History
            </button>
          )}
        </div>

        {/* Status Alerts */}
        {status.message && (
          <div
            className={`p-4 rounded-xl mb-6 flex items-start gap-3 border shadow-sm transition-all`}
            style={{
              background:
                status.type === "error"
                  ? C.errorContainer
                  : status.type === "success"
                  ? "rgba(39,195,138,0.1)"
                  : C.surfaceContainerLow,
              borderColor:
                status.type === "error"
                  ? C.error
                  : status.type === "success"
                  ? "rgba(39,195,138,0.4)"
                  : C.outlineVariant,
              color: status.type === "error" ? C.error : status.type === "success" ? C.tertiaryContainer : C.primary,
            }}
          >
            {status.type === "error" ? (
              <AlertCircle size={20} className="shrink-0 mt-0.5" />
            ) : status.type === "success" ? (
              <CheckCircle size={20} className="shrink-0 mt-0.5" />
            ) : (
              <AlertCircle size={20} className="shrink-0 mt-0.5" />
            )}
            <div className="flex-1 text-sm font-medium">{status.message}</div>
            <button
              onClick={() => setStatus({ type: "", message: "" })}
              className="text-xs font-bold hover:underline ml-4"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Upload and Stats */}
          <div className="lg:col-span-4 space-y-6">
            {/* Upload Box */}
            <div
              className={`rounded-2xl border shadow-lg p-6 transition-all relative overflow-hidden flex flex-col ${
                dragActive ? "border-indigo-600 scale-[1.01]" : ""
              }`}
              style={{ background: C.surfaceContainerLowest, borderColor: "rgba(197,197,211,0.3)" }}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2" style={{ color: C.primary }}>
                <Upload size={20} style={{ color: C.secondary }} />
                Upload CSV History
              </h3>

              <div
                className={`border-2 border-dashed rounded-xl p-8 text-center flex flex-col items-center justify-center cursor-pointer transition-all ${
                  dragActive ? "border-indigo-500 bg-indigo-50/10" : "border-slate-200 hover:bg-slate-50/50"
                }`}
                onClick={() => document.getElementById("csv-file-input").click()}
              >
                <input
                  id="csv-file-input"
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={handleFileChange}
                  disabled={uploading}
                />
                <FileText size={48} className="text-slate-400 mb-3" />
                <p className="font-semibold text-sm mb-1" style={{ color: C.onSurface }}>
                  Drag & Drop CSV file here
                </p>
                <p className="text-xs text-slate-400 mb-4">or click to browse from device</p>
                <span
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-white shadow-sm transition-all"
                  style={{ background: C.secondary }}
                >
                  Choose File
                </span>
              </div>

              {/* CSV formatting helper */}
              <div className="mt-6 p-4 rounded-xl border border-slate-100 bg-slate-50/50 text-xs">
                <h4 className="font-bold mb-2 flex items-center gap-1.5" style={{ color: C.onSurface }}>
                  <AlertCircle size={14} className="text-indigo-600" />
                  Expected CSV Format
                </h4>
                <p className="text-slate-500 mb-2 leading-relaxed">
                  Provide headers in the first row. The following column names are scanned:
                </p>
                <code className="block bg-slate-800 text-slate-200 p-2 rounded text-[10px] select-all mb-2">
                  Date,Description,Category,Amount,Type
                </code>
                <p className="text-slate-500">
                  Example line: <code className="text-slate-700">2026-06-10,Rent,Rent,25000,EXPENSE</code>
                </p>
              </div>
            </div>

            {/* Metrics cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4">
              {/* Income */}
              <div
                className="rounded-2xl border p-5 flex items-center justify-between shadow-sm"
                style={{ background: C.surfaceContainerLowest, borderColor: "rgba(197,197,211,0.25)" }}
              >
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Income</span>
                  <h4 className="text-2xl font-black mt-1 text-slate-800">{formatCurrency(totalIncome)}</h4>
                </div>
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: "rgba(39,195,138,0.1)", color: C.onTertiaryContainer }}
                >
                  <ArrowUpRight size={20} />
                </div>
              </div>

              {/* Expense */}
              <div
                className="rounded-2xl border p-5 flex items-center justify-between shadow-sm"
                style={{ background: C.surfaceContainerLowest, borderColor: "rgba(197,197,211,0.25)" }}
              >
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Expenses</span>
                  <h4 className="text-2xl font-black mt-1 text-slate-800">{formatCurrency(totalExpense)}</h4>
                </div>
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: C.errorContainer, color: C.error }}
                >
                  <ArrowDownRight size={20} />
                </div>
              </div>

              {/* Net Savings */}
              <div
                className="rounded-2xl border p-5 flex items-center justify-between shadow-sm"
                style={{ background: C.surfaceContainerLowest, borderColor: "rgba(197,197,211,0.25)" }}
              >
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Net Savings</span>
                  <h4
                    className={`text-2xl font-black mt-1 ${netSavings >= 0 ? "text-emerald-600" : "text-rose-600"}`}
                  >
                    {formatCurrency(netSavings)}
                  </h4>
                </div>
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{
                    background: netSavings >= 0 ? "rgba(39,195,138,0.1)" : C.errorContainer,
                    color: netSavings >= 0 ? C.onTertiaryContainer : C.error,
                  }}
                >
                  <PiggyBank size={20} />
                </div>
              </div>

              {/* Savings Rate */}
              <div
                className="rounded-2xl border p-5 flex items-center justify-between shadow-sm"
                style={{ background: C.surfaceContainerLowest, borderColor: "rgba(197,197,211,0.25)" }}
              >
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Savings Rate</span>
                  <h4 className="text-2xl font-black mt-1 text-slate-800">{savingsRate.toFixed(1)}%</h4>
                </div>
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm"
                  style={{ background: "rgba(100,94,251,0.1)", color: C.secondary }}
                >
                  %
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Chart and Table */}
          <div className="lg:col-span-8 space-y-6">
            {/* Chart Card */}
            <div
              className="rounded-2xl border shadow-lg p-6"
              style={{ background: C.surfaceContainerLowest, borderColor: "rgba(197,197,211,0.3)" }}
            >
              <h3 className="text-xl font-bold mb-6 flex items-center gap-2" style={{ color: C.primary }}>
                Income vs Expense Monthly Aggregations
              </h3>

              <div className="h-72 w-full">
                {transactions.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400">
                    <p className="text-sm font-semibold">No data available for charting.</p>
                    <p className="text-xs">Upload your CSV transaction logs to see the chart.</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} tickLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} />
                      <Tooltip
                        contentStyle={{
                          background: "#ffffff",
                          border: "1px solid rgba(197,197,211,0.3)",
                          borderRadius: "12px",
                          boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.05)",
                        }}
                      />
                      <Legend wrapperStyle={{ paddingTop: "10px" }} />
                      <Bar dataKey="Income" fill="#27c38a" radius={[4, 4, 0, 0]} name="Income" />
                      <Bar dataKey="Expense" fill="#ba1a1a" radius={[4, 4, 0, 0]} name="Expense" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Table Card */}
            <div
              className="rounded-2xl border shadow-lg p-6"
              style={{ background: C.surfaceContainerLowest, borderColor: "rgba(197,197,211,0.3)" }}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <h3 className="text-xl font-bold" style={{ color: C.primary }}>
                  Transaction History ({filteredTransactions.length})
                </h3>

                {/* Filters */}
                <div className="flex flex-wrap items-center gap-3">
                  {/* Search */}
                  <div className="relative max-w-[200px] w-full">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9 pr-4 py-2 border rounded-xl text-xs w-full outline-none focus:border-indigo-500 transition-colors bg-slate-50/50"
                      style={{ borderColor: C.outlineVariant }}
                    />
                  </div>

                  {/* Type Filter */}
                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="px-3 py-2 border rounded-xl text-xs outline-none bg-slate-50/50"
                    style={{ borderColor: C.outlineVariant, color: C.onSurface }}
                  >
                    <option value="ALL">All Types</option>
                    <option value="INCOME">Income</option>
                    <option value="EXPENSE">Expense</option>
                  </select>

                  {/* Category Filter */}
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="px-3 py-2 border rounded-xl text-xs outline-none bg-slate-50/50"
                    style={{ borderColor: C.outlineVariant, color: C.onSurface }}
                  >
                    {categories.map((c, i) => (
                      <option key={i} value={c}>
                        {c === "ALL" ? "All Categories" : c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {loading ? (
                <div className="h-48 flex items-center justify-center">
                  <div
                    className="animate-spin rounded-full h-8 w-8 border-b-2"
                    style={{ borderColor: C.secondary }}
                  ></div>
                </div>
              ) : filteredTransactions.length === 0 ? (
                <div className="border border-dashed rounded-xl p-12 text-center text-slate-400">
                  <FileText className="mx-auto mb-3 opacity-30" size={36} />
                  <p className="text-sm font-semibold">No transactions found.</p>
                  <p className="text-xs">
                    {transactions.length === 0
                      ? "Get started by uploading your history CSV file."
                      : "Try adjusting your filters or search terms."}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b" style={{ borderColor: C.outlineVariant }}>
                        <th className="pb-3 text-xs font-bold uppercase tracking-wider text-slate-400 pl-2">Date</th>
                        <th className="pb-3 text-xs font-bold uppercase tracking-wider text-slate-400">Description</th>
                        <th className="pb-3 text-xs font-bold uppercase tracking-wider text-slate-400">Category</th>
                        <th className="pb-3 text-xs font-bold uppercase tracking-wider text-slate-400">Type</th>
                        <th className="pb-3 text-xs font-bold uppercase tracking-wider text-slate-400 text-right pr-2">
                          Amount
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredTransactions.map((t, index) => (
                        <tr key={t.id || index} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-3.5 text-xs text-slate-500 font-semibold pl-2">
                            <span className="flex items-center gap-1.5">
                              <Calendar size={12} className="text-slate-400" />
                              {t.date}
                            </span>
                          </td>
                          <td className="py-3.5 text-xs font-bold text-slate-700">{t.description}</td>
                          <td className="py-3.5 text-xs">
                            <span
                              className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider"
                              style={{ background: C.surfaceContainerLow, color: C.onSurfaceVariant }}
                            >
                              {t.category}
                            </span>
                          </td>
                          <td className="py-3.5 text-xs">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-0.5 ${
                                t.type === "INCOME"
                                  ? "bg-emerald-100/60 text-emerald-700"
                                  : "bg-rose-100/60 text-rose-700"
                              }`}
                            >
                              {t.type === "INCOME" ? (
                                <ArrowUpRight size={10} strokeWidth={3} />
                              ) : (
                                <ArrowDownRight size={10} strokeWidth={3} />
                              )}
                              {t.type}
                            </span>
                          </td>
                          <td
                            className={`py-3.5 text-xs font-black text-right pr-2 ${
                              t.type === "INCOME" ? "text-emerald-600" : "text-slate-800"
                            }`}
                          >
                            {t.type === "INCOME" ? "+" : "-"} {formatCurrency(t.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
