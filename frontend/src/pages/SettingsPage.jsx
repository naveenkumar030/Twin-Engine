import React, { useState, useEffect } from "react";
import { User, Settings as SettingsIcon, PieChart, ShieldAlert, CheckCircle, Save, KeyRound, Mail, DollarSign, Sparkles } from "lucide-react";
import { C } from "../constants/theme";
import { fetchUserSettings, saveUserSettings, updateUserProfile } from "../services/api";
import Header from "../components/Header";

export default function SettingsPage({ userId, onUserUpdate, onMenuToggle, healthScore }) {
  // Tabs: 'profile', 'preferences', 'allocation'
  const [activeTab, setActiveTab] = useState("profile");

  // Profile Form States
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [profileMessage, setProfileMessage] = useState({ text: "", type: "" });
  const [profileLoading, setProfileLoading] = useState(false);

  // Settings Prefs & Alloc States
  const [settings, setSettings] = useState({
    currency: "₹",
    targetRetirementAge: 60,
    currentAge: 42,
    equityAllocation: 65,
    debtAllocation: 25,
    goldAllocation: 5,
    realEstateAllocation: 5,
  });
  const [settingsMessage, setSettingsMessage] = useState({ text: "", type: "" });
  const [settingsLoading, setSettingsLoading] = useState(false);

  // Load settings on mount
  useEffect(() => {
    if (userId) {
      // Find stored user details from session storage if possible to prepopulate email
      const savedUser = sessionStorage.getItem("fintwin_user");
      if (savedUser) {
        try {
          const parsed = JSON.parse(savedUser);
          if (parsed.email) setEmail(parsed.email);
        } catch (e) {
          console.error(e);
        }
      }

      fetchUserSettings(userId).then((res) => {
        if (res) {
          setSettings({
            currency: res.currency || "₹",
            targetRetirementAge: res.targetRetirementAge || 60,
            currentAge: res.currentAge !== undefined ? res.currentAge : 42,
            equityAllocation: res.equityAllocation !== undefined ? res.equityAllocation : 65,
            debtAllocation: res.debtAllocation !== undefined ? res.debtAllocation : 25,
            goldAllocation: res.goldAllocation !== undefined ? res.goldAllocation : 5,
            realEstateAllocation: res.realEstateAllocation !== undefined ? res.realEstateAllocation : 5,
          });
        }
      });
    }
  }, [userId]);

  const totalAllocation =
    Number(settings.equityAllocation) +
    Number(settings.debtAllocation) +
    Number(settings.goldAllocation) +
    Number(settings.realEstateAllocation);

  const isAllocationValid = Math.abs(totalAllocation - 100) < 0.01;

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setProfileMessage({ text: "", type: "" });

    if (password && password !== confirmPassword) {
      setProfileMessage({ text: "Passwords do not match.", type: "error" });
      return;
    }

    setProfileLoading(true);
    try {
      const res = await updateUserProfile(userId, { email, password });
      setProfileMessage({ text: "Profile updated successfully!", type: "success" });
      setPassword("");
      setConfirmPassword("");

      // Update session storage details
      const savedUser = sessionStorage.getItem("fintwin_user");
      if (savedUser) {
        const parsed = JSON.parse(savedUser);
        parsed.email = res.email;
        sessionStorage.setItem("fintwin_user", JSON.stringify(parsed));
        onUserUpdate && onUserUpdate(parsed);
      }
    } catch (err) {
      setProfileMessage({ text: err.message || "Failed to update profile details.", type: "error" });
    } finally {
      setProfileLoading(false);
    }
  };

  const handleSettingsSubmit = async (e) => {
    e.preventDefault();
    setSettingsMessage({ text: "", type: "" });

    if (!isAllocationValid) {
      setSettingsMessage({ text: `Total allocation must sum to exactly 100% (currently ${totalAllocation}%).`, type: "error" });
      return;
    }

    setSettingsLoading(true);
    try {
      const saved = await saveUserSettings(userId, settings);
      setSettings(saved);
      setSettingsMessage({ text: "Settings and Allocations saved successfully!", type: "success" });
      window.dispatchEvent(new Event("fintwin_settings_changed"));
    } catch (err) {
      setSettingsMessage({ text: "Failed to save settings.", type: "error" });
    } finally {
      setSettingsLoading(false);
    }
  };

  const updateSetting = (key, val) => {
    setSettings((prev) => ({
      ...prev,
      [key]: val,
    }));
  };

  return (
    <>
      <Header title="Account Settings" onMenuToggle={onMenuToggle} healthScore={healthScore} />
      <main className="flex-1 p-4 md:p-10 max-w-[1200px] mx-auto w-full overflow-y-auto animate-fade-in space-y-8">
        <div>
          <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-2" style={{ color: C.onBackground }}>
            Settings
          </h2>
          <p className="max-w-2xl text-lg text-slate-500">
            Configure your digital twin variables, default system preferences, and secure credentials.
          </p>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b gap-6 border-slate-200">
          {[
            { key: "profile", label: "Profile & Security", icon: User },
            { key: "preferences", label: "System Preferences", icon: SettingsIcon },
            { key: "allocation", label: "Asset Allocation", icon: PieChart },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className="flex items-center gap-2 pb-4 text-sm font-bold transition-all relative outline-none cursor-pointer"
                style={{ color: active ? C.secondary : "#71717a" }}
              >
                <Icon size={18} className={active ? "text-indigo-600" : "text-slate-400"} />
                {tab.label}
                {active && (
                  <div
                    className="absolute bottom-0 left-0 right-0 h-[3px] rounded-t-full"
                    style={{ background: C.secondary }}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Content Body */}
        <div className="grid grid-cols-1 gap-6 max-w-3xl">
          {/* PROFILE TAB */}
          {activeTab === "profile" && (
            <div
              className="rounded-3xl border shadow-lg shadow-slate-100 p-6 md:p-8 bg-white animate-slide-up"
              style={{ borderColor: "rgba(228, 228, 231, 0.8)" }}
            >
              <h3 className="text-lg font-bold mb-6 flex items-center gap-2 text-slate-800" style={{ color: C.primary }}>
                <User size={20} className="text-indigo-500" />
                Profile Information
              </h3>

              {profileMessage.text && (
                <div
                  className="p-4 rounded-2xl border mb-6 text-sm font-semibold flex items-center gap-2"
                  style={{
                    background: profileMessage.type === "success" ? "rgba(16, 185, 129, 0.1)" : C.errorContainer,
                    color: profileMessage.type === "success" ? "#10b981" : C.error,
                    borderColor: profileMessage.type === "success" ? "rgba(16, 185, 129, 0.2)" : "rgba(239, 68, 68, 0.2)",
                  }}
                >
                  {profileMessage.type === "success" ? <CheckCircle size={18} /> : <ShieldAlert size={18} />}
                  {profileMessage.text}
                </div>
              )}

              <form onSubmit={handleProfileSubmit} className="space-y-6">
                <div>
                  <label className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-2">
                    Username (Read-Only)
                  </label>
                  <input
                    type="text"
                    disabled
                    value={userId || ""}
                    className="w-full px-4 py-3.5 border rounded-2xl outline-none text-sm font-semibold opacity-60 cursor-not-allowed border-slate-200 bg-slate-50"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-2">
                    Email Address
                  </label>
                  <div className="relative group">
                    <Mail size={16} className="absolute left-4 top-4 text-slate-400" />
                    <input
                      type="email"
                      required
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-11 pr-4 py-3.5 border rounded-2xl outline-none text-sm font-semibold transition-all focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 border-slate-200 bg-white"
                    />
                  </div>
                </div>

                <div className="border-t pt-6 border-slate-100">
                  <h4 className="text-base font-bold mb-4 flex items-center gap-2 text-slate-800">
                    <KeyRound size={18} className="text-indigo-500" />
                    Security Credentials
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-2">
                        New Password
                      </label>
                      <input
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-4 py-3.5 border rounded-2xl outline-none text-sm font-semibold transition-all focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 border-slate-200"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-2">
                        Confirm New Password
                      </label>
                      <input
                        type="password"
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full px-4 py-3.5 border rounded-2xl outline-none text-sm font-semibold transition-all focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 border-slate-200"
                      />
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-400 font-semibold mt-2.5">
                    Leave password fields blank if you do not wish to change your security credential.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={profileLoading}
                  className="w-full py-4 rounded-2xl text-sm font-bold shadow-lg hover:shadow-indigo-500/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-white cursor-pointer"
                  style={{ background: `linear-gradient(135deg, ${C.secondary}, ${C.secondaryContainer})` }}
                >
                  <Save size={16} />
                  {profileLoading ? "Updating Profile..." : "Save Profile Details"}
                </button>
              </form>
            </div>
          )}

          {/* PREFERENCES TAB */}
          {activeTab === "preferences" && (
            <div
              className="rounded-3xl border shadow-lg shadow-slate-100 p-6 md:p-8 bg-white animate-slide-up"
              style={{ borderColor: "rgba(228, 228, 231, 0.8)" }}
            >
              <h3 className="text-lg font-bold mb-6 flex items-center gap-2 text-slate-800">
                <SettingsIcon size={20} className="text-indigo-500" />
                Preferences Configuration
              </h3>

              {settingsMessage.text && (
                <div
                  className="p-4 rounded-2xl border mb-6 text-sm font-semibold flex items-center gap-2"
                  style={{
                    background: settingsMessage.type === "success" ? "rgba(16, 185, 129, 0.1)" : C.errorContainer,
                    color: settingsMessage.type === "success" ? "#10b981" : C.error,
                    borderColor: settingsMessage.type === "success" ? "rgba(16, 185, 129, 0.2)" : "rgba(239, 68, 68, 0.2)",
                  }}
                >
                  {settingsMessage.type === "success" ? <CheckCircle size={18} /> : <ShieldAlert size={18} />}
                  {settingsMessage.text}
                </div>
              )}

              <form onSubmit={handleSettingsSubmit} className="space-y-6">
                <div>
                  <label className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-2">
                    System Currency Code
                  </label>
                  <div className="grid grid-cols-4 gap-3">
                    {[
                      { sym: "₹", label: "₹ (INR)" },
                      { sym: "$", label: "$ (USD)" },
                      { sym: "€", label: "€ (EUR)" },
                      { sym: "£", label: "£ (GBP)" },
                    ].map((cur) => {
                      const active = settings.currency === cur.sym;
                      return (
                        <button
                          key={cur.sym}
                          type="button"
                          onClick={() => updateSetting("currency", cur.sym)}
                          className="py-3 border rounded-2xl font-bold text-sm transition-all focus:outline-none cursor-pointer"
                          style={
                            active
                              ? { background: "rgba(99, 102, 241, 0.08)", borderColor: C.secondary, color: C.secondary }
                              : { borderColor: "rgba(228, 228, 231, 0.8)", color: C.onSurfaceVariant }
                          }
                        >
                          {cur.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <div className="flex justify-between items-center text-xs">
                    <label className="font-bold text-slate-400 uppercase tracking-widest">
                      Current Age
                    </label>
                    <span className="font-extrabold text-indigo-600">
                      {settings.currentAge || 42} Years
                    </span>
                  </div>
                  <input
                    type="range"
                    min="18"
                    max="70"
                    value={settings.currentAge || 42}
                    onChange={(e) => updateSetting("currentAge", Number(e.target.value))}
                    className="w-full h-1.5 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] font-bold text-slate-400">
                    <span>18 Years</span>
                    <span>70 Years</span>
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <div className="flex justify-between items-center text-xs">
                    <label className="font-bold text-slate-400 uppercase tracking-widest">
                      Default Target Retirement Age
                    </label>
                    <span className="font-extrabold text-indigo-600">
                      {settings.targetRetirementAge} Years
                    </span>
                  </div>
                  <input
                    type="range"
                    min="40"
                    max="80"
                    value={settings.targetRetirementAge}
                    onChange={(e) => updateSetting("targetRetirementAge", Number(e.target.value))}
                    className="w-full h-1.5 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] font-bold text-slate-400">
                    <span>40 Years</span>
                    <span>80 Years</span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={settingsLoading}
                  className="w-full py-4 rounded-2xl text-sm font-bold shadow-lg hover:shadow-indigo-500/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-white cursor-pointer"
                  style={{ background: `linear-gradient(135deg, ${C.secondary}, ${C.secondaryContainer})` }}
                >
                  <Save size={16} fill="#ffffff" />
                  {settingsLoading ? "Saving Changes..." : "Save Preferences"}
                </button>
              </form>
            </div>
          )}

          {/* ALLOCATION TAB */}
          {activeTab === "allocation" && (
            <div
              className="rounded-3xl border shadow-lg shadow-slate-100 p-6 md:p-8 bg-white animate-slide-up"
              style={{ borderColor: "rgba(228, 228, 231, 0.8)" }}
            >
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                  <h3 className="text-lg font-bold flex items-center gap-2 text-slate-800">
                    <PieChart size={20} className="text-indigo-500" />
                    Asset Allocation Weights
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Set custom percentages for automated retirement portfolio allocation.
                  </p>
                </div>

                <div
                  className="px-3.5 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all"
                  style={{
                    background: isAllocationValid ? "rgba(16, 185, 129, 0.1)" : C.errorContainer,
                    color: isAllocationValid ? "#10b981" : C.error,
                  }}
                >
                  {isAllocationValid ? <CheckCircle size={14} /> : <ShieldAlert size={14} />}
                  Total: {totalAllocation}%
                </div>
              </div>

              {settingsMessage.text && (
                <div
                  className="p-4 rounded-2xl border mb-6 text-sm font-semibold flex items-center gap-2"
                  style={{
                    background: settingsMessage.type === "success" ? "rgba(16, 185, 129, 0.1)" : C.errorContainer,
                    color: settingsMessage.type === "success" ? "#10b981" : C.error,
                    borderColor: settingsMessage.type === "success" ? "rgba(16, 185, 129, 0.2)" : "rgba(239, 68, 68, 0.2)",
                  }}
                >
                  {settingsMessage.type === "success" ? <CheckCircle size={18} /> : <ShieldAlert size={18} />}
                  {settingsMessage.text}
                </div>
              )}

              {/* Dynamic horizontal breakdown bar */}
              <div className="h-4 rounded-full overflow-hidden flex mb-8 border border-slate-100 shadow-inner bg-slate-100">
                {settings.equityAllocation > 0 && (
                  <div
                    style={{ width: `${settings.equityAllocation}%`, background: C.secondary }}
                    title={`Equity: ${settings.equityAllocation}%`}
                  />
                )}
                {settings.debtAllocation > 0 && (
                  <div
                    style={{ width: `${settings.debtAllocation}%`, background: "#10b981" }}
                    title={`Debt: ${settings.debtAllocation}%`}
                  />
                )}
                {settings.goldAllocation > 0 && (
                  <div
                    style={{ width: `${settings.goldAllocation}%`, background: C.gold }}
                    title={`Gold: ${settings.goldAllocation}%`}
                  />
                )}
                {settings.realEstateAllocation > 0 && (
                  <div
                    style={{ width: `${settings.realEstateAllocation}%`, background: "#3b82f6" }}
                    title={`Real Estate: ${settings.realEstateAllocation}%`}
                  />
                )}
                {totalAllocation === 0 && (
                  <div className="w-full bg-slate-200" title="Empty" />
                )}
              </div>

              <form onSubmit={handleSettingsSubmit} className="space-y-6">
                {/* Equity */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold flex items-center gap-2 text-slate-700">
                      <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: C.secondary }} />
                      Equity (%)
                    </span>
                    <span className="font-extrabold text-indigo-600">
                      {settings.equityAllocation}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={settings.equityAllocation}
                    onChange={(e) => updateSetting("equityAllocation", Number(e.target.value))}
                    className="w-full h-1.5 rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                {/* Debt */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold flex items-center gap-2 text-slate-700">
                      <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: "#10b981" }} />
                      Debt (%)
                    </span>
                    <span className="font-extrabold text-emerald-600">
                      {settings.debtAllocation}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={settings.debtAllocation}
                    onChange={(e) => updateSetting("debtAllocation", Number(e.target.value))}
                    className="w-full h-1.5 rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                {/* Gold */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold flex items-center gap-2 text-slate-700">
                      <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: C.gold }} />
                      Gold (%)
                    </span>
                    <span className="font-extrabold text-amber-500">
                      {settings.goldAllocation}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={settings.goldAllocation}
                    onChange={(e) => updateSetting("goldAllocation", Number(e.target.value))}
                    className="w-full h-1.5 rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                {/* Real Estate */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold flex items-center gap-2 text-slate-700">
                      <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: "#3b82f6" }} />
                      Real Estate (%)
                    </span>
                    <span className="font-extrabold text-blue-500">
                      {settings.realEstateAllocation}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={settings.realEstateAllocation}
                    onChange={(e) => updateSetting("realEstateAllocation", Number(e.target.value))}
                    className="w-full h-1.5 rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                {!isAllocationValid && (
                  <div
                    className="p-4 rounded-2xl border text-xs font-semibold flex items-center gap-2 bg-red-50/50 border-red-100 text-rose-600"
                  >
                    <ShieldAlert size={16} />
                    Current total sum is {totalAllocation}%. Adjust the sliders so that they sum to exactly 100% to save.
                  </div>
                )}

                <button
                  type="submit"
                  disabled={settingsLoading || !isAllocationValid}
                  className="w-full py-4 rounded-2xl text-sm font-bold shadow-lg hover:shadow-indigo-500/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed text-white"
                  style={{ background: `linear-gradient(135deg, ${C.secondary}, ${C.secondaryContainer})` }}
                >
                  <Save size={16} fill="#ffffff" />
                  {settingsLoading ? "Saving Settings..." : "Save Custom Allocations"}
                </button>
              </form>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
