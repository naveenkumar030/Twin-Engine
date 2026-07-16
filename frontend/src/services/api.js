const BASE_URL = "http://localhost:8080/api";

// --- Backend Reachability Cache ---
// Two-level check:
// 1. _backendReachable: can we reach Tomcat at all? (probed once at startup)
// 2. _dbReachable: is MongoDB responding? (inferred from first 5xx response)
// Once either is false, ALL subsequent API calls skip the network instantly
// and read from localStorage. This makes pages load immediately.

let _backendReachable = null; // null=unknown, true=up, false=network down
let _dbReachable = true;       // assume DB is up until we see a 5xx
let _probePromise = null;

function probeBackend() {
  if (_probePromise) return _probePromise;
  _probePromise = (async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 800);
      let responded = false;
      try {
        await window._originalFetch(BASE_URL + "/health", { signal: controller.signal });
        responded = true;
      } catch {
        // aborted or network error
      }
      clearTimeout(timeoutId);
      _backendReachable = responded;
    } catch {
      _backendReachable = false;
    }
  })();
  return _probePromise;
}

// Kick off probe immediately on module load
const _originalFetch = window.fetch;
window._originalFetch = _originalFetch;
probeBackend();

window.fetch = async function (resource, options = {}) {
  if (typeof resource !== "string" || !resource.startsWith(BASE_URL)) {
    return _originalFetch(resource, options);
  }

  // GuestUser: skip network entirely — instant cache read
  try {
    const urlObj = new URL(resource);
    const userId = urlObj.searchParams.get("userId");
    if (userId === "GuestUser") {
      throw new Error("Offline Mode");
    }
  } catch (e) {
    if (e.message === "Offline Mode") throw e;
  }

  // Wait for probe if still running (max 800ms total, only once ever)
  if (_backendReachable === null) {
    await probeBackend();
  }

  // Auth endpoints (/api/auth/*) must ALWAYS reach the real backend —
  // they need MongoDB to register/login and must never be short-circuited.
  const isAuthEndpoint = resource.includes("/api/auth/");

  // If Tomcat is unreachable OR MongoDB already errored → skip network
  // (but never skip auth endpoints — let them fail naturally)
  if (!isAuthEndpoint && (_backendReachable === false || _dbReachable === false)) {
    throw new Error("Offline Mode");
  }

  // Backend is reachable — make the real request with a 3s guard
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    _backendReachable = false; // network stalled — mark offline
    controller.abort();
  }, 3000);

  try {
    const response = await _originalFetch(resource, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    // If response is a server error (5xx), the DB is likely down
    // Mark DB as unreachable so ALL future calls skip the network instantly
    if (response.status >= 500) {
      _dbReachable = false;
    }

    return response;
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
};

export async function loginUser(email, password) {
  const response = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "Invalid email or password");
  }
  return await response.json();
}

export async function registerUser(email, password, username) {
  const response = await fetch(`${BASE_URL}/auth/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password, username }),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "Registration failed");
  }
  return await response.json();
}

export async function fetchRetirementProfile(userId) {
  try {
    const response = await fetch(`${BASE_URL}/retirement/profile?userId=${encodeURIComponent(userId)}`);
    if (!response.ok) throw new Error("Failed to fetch profile");
    const data = await response.json();
    try {
      localStorage.setItem("fintwin_profile_" + userId, JSON.stringify(data));
    } catch {}
    return data;
  } catch (error) {
    console.error("Error fetching retirement profile:", error);
    try {
      const cached = localStorage.getItem("fintwin_profile_" + userId);
      if (cached) return JSON.parse(cached);
    } catch {}
    return {
      startingCorpus: 0.0,
      startingWithdrawal: 0.0,
      inflationRate: 0.06,
      returnRate: 0.08
    };
  }
}

export async function saveRetirementProfile(userId, profileData) {
  try {
    const response = await fetch(`${BASE_URL}/retirement/profile?userId=${encodeURIComponent(userId)}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(profileData),
    });
    if (response.ok) {
      const data = await response.json();
      try {
        localStorage.setItem("fintwin_profile_" + userId, JSON.stringify(data));
      } catch {}
      return data;
    }
  } catch (error) {
    console.error("Error saving profile:", error);
  }
  try {
    localStorage.setItem("fintwin_profile_" + userId, JSON.stringify(profileData));
  } catch {}
  return profileData;
}

export async function fetchRetirementProjection(userId, profile) {
  try {
    const response = await fetch(`${BASE_URL}/retirement/projection?userId=${encodeURIComponent(userId)}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        startingCorpus: profile.startingCorpus,
        startingWithdrawal: profile.startingWithdrawal,
        inflationRate: profile.inflationRate,
        returnRate: profile.returnRate,
      }),
    });
    if (!response.ok) throw new Error("Network response was not ok");
    return await response.json();
  } catch (error) {
    console.error("Error fetching retirement projection:", error);
    return fallbackProjection(profile);
  }
}

export async function fetchRetirementAllocation(userId) {
  try {
    const url = userId
      ? `${BASE_URL}/retirement/allocation?userId=${encodeURIComponent(userId)}`
      : `${BASE_URL}/retirement/allocation`;
    const response = await fetch(url);
    if (!response.ok) throw new Error("Network response was not ok");
    return await response.json();
  } catch (error) {
    console.error("Error fetching retirement allocation:", error);
    return [];
  }
}

export async function fetchSimulationResult(userId, selectedEvent, amount, months, downpaymentPct, loanInterestRate) {
  try {
    const url = userId 
      ? `${BASE_URL}/simulator/project?userId=${encodeURIComponent(userId)}`
      : `${BASE_URL}/simulator/project`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ selectedEvent, amount, months, downpaymentPct, loanInterestRate }),
    });
    if (!response.ok) throw new Error("Network response was not ok");
    return await response.json();
  } catch (error) {
    console.error("Error running simulation:", error);
    return fallbackSimulation(selectedEvent, amount, months, downpaymentPct, loanInterestRate);
  }
}

export async function fetchSavedScenarios(userId) {
  try {
    const response = await fetch(`${BASE_URL}/simulator/scenarios?userId=${encodeURIComponent(userId)}`);
    if (!response.ok) throw new Error("Failed to fetch scenarios");
    const data = await response.json();
    try {
      localStorage.setItem("fintwin_scenarios_" + userId, JSON.stringify(data));
    } catch {}
    return data;
  } catch (error) {
    console.error("Error fetching saved scenarios:", error);
    try {
      const cached = localStorage.getItem("fintwin_scenarios_" + userId);
      if (cached) return JSON.parse(cached);
    } catch {}
    return [];
  }
}

export async function saveSimulationScenario(userId, scenario) {
  let updatedScenario = scenario;
  try {
    const response = await fetch(`${BASE_URL}/simulator/scenarios?userId=${encodeURIComponent(userId)}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(scenario),
    });
    if (!response.ok) throw new Error("Failed to save scenario");
    updatedScenario = await response.json();
  } catch (error) {
    console.error("Error saving scenario:", error);
    if (!updatedScenario.id) {
      updatedScenario = { ...updatedScenario, id: "mock_scen_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9) };
    }
  }

  try {
    const cachedStr = localStorage.getItem("fintwin_scenarios_" + userId);
    let cached = cachedStr ? JSON.parse(cachedStr) : [];
    const index = cached.findIndex(s => s.id === updatedScenario.id);
    if (index >= 0) {
      cached[index] = updatedScenario;
    } else {
      cached.push(updatedScenario);
    }
    localStorage.setItem("fintwin_scenarios_" + userId, JSON.stringify(cached));
  } catch {}

  return updatedScenario;
}

export async function deleteSimulationScenario(userId, scenarioId) {
  let success = false;
  try {
    const response = await fetch(`${BASE_URL}/simulator/scenarios/${scenarioId}?userId=${encodeURIComponent(userId)}`, {
      method: "DELETE",
    });
    if (!response.ok) throw new Error("Failed to delete scenario");
    success = true;
  } catch (error) {
    console.error("Error deleting scenario:", error);
    success = true;
  }

  try {
    const cachedStr = localStorage.getItem("fintwin_scenarios_" + userId);
    if (cachedStr) {
      let cached = JSON.parse(cachedStr);
      cached = cached.filter(s => s.id !== scenarioId);
      localStorage.setItem("fintwin_scenarios_" + userId, JSON.stringify(cached));
    }
  } catch {}

  return success;
}

// Client-side fallback methods in case backend is offline
function fallbackProjection(profile) {
  const data = [];
  let corpus = profile?.startingCorpus || 120000000;
  let withdrawal = profile?.startingWithdrawal || 4800000;
  const inflation = 1 + (profile?.inflationRate || 0.06);
  const ret = 1 + (profile?.returnRate || 0.08);
  for (let age = 60; age <= 90; age++) {
    data.push({
      age,
      corpus: +(corpus / 10000000).toFixed(2),
      withdrawal: +(withdrawal / 100000).toFixed(1),
    });
    corpus = Math.max(0, (corpus - withdrawal) * ret);
    withdrawal *= inflation;
  }
  return data;
}

function fallbackSimulation(selectedEvent, amount, months, downpaymentPct = 30, loanInterestRate = 8.5) {
  const currentYear = 2024;
  const eventYear = currentYear + Math.round(months / 12);
  const currentWealth = 0.0; // 0 baseline in Cr
  const returnRate = 8; // 8% default return

  const wealthProjection = [];
  for (let i = 0; i <= 20; i++) {
    const year = currentYear + i;
    const baseline = +(currentWealth * Math.pow(1 + returnRate / 100, i)).toFixed(2);
    let simulated = baseline;

    if (year >= eventYear) {
      const yearsCompounded = year - eventYear;
      const downpaymentAmt = amount * (downpaymentPct / 100.0);
      const loanAmt = amount * (1.0 - downpaymentPct / 100.0);
      const downpaymentDrag = (downpaymentAmt / 10000000.0) * Math.pow(1 + returnRate / 100, yearsCompounded);
      const loanDrag = (loanAmt / 10000000.0) * Math.pow(1 + loanInterestRate / 100.0, yearsCompounded);
      const totalDrag = downpaymentDrag + loanDrag;
      simulated = Math.max(0, +(baseline - totalDrag).toFixed(2));
    }
    
    wealthProjection.push({ year, baseline, simulated });
  }

  const costLakhs = amount / 100000;
  const lossAmountLakhs = +(costLakhs * 1.47).toFixed(1);
  const ageDelta = Math.max(1, Math.round(costLakhs / 7.5));
  const recoveryYears = +((costLakhs / 15) * 8.5).toFixed(1);

  return {
    wealthProjection,
    predictedImpact: {
      lossAmountLakhs,
      qualityOfLifeImprovementPct: selectedEvent === "house" ? 25 : 15,
      retirementAgeDeltaYears: ageDelta,
      liquidityRisk: costLakhs > 35 ? "High" : costLakhs > 12 ? "Medium" : "Low",
      timeToRecoveryYears: recoveryYears,
    },
    optimizedPaths: [
      { title: "Delay by 12 Months", desc: `Recovers \u20B9${+(lossAmountLakhs * 0.63).toFixed(1)}L of projected loss.`, icon: "TrendingUp" },
      { title: "Increase Downpayment", desc: "Shift 10% from equity to reduce debt burden.", icon: "PiggyBank" }
    ]
  };
}

export async function fetchUserSettings(userId) {
  try {
    const response = await fetch(`${BASE_URL}/settings?userId=${encodeURIComponent(userId)}`);
    if (!response.ok) throw new Error("Failed to fetch settings");
    const data = await response.json();
    try {
      localStorage.setItem("fintwin_settings_" + userId, JSON.stringify(data));
    } catch {}
    return data;
  } catch (error) {
    console.error("Error fetching user settings:", error);
    try {
      const cached = localStorage.getItem("fintwin_settings_" + userId);
      if (cached) return JSON.parse(cached);
    } catch {}
    return {
      currency: "\u20B9",
      targetRetirementAge: 60,
      equityAllocation: 0.0,
      debtAllocation: 0.0,
      goldAllocation: 0.0,
      realEstateAllocation: 0.0
    };
  }
}

export async function saveUserSettings(userId, settingsData) {
  try {
    const response = await fetch(`${BASE_URL}/settings?userId=${encodeURIComponent(userId)}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(settingsData),
    });
    if (response.ok) {
      const data = await response.json();
      try {
        localStorage.setItem("fintwin_settings_" + userId, JSON.stringify(data));
      } catch {}
      return data;
    }
  } catch (error) {
    console.error("Error saving user settings:", error);
  }
  try {
    localStorage.setItem("fintwin_settings_" + userId, JSON.stringify(settingsData));
  } catch {}
  return settingsData;
}

export async function updateUserProfile(userId, profileData) {
  const response = await fetch(`${BASE_URL}/settings/profile?userId=${encodeURIComponent(userId)}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(profileData),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "Failed to update profile");
  }
  return await response.json();
}

export async function fetchInsights(userId) {
  try {
    const response = await fetch(`${BASE_URL}/insights?userId=${encodeURIComponent(userId)}`);
    if (!response.ok) throw new Error("Failed to fetch insights");
    return await response.json();
  } catch (error) {
    console.error("Error fetching insights:", error);
    return [];
  }
}

function fallbackInsights() {
  return [];
}

export async function fetchHoldings(userId) {
  try {
    const response = await fetch(`${BASE_URL}/portfolio/holdings?userId=${encodeURIComponent(userId)}`);
    if (!response.ok) throw new Error("Failed to fetch holdings");
    const data = await response.json();
    try {
      localStorage.setItem("fintwin_holdings_" + userId, JSON.stringify(data));
    } catch {}
    return data;
  } catch (error) {
    console.error("Error fetching holdings:", error);
    try {
      const cached = localStorage.getItem("fintwin_holdings_" + userId);
      if (cached) return JSON.parse(cached);
    } catch {}
    return [];
  }
}

export async function saveHolding(userId, holdingData) {
  let updatedData = holdingData;
  try {
    const response = await fetch(`${BASE_URL}/portfolio/holdings?userId=${encodeURIComponent(userId)}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(holdingData),
    });
    if (!response.ok) throw new Error("Failed to save holding");
    updatedData = await response.json();
  } catch (error) {
    console.error("Error saving holding:", error);
    if (!updatedData.id) {
      updatedData = { ...updatedData, id: "mock_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9) };
    }
  }

  try {
    const cachedStr = localStorage.getItem("fintwin_holdings_" + userId);
    let cached = cachedStr ? JSON.parse(cachedStr) : [];
    const index = cached.findIndex(h => h.id === updatedData.id || (h.assetName === updatedData.assetName && h.category === updatedData.category));
    if (index >= 0) {
      cached[index] = updatedData;
    } else {
      cached.push(updatedData);
    }
    localStorage.setItem("fintwin_holdings_" + userId, JSON.stringify(cached));
  } catch {}

  return updatedData;
}

export async function deleteHolding(userId, holdingId) {
  let success = false;
  try {
    const response = await fetch(`${BASE_URL}/portfolio/holdings/${holdingId}?userId=${encodeURIComponent(userId)}`, {
      method: "DELETE",
    });
    if (!response.ok) throw new Error("Failed to delete holding");
    success = true;
  } catch (error) {
    console.error("Error deleting holding:", error);
    success = true;
  }

  try {
    const cachedStr = localStorage.getItem("fintwin_holdings_" + userId);
    if (cachedStr) {
      let cached = JSON.parse(cachedStr);
      cached = cached.filter(h => h.id !== holdingId);
      localStorage.setItem("fintwin_holdings_" + userId, JSON.stringify(cached));
    }
  } catch {}

  return success;
}

export async function fetchTransactions(userId) {
  try {
    const response = await fetch(`${BASE_URL}/transactions?userId=${encodeURIComponent(userId)}`);
    if (!response.ok) throw new Error("Failed to fetch transactions");
    const data = await response.json();
    try {
      localStorage.setItem("fintwin_txs_" + userId, JSON.stringify(data));
    } catch {}
    return data;
  } catch (error) {
    console.error("Error fetching transactions:", error);
    try {
      const cached = localStorage.getItem("fintwin_txs_" + userId);
      if (cached) return JSON.parse(cached);
    } catch {}
    return [];
  }
}

export async function clearTransactions(userId) {
  try {
    const response = await fetch(`${BASE_URL}/transactions?userId=${encodeURIComponent(userId)}`, {
      method: "DELETE",
    });
    if (response.ok) {
      const data = await response.json();
      try { localStorage.setItem("fintwin_txs_" + userId, JSON.stringify([])); } catch {}
      return data;
    }
  } catch (error) {
    console.error("Error clearing transactions:", error);
  }
  try { localStorage.setItem("fintwin_txs_" + userId, JSON.stringify([])); } catch {}
  return { message: "Failed to clear transactions" };
}

function parseTransactionsCSVLocal(text) {
  const lines = text.split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map(h => h.trim().toLowerCase());
  const dateIdx = headers.indexOf("date");
  const descIdx = headers.indexOf("description");
  const catIdx = headers.indexOf("category");
  const amtIdx = headers.indexOf("amount");
  const typeIdx = headers.indexOf("type");

  if (dateIdx === -1 || amtIdx === -1) {
    throw new Error("Invalid CSV format. Date and Amount columns are required.");
  }

  const result = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const cols = [];
    let current = "";
    let inQuotes = false;
    for (let charIdx = 0; charIdx < line.length; charIdx++) {
      const char = line[charIdx];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        cols.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    cols.push(current.trim());

    if (cols.length < headers.length) continue;

    const amount = parseFloat(cols[amtIdx]);
    if (isNaN(amount)) continue;

    result.push({
      id: "mock_tx_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9),
      date: cols[dateIdx],
      description: descIdx >= 0 ? cols[descIdx] : "",
      category: catIdx >= 0 ? cols[catIdx] : "Other",
      amount: amount,
      type: typeIdx >= 0 ? cols[typeIdx].toUpperCase() : "EXPENSE"
    });
  }
  return result;
}

export async function uploadTransactionsCSV(userId, file) {
  try {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(`${BASE_URL}/transactions/upload?userId=${encodeURIComponent(userId)}`, {
      method: "POST",
      body: formData,
    });

    if (response.ok) {
      const data = await response.json();
      try {
        localStorage.setItem("fintwin_txs_" + userId, JSON.stringify(data));
      } catch {}
      return data;
    }
    throw new Error("Backend failed to process CSV");
  } catch (error) {
    console.error("Error uploading transactions CSV, falling back to local parse:", error);
    try {
      const text = await file.text();
      const parsed = parseTransactionsCSVLocal(text);
      
      const cachedStr = localStorage.getItem("fintwin_txs_" + userId);
      let cached = cachedStr ? JSON.parse(cachedStr) : [];
      cached = [...cached, ...parsed];
      localStorage.setItem("fintwin_txs_" + userId, JSON.stringify(cached));
      
      return parsed;
    } catch (parseError) {
      throw new Error(parseError.message || "Failed to parse CSV locally.");
    }
  }
}

export async function clearHoldings(userId) {
  try {
    const response = await fetch(`${BASE_URL}/portfolio/holdings?userId=${encodeURIComponent(userId)}`, {
      method: "DELETE",
    });
    if (response.ok) {
      const data = await response.json();
      try { localStorage.setItem("fintwin_holdings_" + userId, JSON.stringify([])); } catch {}
      return data;
    }
  } catch (error) {
    console.error("Error clearing holdings:", error);
  }
  try { localStorage.setItem("fintwin_holdings_" + userId, JSON.stringify([])); } catch {}
  return { message: "Failed to clear holdings" };
}

function parseHoldingsCSVLocal(text) {
  const lines = text.split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map(h => h.trim().toLowerCase());
  const nameIdx = headers.findIndex(h => h.includes("name") || h.includes("asset"));
  const catIdx = headers.indexOf("category");
  const amtIdx = headers.indexOf("amount");
  const growthIdx = headers.findIndex(h => h.includes("growth") || h.includes("rate"));

  if (nameIdx === -1 || amtIdx === -1) {
    throw new Error("Invalid CSV format. AssetName and Amount columns are required.");
  }

  const result = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const cols = [];
    let current = "";
    let inQuotes = false;
    for (let charIdx = 0; charIdx < line.length; charIdx++) {
      const char = line[charIdx];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        cols.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    cols.push(current.trim());

    if (cols.length < headers.length) continue;

    const amount = parseFloat(cols[amtIdx]);
    if (isNaN(amount)) continue;

    result.push({
      id: "mock_hold_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9),
      assetName: cols[nameIdx],
      category: catIdx >= 0 ? cols[catIdx] : "Other",
      amount: amount,
      growthRate: growthIdx >= 0 ? parseFloat(cols[growthIdx]) || 0.0 : 0.0
    });
  }
  return result;
}

export async function uploadHoldingsCSV(userId, file) {
  try {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(`${BASE_URL}/portfolio/holdings/upload?userId=${encodeURIComponent(userId)}`, {
      method: "POST",
      body: formData,
    });

    if (response.ok) {
      const data = await response.json();
      try {
        localStorage.setItem("fintwin_holdings_" + userId, JSON.stringify(data));
      } catch {}
      return data;
    }
    throw new Error("Backend failed to process CSV");
  } catch (error) {
    console.error("Error uploading holdings CSV, falling back to local parse:", error);
    try {
      const text = await file.text();
      const parsed = parseHoldingsCSVLocal(text);
      
      const cachedStr = localStorage.getItem("fintwin_holdings_" + userId);
      let cached = cachedStr ? JSON.parse(cachedStr) : [];
      cached = [...cached, ...parsed];
      localStorage.setItem("fintwin_holdings_" + userId, JSON.stringify(cached));
      
      return parsed;
    } catch (parseError) {
      throw new Error(parseError.message || "Failed to parse CSV locally.");
    }
  }
}
