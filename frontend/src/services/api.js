const BASE_URL = "http://localhost:8080/api";

export async function loginUser(username, password) {
  const response = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ username, password }),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "Invalid username or password");
  }
  return await response.json();
}

export async function registerUser(username, password, email) {
  const response = await fetch(`${BASE_URL}/auth/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ username, password, email }),
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
    return await response.json();
  } catch (error) {
    console.error("Error fetching retirement profile:", error);
    return {
      startingCorpus: 120000000.0,
      startingWithdrawal: 4800000.0,
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
    if (!response.ok) throw new Error("Failed to save profile");
    return await response.json();
  } catch (error) {
    console.error("Error saving profile:", error);
    return profileData;
  }
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
    return [
      { name: "Equity", value: 65, color: "#4b41e1" },
      { name: "Debt", value: 25, color: "#004a31" },
      { name: "Gold", value: 5, color: "#f59e0b" },
      { name: "Real Estate", value: 5, color: "#4059aa" },
    ];
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
    return await response.json();
  } catch (error) {
    console.error("Error fetching saved scenarios:", error);
    return [];
  }
}

export async function saveSimulationScenario(userId, scenario) {
  try {
    const response = await fetch(`${BASE_URL}/simulator/scenarios?userId=${encodeURIComponent(userId)}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(scenario),
    });
    if (!response.ok) throw new Error("Failed to save scenario");
    return await response.json();
  } catch (error) {
    console.error("Error saving scenario:", error);
    return scenario;
  }
}

export async function deleteSimulationScenario(userId, scenarioId) {
  try {
    const response = await fetch(`${BASE_URL}/simulator/scenarios/${scenarioId}?userId=${encodeURIComponent(userId)}`, {
      method: "DELETE",
    });
    if (!response.ok) throw new Error("Failed to delete scenario");
    return true;
  } catch (error) {
    console.error("Error deleting scenario:", error);
    return false;
  }
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
  const years = [2024, 2027, 2030, 2034, 2039, 2044];
  const baselines = [0.6, 1.2, 1.9, 2.9, 4.0, 5.1];
  const costCr = amount / 10000000;
  const eventYear = 2024 + Math.round(months / 12);

  const wealthProjection = years.map((year, idx) => {
    let simulated = baselines[idx];
    if (year >= eventYear) {
      const yearsCompounded = year - eventYear;
      const downpaymentAmt = amount * (downpaymentPct / 100.0);
      const loanAmt = amount * (1.0 - downpaymentPct / 100.0);
      const downpaymentDrag = (downpaymentAmt / 10000000.0) * Math.pow(1.075, yearsCompounded);
      const loanDrag = (loanAmt / 10000000.0) * Math.pow(1.0 + loanInterestRate / 100.0, yearsCompounded);
      const totalDrag = downpaymentDrag + loanDrag;
      simulated = Math.max(0, +(baselines[idx] - totalDrag).toFixed(2));
    }
    return { year, baseline: baselines[idx], simulated };
  });

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
      { title: "Delay by 12 Months", desc: `Recovers ₹${+(lossAmountLakhs * 0.63).toFixed(1)}L of projected loss.`, icon: "TrendingUp" },
      { title: "Increase Downpayment", desc: "Shift 10% from equity to reduce debt burden.", icon: "PiggyBank" }
    ]
  };
}

export async function fetchUserSettings(userId) {
  try {
    const response = await fetch(`${BASE_URL}/settings?userId=${encodeURIComponent(userId)}`);
    if (!response.ok) throw new Error("Failed to fetch settings");
    return await response.json();
  } catch (error) {
    console.error("Error fetching user settings:", error);
    return {
      currency: "₹",
      targetRetirementAge: 60,
      equityAllocation: 65.0,
      debtAllocation: 25.0,
      goldAllocation: 5.0,
      realEstateAllocation: 5.0
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
    if (!response.ok) throw new Error("Failed to save settings");
    return await response.json();
  } catch (error) {
    console.error("Error saving user settings:", error);
    return settingsData;
  }
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
    return fallbackInsights();
  }
}

function fallbackInsights() {
  return [
    {
      title: "Withdrawal Rate is Sustainable",
      description: "Your planned annual withdrawal rate is within standard safe limits.",
      type: "success",
      impactMetric: "Optimal",
      category: "Retirement",
      actionableStep: "Maintain your planned retirement budget."
    },
    {
      title: "Balanced Allocation Mix",
      description: "Your portfolio mix is balanced, yielding stable growth.",
      type: "success",
      impactMetric: "Optimal",
      category: "Allocation",
      actionableStep: "Continue monitoring quarterly and rebalancing annually."
    }
  ];
}

export async function fetchHoldings(userId) {
  try {
    const response = await fetch(`${BASE_URL}/portfolio/holdings?userId=${encodeURIComponent(userId)}`);
    if (!response.ok) throw new Error("Failed to fetch holdings");
    return await response.json();
  } catch (error) {
    console.error("Error fetching holdings:", error);
    return [
      { id: "1", assetName: "HDFC Index Nifty 50 Fund", category: "Equity", amount: 6500000, growthRate: 12 },
      { id: "2", assetName: "SBI Corporate Bond Fund", category: "Debt", amount: 2500000, growthRate: 6.8 },
      { id: "3", assetName: "Sovereign Gold Bond (SGB)", category: "Gold", amount: 500000, growthRate: 8 },
      { id: "4", assetName: "DLF Real Estate REIT", category: "Real Estate", amount: 500000, growthRate: 9.5 }
    ];
  }
}

export async function saveHolding(userId, holdingData) {
  try {
    const response = await fetch(`${BASE_URL}/portfolio/holdings?userId=${encodeURIComponent(userId)}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(holdingData),
    });
    if (!response.ok) throw new Error("Failed to save holding");
    return await response.json();
  } catch (error) {
    console.error("Error saving holding:", error);
    return holdingData;
  }
}

export async function deleteHolding(userId, holdingId) {
  try {
    const response = await fetch(`${BASE_URL}/portfolio/holdings/${holdingId}?userId=${encodeURIComponent(userId)}`, {
      method: "DELETE",
    });
    if (!response.ok) throw new Error("Failed to delete holding");
    return true;
  } catch (error) {
    console.error("Error deleting holding:", error);
    return false;
  }
}

export async function fetchTransactions(userId) {
  try {
    const response = await fetch(`${BASE_URL}/transactions?userId=${encodeURIComponent(userId)}`);
    if (!response.ok) throw new Error("Failed to fetch transactions");
    return await response.json();
  } catch (error) {
    console.error("Error fetching transactions:", error);
    return [];
  }
}

export async function clearTransactions(userId) {
  try {
    const response = await fetch(`${BASE_URL}/transactions?userId=${encodeURIComponent(userId)}`, {
      method: "DELETE",
    });
    if (!response.ok) throw new Error("Failed to clear transactions");
    return await response.json();
  } catch (error) {
    console.error("Error clearing transactions:", error);
    return { message: "Failed to clear transactions" };
  }
}

export async function uploadTransactionsCSV(userId, file) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${BASE_URL}/transactions/upload?userId=${encodeURIComponent(userId)}`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "Failed to upload CSV");
  }
  return await response.json();
}

export async function clearHoldings(userId) {
  try {
    const response = await fetch(`${BASE_URL}/portfolio/holdings?userId=${encodeURIComponent(userId)}`, {
      method: "DELETE",
    });
    if (!response.ok) throw new Error("Failed to clear holdings");
    return await response.json();
  } catch (error) {
    console.error("Error clearing holdings:", error);
    return { message: "Failed to clear holdings" };
  }
}

export async function uploadHoldingsCSV(userId, file) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${BASE_URL}/portfolio/holdings/upload?userId=${encodeURIComponent(userId)}`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "Failed to upload CSV");
  }
  return await response.json();
}

