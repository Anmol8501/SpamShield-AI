import { useState } from "react";
import { motion } from "framer-motion";
import { MessageSquare, ShieldAlert, ShieldCheck, Target, Search, Trash2, Calendar, FileDown, Clock, Image } from "lucide-react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  LineChart,
  Line,
} from "recharts";

interface HistoryItem {
  id: number;
  message: string;
  prediction: string;
  confidence: number;
  timestamp: string;
  source: string;
}

interface AnalyticsData {
  total_predictions: number;
  spam_predictions: number;
  safe_predictions: number;
  average_confidence: number;
  spam_percentage: number;
  safe_percentage: number;
  todays_scans: number;
  ocr_scans: number;
  daily_usage: {
    day: string;
    date: string;
    total: number;
    spam: number;
    safe: number;
  }[];
}

interface DashboardProps {
  history: HistoryItem[];
  analytics: AnalyticsData | null;
  onClearHistory: () => void;
  onDeleteHistoryItem: (id: number) => void;
  addToast: (message: string, type: "success" | "error" | "warning" | "info") => void;
}

export default function Dashboard({
  history,
  analytics,
  onClearHistory,
  onDeleteHistoryItem,
  addToast,
}: DashboardProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<"all" | "spam" | "safe" | "ocr">("all");

  const total = analytics?.total_predictions || 0;
  const spamCount = analytics?.spam_predictions || 0;
  const hamCount = analytics?.safe_predictions || 0;
  const avgConfidence = analytics?.average_confidence || 0;
  const todaysScans = analytics?.todays_scans || 0;
  const ocrScans = analytics?.ocr_scans || 0;

  // Filter history based on search query AND category filter
  const filteredHistory = history.filter((item) => {
    const matchesSearch = item.message.toLowerCase().includes(searchTerm.toLowerCase());
    
    let matchesFilter = true;
    if (filterType === "spam") {
      matchesFilter = item.prediction === "Spam";
    } else if (filterType === "safe") {
      matchesFilter = item.prediction === "Ham";
    } else if (filterType === "ocr") {
      matchesFilter = item.source.toLowerCase() === "ocr" || item.source.toLowerCase().includes("ocr");
    }

    return matchesSearch && matchesFilter;
  });

  // KPI cards metrics layout
  const stats = [
    {
      title: "Total Predictions",
      value: total,
      icon: <MessageSquare className="h-5 w-5" />,
      color: "text-brand-600 dark:text-brand-400 bg-brand-500/10",
    },
    {
      title: "Spam Detected",
      value: spamCount,
      icon: <ShieldAlert className="h-5 w-5" />,
      color: "text-rose-650 dark:text-rose-450 bg-rose-500/10",
    },
    {
      title: "Safe Messages",
      value: hamCount,
      icon: <ShieldCheck className="h-5 w-5" />,
      color: "text-emerald-650 dark:text-emerald-450 bg-emerald-500/10",
    },
    {
      title: "Average Confidence",
      value: `${avgConfidence}%`,
      icon: <Target className="h-5 w-5" />,
      color: "text-indigo-650 dark:text-indigo-400 bg-indigo-500/10",
    },
    {
      title: "Today's Scans",
      value: todaysScans,
      icon: <Clock className="h-5 w-5" />,
      color: "text-sky-650 dark:text-sky-400 bg-sky-500/10",
    },
    {
      title: "OCR Scans",
      value: ocrScans,
      icon: <Image className="h-5 w-5" />,
      color: "text-amber-650 dark:text-amber-405 bg-amber-500/10",
    },
  ];

  // Group data for the Pie Chart (Safe vs Spam)
  const pieData = [
    { name: "Safe", value: hamCount, color: "#10b981" },
    { name: "Spam", value: spamCount, color: "#ef4444" },
  ].filter((d) => d.value > 0);

  // Group data for Trend Line Graph (reverse chronology showing confidence indices)
  const trendData = history.length > 0
    ? history.slice().reverse().map((item, idx) => ({
        index: `${idx + 1}`,
        confidence: item.confidence,
        label: item.prediction
      }))
    : [];

  const exportToCSV = () => {
    if (history.length === 0) {
      addToast("No records available to export.", "warning");
      return;
    }

    const headers = ["ID", "Timestamp", "Source", "Message", "Prediction", "Confidence"];
    const rows = history.map((item) => [
      item.id,
      item.timestamp,
      item.source,
      `"${item.message.replace(/"/g, '""')}"`,
      item.prediction,
      `${item.confidence}%`
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `spamshield_analytics_history_${Date.now()}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast("Analytics database log exported as CSV file", "success");
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-8">
      
      {/* 6 Required Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {stats.map((stat, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.04 }}
            className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 rounded-2xl p-5 shadow-sm flex items-center justify-between"
          >
            <div className="space-y-1 text-left">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">{stat.title}</span>
              <h4 className="font-outfit text-2xl font-extrabold text-slate-900 dark:text-white leading-none">
                {stat.value}
              </h4>
            </div>
            <div className={`p-2.5 rounded-xl ${stat.color} flex items-center justify-center shrink-0`}>
              {stat.icon}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Analytics Charts Grid */}
      {total === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 rounded-3xl p-12 text-center shadow-sm">
          <Calendar className="h-12 w-12 text-slate-350 dark:text-slate-750 mx-auto mb-4" />
          <h3 className="font-outfit font-extrabold text-lg text-slate-900 dark:text-white">
            No prediction data available yet
          </h3>
          <p className="text-xs text-slate-500 max-w-[280px] mx-auto mt-2 leading-relaxed">
            Run a prediction sandbox analysis or upload an SMS screenshot to activate database telemetry.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fadeIn">
          
          {/* Daily Predictions Bar Chart */}
          <div className="lg:col-span-8 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 rounded-3xl p-6 shadow-sm flex flex-col justify-between min-h-[300px]">
            <div>
              <h3 className="font-outfit font-bold text-base text-slate-900 dark:text-white mb-1">
                Daily Predictions
              </h3>
              <p className="text-xs text-slate-550 dark:text-slate-400">
                Evaluation counts comparing spam blocked vs safe messages for the past week.
              </p>
            </div>

            <div className="h-60 w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics?.daily_usage || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="day" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(15, 23, 42, 0.95)",
                      border: "none",
                      borderRadius: "12px",
                      color: "#fff",
                      fontSize: "11px",
                    }}
                  />
                  <Bar dataKey="safe" fill="#10b981" radius={[4, 4, 0, 0]} name="Safe Messages" />
                  <Bar dataKey="spam" fill="#ef4444" radius={[4, 4, 0, 0]} name="Spam Messages" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Safe vs Spam Distribution Pie Chart */}
          <div className="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 rounded-3xl p-6 shadow-sm flex flex-col justify-between min-h-[300px]">
            <div>
              <h3 className="font-outfit font-bold text-base text-slate-900 dark:text-white mb-1">
                Spam vs Safe Distribution
              </h3>
              <p className="text-xs text-slate-550 dark:text-slate-400">
                Ratio comparing classified safe (ham) vs spam content.
              </p>
            </div>

            <div className="h-44 w-full relative flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {pieData.map((entry, idx) => (
                      <Cell key={`cell-${idx}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(15, 23, 42, 0.95)",
                      border: "none",
                      borderRadius: "12px",
                      color: "#fff",
                      fontSize: "11px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute text-center select-none">
                <span className="text-[9px] uppercase font-bold text-slate-400 block leading-none">Scans</span>
                <strong className="text-2xl font-extrabold text-slate-850 dark:text-white block mt-1 leading-none">
                  {total}
                </strong>
              </div>
            </div>

            <div className="border-t border-slate-100 dark:border-slate-850/60 pt-3 flex justify-around text-xs">
              <div className="flex items-center gap-1.5 font-medium">
                <span className="h-2 w-2 rounded-full bg-emerald-500 block" />
                <span className="text-slate-500 dark:text-slate-400">Safe: {analytics?.safe_percentage}%</span>
              </div>
              <div className="flex items-center gap-1.5 font-medium">
                <span className="h-2 w-2 rounded-full bg-rose-500 block" />
                <span className="text-slate-500 dark:text-slate-400">Spam: {analytics?.spam_percentage}%</span>
              </div>
            </div>
          </div>

          {/* Prediction Trend Line Graph */}
          <div className="lg:col-span-12 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 rounded-3xl p-6 shadow-sm min-h-[280px] flex flex-col justify-between">
            <div>
              <h3 className="font-outfit font-bold text-base text-slate-900 dark:text-white mb-1">
                Prediction Confidence Trend
              </h3>
              <p className="text-xs text-slate-550 dark:text-slate-400">
                Performance tracking confidence values across sequential runs.
              </p>
            </div>

            <div className="h-44 w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="index" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis domain={[0, 100]} stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(15, 23, 42, 0.95)",
                      border: "none",
                      borderRadius: "12px",
                      color: "#fff",
                      fontSize: "11px",
                    }}
                  />
                  <Line type="monotone" dataKey="confidence" stroke="#8b5cf6" strokeWidth={2.5} activeDot={{ r: 6 }} name="Confidence %" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>
      )}

      {/* Database History Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 rounded-3xl p-6 shadow-sm space-y-6">
        
        {/* Table Header controls */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 dark:border-slate-850/60 pb-4">
          <div>
            <h3 className="font-outfit font-bold text-lg text-slate-900 dark:text-white">
              Predictions Database Log
            </h3>
            <p className="text-xs text-slate-550">
              Locally managed logs of text evaluations.
            </p>
          </div>
          
          <div className="flex gap-2 w-full sm:w-auto">
            {total > 0 && (
              <>
                <button
                  onClick={exportToCSV}
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-850 border border-slate-205 dark:border-slate-800 px-3.5 py-2.5 rounded-xl transition-all"
                >
                  <FileDown className="h-4 w-4" />
                  Export CSV
                </button>
                <button
                  onClick={onClearHistory}
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-rose-600 dark:text-rose-405 hover:bg-rose-50 dark:hover:bg-rose-955/20 border border-rose-250/20 px-3.5 py-2.5 rounded-xl transition-all"
                >
                  <Trash2 className="h-4 w-4" />
                  Clear Database
                </button>
              </>
            )}
          </div>
        </div>

        {total === 0 ? (
          <div className="text-center py-10 text-slate-500">
            <Calendar className="h-10 w-10 text-slate-300 dark:text-slate-800 mx-auto mb-3" />
            <p className="text-sm font-semibold">Log history is empty.</p>
            <p className="text-xs text-slate-400 mt-1">Predictions will register dynamically as scans are processed.</p>
          </div>
        ) : (
          <div className="space-y-4">
            
            {/* Filter category selector tabs */}
            <div className="flex flex-wrap gap-1.5 border-b border-slate-100 dark:border-slate-850/60 pb-3">
              {[
                { type: "all", label: "All Records" },
                { type: "spam", label: "Spam Only" },
                { type: "safe", label: "Safe Only" },
                { type: "ocr", label: "OCR Source" },
              ].map((tab) => (
                <button
                  key={tab.type}
                  onClick={() => setFilterType(tab.type as any)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    filterType === tab.type
                      ? "bg-brand-500 text-white shadow-sm"
                      : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Search filter input */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search SMS logs by keyword content..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-205 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-sm text-slate-850 dark:text-slate-200 placeholder-slate-400"
              />
            </div>

            {/* Filtered logs lists */}
            <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
              {filteredHistory.length === 0 ? (
                <p className="text-center py-6 text-xs text-slate-450">No logs found matching current criteria.</p>
              ) : (
                filteredHistory.map((item) => (
                  <div
                    key={item.id}
                    className="flex justify-between items-start gap-4 p-4 bg-slate-55 hover:bg-slate-100/50 dark:bg-slate-950 dark:hover:bg-slate-850/50 border border-slate-200/40 dark:border-slate-800/40 rounded-2xl transition-all group"
                  >
                    <div className="space-y-2 flex-1 min-w-0 text-left">
                      <p className="text-sm text-slate-800 dark:text-slate-350 font-medium break-words">
                        "{item.message}"
                      </p>
                      <div className="flex items-center gap-3 text-[10px] text-slate-450 dark:text-slate-500">
                        <span>{item.timestamp}</span>
                        <span className="h-1.5 w-1.5 rounded-full bg-slate-300 dark:bg-slate-700" />
                        <span className="font-semibold text-brand-600 dark:text-brand-400">
                          {item.confidence}% Confidence
                        </span>
                        <span className="h-1.5 w-1.5 rounded-full bg-slate-300 dark:bg-slate-700" />
                        <span className="capitalize font-mono">Source: {item.source}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        item.prediction === "Spam"
                          ? "bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400"
                          : "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400"
                      }`}>
                        {item.prediction === "Ham" ? "Safe" : "Spam"}
                      </span>
                      <button
                        onClick={() => onDeleteHistoryItem(item.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-slate-200 dark:hover:bg-slate-800 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                        title="Delete log record"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
