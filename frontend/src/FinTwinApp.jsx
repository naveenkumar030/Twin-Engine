import React, { useState, useEffect } from "react";
import { C } from "./constants/theme";
import Sidebar from "./components/Sidebar";
import RetirementPage from "./pages/RetirementPage";
import SimulatorPage from "./pages/SimulatorPage";
import SettingsPage from "./pages/SettingsPage";
import InsightsPage from "./pages/InsightsPage";
import PortfolioPage from "./pages/PortfolioPage";
import CashFlowPage from "./pages/CashFlowPage";
import AuthPage from "./pages/AuthPage";
import { fetchUserSettings, fetchInsights } from "./services/api";

export default function FinTwinApp() {
  const [tab, setTab] = useState("retirement");
  const [user, setUser] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [currency, setCurrency] = useState("₹");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [healthScore, setHealthScore] = useState(840);

  useEffect(() => {
    // Check if session storage has user details
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
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  // Guard page: if user is not authenticated, render AuthPage
  if (!user) {
    return <AuthPage onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div
      className="min-h-screen flex antialiased relative"
      style={{ background: C.background || C.surface, color: C.onSurface, fontFamily: "Inter, sans-serif" }}
    >
      {/* Mobile Sidebar Overlay Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-45 md:hidden transition-all duration-300"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sidebar
        active={tab}
        onNavigate={handleTabChange}
        onLogout={handleLogout}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex-1 md:ml-64 flex flex-col min-h-screen">
        {tab === "simulator" ? (
          <SimulatorPage
            userId={user.username}
            currency={currency}
            onMenuToggle={() => setSidebarOpen(true)}
            healthScore={healthScore}
          />
        ) : tab === "settings" ? (
          <SettingsPage
            userId={user.username}
            onUserUpdate={handleUserUpdate}
            onMenuToggle={() => setSidebarOpen(true)}
            healthScore={healthScore}
          />
        ) : tab === "insights" ? (
          <InsightsPage
            userId={user.username}
            onMenuToggle={() => setSidebarOpen(true)}
            healthScore={healthScore}
          />
        ) : tab === "portfolio" ? (
          <PortfolioPage
            userId={user.username}
            currency={currency}
            onMenuToggle={() => setSidebarOpen(true)}
            healthScore={healthScore}
          />
        ) : tab === "cashflow" ? (
          <CashFlowPage
            userId={user.username}
            currency={currency}
            onMenuToggle={() => setSidebarOpen(true)}
            healthScore={healthScore}
          />
        ) : (
          <RetirementPage
            userId={user.username}
            currency={currency}
            onMenuToggle={() => setSidebarOpen(true)}
            healthScore={healthScore}
          />
        )}
      </div>
    </div>
  );
}
