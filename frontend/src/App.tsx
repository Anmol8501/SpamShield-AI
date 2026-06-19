import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "./components/Navbar";
import Home from "./components/Home";
import Detector from "./components/Detector";
import Dashboard from "./components/Dashboard";
import ModelInfo from "./components/ModelInfo";
import CommandPalette from "./components/CommandPalette";
import ToastContainer, { type ToastMessage } from "./components/Toast";

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

const API_BASE = import.meta.env.VITE_API_URL || (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1" ? "http://localhost:5000" : "https://spamshield-ai-tfve.onrender.com");

export default function App() {
  const [activeTab, setActiveTab] = useState<string>("home");
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [injectedExample, setInjectedExample] = useState("");
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  
  // Real database telemetry states
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);

  // Theme state
  const [theme, setTheme] = useState<"light" | "dark" | "system">(() => {
    const saved = localStorage.getItem("spam_shield_theme");
    return saved ? (saved as any) : "system";
  });

  const addToast = (message: string, type: "success" | "error" | "warning" | "info" = "info") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => removeToast(id), 4000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Fetch telemetry from SQLite backend
  const fetchTelemetry = async () => {
    try {
      const histResp = await fetch(`${API_BASE}/history`);
      if (histResp.ok) {
        const histData = await histResp.json();
        setHistory(histData);
      } else {
        setHistory([]);
      }

      const analResp = await fetch(`${API_BASE}/analytics`);
      if (analResp.ok) {
        const analData = await analResp.json();
        setAnalytics(analData);
      } else {
        setAnalytics(null);
      }
    } catch (err) {
      console.error("Failed to sync database logs:", err);
      setHistory([]);
      setAnalytics(null);
    }
  };

  // Fetch on mount
  useEffect(() => {
    fetchTelemetry();
  }, []);

  // Fetch when dashboard is visited to ensure freshness
  useEffect(() => {
    if (activeTab === "dashboard" || activeTab === "detector") {
      fetchTelemetry();
    }
  }, [activeTab]);

  // Sync theme
  useEffect(() => {
    localStorage.setItem("spam_shield_theme", theme);
    
    const applyTheme = () => {
      if (theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
        document.body.classList.add("dark");
      } else {
        document.body.classList.remove("dark");
      }
    };

    applyTheme();

    if (theme === "system") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const handleSystemThemeChange = () => applyTheme();
      mediaQuery.addEventListener("change", handleSystemThemeChange);
      return () => mediaQuery.removeEventListener("change", handleSystemThemeChange);
    }
  }, [theme]);

  // Keyboard Shortcuts Hook
  useEffect(() => {
    const handleGlobalShortcuts = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      }
      
      if (e.altKey) {
        if (e.key.toLowerCase() === "h") {
          e.preventDefault();
          setActiveTab("home");
          addToast("Navigated to Home Page", "info");
        } else if (e.key.toLowerCase() === "d") {
          e.preventDefault();
          setActiveTab("detector");
          addToast("Navigated to Prediction Sandbox", "info");
        } else if (e.key.toLowerCase() === "a") {
          e.preventDefault();
          setActiveTab("dashboard");
          addToast("Navigated to Dashboard Metrics", "info");
        } else if (e.key.toLowerCase() === "t") {
          e.preventDefault();
          setTheme((prev) => {
            const next = prev === "light" ? "dark" : prev === "dark" ? "system" : "light";
            addToast(`Theme set to ${next}`, "success");
            return next;
          });
        }
      }
    };

    window.addEventListener("keydown", handleGlobalShortcuts);
    return () => window.removeEventListener("keydown", handleGlobalShortcuts);
  }, []);

  const handleClearHistory = async () => {
    try {
      const res = await fetch(`${API_BASE}/history`, { method: "DELETE" });
      if (res.ok) {
        setHistory([]);
        setAnalytics(null);
        addToast("Prediction history databases cleared", "warning");
        fetchTelemetry();
      }
    } catch (err) {
      addToast("Failed to delete database records.", "error");
    }
  };

  const handleDeleteHistoryItem = async (id: number) => {
    try {
      const res = await fetch(`${API_BASE}/history/${id}`, { method: "DELETE" });
      if (res.ok) {
        addToast("Log record deleted from database", "info");
        fetchTelemetry();
      }
    } catch (err) {
      addToast("Failed to delete record.", "error");
    }
  };

  const handlePredictionSuccess = () => {
    // Live update triggers
    fetchTelemetry();
  };

  const renderContent = () => {
    switch (activeTab) {
      case "home":
        return <Home setActiveTab={setActiveTab} />;
      case "detector":
        return (
          <Detector
            onPredictionSuccess={handlePredictionSuccess}
            addToast={addToast}
            injectedExample={injectedExample}
            clearInjectedExample={() => setInjectedExample("")}
          />
        );
      case "dashboard":
        return (
          <Dashboard
            history={history}
            analytics={analytics}
            onClearHistory={handleClearHistory}
            onDeleteHistoryItem={handleDeleteHistoryItem}
            addToast={addToast}
          />
        );
      case "modelInfo":
        return <ModelInfo />;
      default:
        return <Home setActiveTab={setActiveTab} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200 flex flex-col font-sans">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        theme={theme}
        setTheme={setTheme}
        onOpenCommandPalette={() => setCommandPaletteOpen(true)}
      />

      <main className="flex-grow container mx-auto px-4 py-6 md:py-10 max-w-7xl">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </main>

      <footer className="border-t border-slate-200/50 dark:border-slate-800/50 bg-white/40 dark:bg-slate-950/40 py-6 text-xs text-slate-400 dark:text-slate-550 transition-colors">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-3">
          <p>© {new Date().getFullYear()} SpamShield AI SaaS. Running real predictions.</p>
          <div className="flex gap-4">
            <button className="hover:text-slate-650 dark:hover:text-slate-350" onClick={() => setActiveTab("modelInfo")}>Model Specs</button>
            <span className="h-4 w-px bg-slate-200 dark:bg-slate-850" />
            <button className="hover:text-slate-650 dark:hover:text-slate-350" onClick={() => setActiveTab("detector")}>Inference Sandbox</button>
          </div>
        </div>
      </footer>

      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        setActiveTab={setActiveTab}
        setDarkMode={(dark) => setTheme(dark ? "dark" : "light")}
        darkMode={theme === "dark"}
        onInjectExample={(text) => setInjectedExample(text)}
        onClearHistory={handleClearHistory}
      />

      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
}
