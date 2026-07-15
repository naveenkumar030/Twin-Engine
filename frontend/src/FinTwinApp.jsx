import React, { useState, useEffect } from "react";
import { Toaster } from "react-hot-toast";
import { AnimatePresence, motion } from "framer-motion";
import { C } from "./constants/theme";
import Sidebar from "./components/Sidebar";
import RetirementPage from "./pages/RetirementPage";
import SimulatorPage from "./pages/SimulatorPage";
import SettingsPage from "./pages/SettingsPage";
import InsightsPage from "./pages/InsightsPage";
import PortfolioPage from "./pages/PortfolioPage";
import CashFlowPage from "./pages/CashFlowPage";
import AuthPage from "./pages/AuthPage";
import DashboardPage from "./pages/DashboardPage";
import { fetchUserSettings, fetchInsights } from "./services/api";

const pageVariants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.28, ease: [0.16, 1, 0.3, 1] } },
  exit: { opacity: 0, y: -6, transition: { duration: 0.18 } },
};

export default function FinTwinApp() {
  const [tab, setTab] = useState("dashboard");
  const [user, setUser] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [currency, setCurrency] = useState("₹");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [healthScore, setHealthScore] = useState(840);
  const [darkMode, setDarkMode] = useState(() => {
    try {
      return localStorage.getItem("fintwin_dark") === "true";
    } catch {
      return false;
    }
  });

  // Apply dark mode to html element
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    try {
      localStorage.setItem("fintwin_dark", darkMode);
    } catch {}
  }, [darkMode]);

  useEffect(() => {
    const savedUser = sessionStorage.getItem("fintwin_user");
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        console.error("Error parsing saved user session:", e);
      }
    }
    setCheckingAuth(false);
  }, []);

  const loadSettings = () => {
    if (user && user.username) {
      fetchUserSettings(user.username).then((res) => {
        if (res && res.currency) {
          setCurrency(res.currency);
        }
      });
    }
  };

  const loadHealthScore = () => {
    if (user && user.username) {
      fetchInsights(user.username).then((insights) => {
        if (insights && insights.length > 0) {
          const warnings = insights.filter((i) => i.type === "warning").length;
          const successes = insights.filter((i) => i.type === "success").length;
          const tips = insights.filter((i) => i.type === "tip").length;
          let score = 800 - warnings * 120 + successes * 40 + tips * 20;
          score = Math.max(250, Math.min(1000, score));
          setHealthScore(score);
        }
      });
    }
  };

  useEffect(() => {
    if (user) {
      loadSettings();
      loadHealthScore();
    }
  }, [user]);

  useEffect(() => {
    const handler = () => {
      loadSettings();
      loadHealthScore();
    };
    window.addEventListener("fintwin_settings_changed", handler);
    window.addEventListener("fintwin_portfolio_changed", handler);
    window.addEventListener("fintwin_scenarios_changed", handler);
    return () => {
      window.removeEventListener("fintwin_settings_changed", handler);
      window.removeEventListener("fintwin_portfolio_changed", handler);
      window.removeEventListener("fintwin_scenarios_changed", handler);
    };
  }, [user]);

  const handleLoginSuccess = (userData) => {
    setUser(userData);
    sessionStorage.setItem("fintwin_user", JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    sessionStorage.removeItem("fintwin_user");
  };

  const handleUserUpdate = (updatedUser) => {
    setUser(updatedUser);
  };

  const handleTabChange = (newTab) => {
    setTab(newTab);
    setSidebarOpen(false);
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: C.surface }}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-xl animate-pulse"
            style={{ background: `linear-gradient(135deg, ${C.secondary}, ${C.secondaryContainer})` }}>
            <span className="text-white font-black text-xl">FT</span>
          </div>
          <div className="animate-spin rounded-full h-6 w-6 border-b-2" style={{ borderColor: C.secondary }} />
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthPage onLoginSuccess={handleLoginSuccess} />;
  }

  const commonProps = {
    userId: user.username,
    currency,
    onMenuToggle: () => setSidebarOpen(true),
    healthScore,
    darkMode,
  };

  return (
    <div
      className="min-h-screen flex antialiased relative transition-colors duration-300"
      style={{
        background: darkMode ? "#0f172a" : (C.surface || "#fafafa"),
        color: darkMode ? "#f1f5f9" : C.onSurface,
        fontFamily: "Inter, sans-serif",
      }}
    >
      {/* Toast Notifications */}
      <Toaster
        position="bottom-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: darkMode ? "#1e293b" : "#ffffff",
            color: darkMode ? "#f1f5f9" : "#09090b",
            border: `1px solid ${darkMode ? "rgba(51,65,85,0.8)" : "rgba(228,228,231,0.8)"}`,
            borderRadius: "16px",
            boxShadow: "0 10px 40px rgba(0,0,0,0.1)",
            fontSize: "13px",
            fontWeight: "600",
          },
          success: {
            iconTheme: { primary: "#10b981", secondary: "#fff" },
          },
          error: {
            iconTheme: { primary: "#ef4444", secondary: "#fff" },
          },
        }}
      />

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-45 md:hidden transition-all duration-300"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sidebar
        active={tab}
        onNavigate={handleTabChange}
        onLogout={handleLogout}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        darkMode={darkMode}
        onToggleDark={() => setDarkMode((d) => !d)}
      />

      <div className="flex-1 md:ml-64 flex flex-col min-h-screen">
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="flex flex-col flex-1"
          >
            {tab === "dashboard" ? (
              <DashboardPage {...commonProps} onNavigate={handleTabChange} />
            ) : tab === "simulator" ? (
              <SimulatorPage {...commonProps} />
            ) : tab === "settings" ? (
              <SettingsPage {...commonProps} onUserUpdate={handleUserUpdate} />
            ) : tab === "insights" ? (
              <InsightsPage {...commonProps} />
            ) : tab === "portfolio" ? (
              <PortfolioPage {...commonProps} />
            ) : tab === "cashflow" ? (
              <CashFlowPage {...commonProps} />
            ) : (
              <RetirementPage {...commonProps} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

