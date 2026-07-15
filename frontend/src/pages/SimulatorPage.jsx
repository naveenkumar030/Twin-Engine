import React, { useState, useEffect, useMemo, useRef } from "react";
import { ResponsiveContainer, ComposedChart, Area, Line, CartesianGrid, XAxis, YAxis, Tooltip, ReferenceLine } from "recharts";
import { SlidersHorizontal, Zap, Sparkles, TrendingUp, PiggyBank, Trash, Save, Calendar, Coins, ArrowUpRight, Download, FileText, Eye, EyeOff, Info, ArrowRight, Plus } from "lucide-react";
import { lifeEvents } from "../constants/data";
import { fetchSavedScenarios, saveSimulationScenario, deleteSimulationScenario, fetchHoldings } from "../services/api";
import Header from "../components/Header";
import OptimizedPath from "../components/OptimizedPath";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-hot-toast";
import html2canvas from "html2canvas";

// Icon mapping for optimized paths
const iconMap = {
  TrendingUp: TrendingUp,
  PiggyBank: PiggyBank,
  Calendar: Calendar,
  Coins: Coins,
  GraduationCap: Zap
};

// Formatting helper for Indian Currency
const formatCurrency = (val, currency = "₹") => {
  const absVal = Math.abs(val);
  if (absVal >= 10000000) {
    return `${val < 0 ? "-" : ""}${currency}${(absVal / 10000000).toFixed(2)} Cr`;
  } else if (absVal >= 100000) {
    return `${val < 0 ? "-" : ""}${currency}${(absVal / 100000).toFixed(0)}L`;
  } else {
    return `${val < 0 ? "-" : ""}${currency}${absVal.toLocaleString("en-IN")}`;
  }
};

// Animated Number Counter Component
function AnimatedCounter({ value, prefix = "", suffix = "", decimals = 2, className = "" }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let startTimestamp = null;
    const duration = 800; // 800ms
    const startVal = displayValue;
    const endVal = value;

    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      const easedProgress = progress * (2 - progress); // easeOutQuad
      const current = startVal + easedProgress * (endVal - startVal);
      setDisplayValue(current);

      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        setDisplayValue(endVal);
      }
    };

    const animId = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(animId);
  }, [value]);

  return (
    <span className={className}>
      {prefix}
      {displayValue.toLocaleString("en-IN", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
      {suffix}
    </span>
  );
}

// Custom Tooltip Component matching requirements (Always Dark theme for contrast)
const CustomTooltip = ({ active, payload, label, currency = "₹" }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const baseline = data.baseline;
    const simulated = data.simulated;
    const difference = simulated - baseline;
    const pctChange = baseline > 0 ? (difference / baseline) * 100 : 0;

    const formatCrLakhs = (val) => {
      const absVal = Math.abs(val);
      if (absVal >= 0.1) {
        return `₹${val.toFixed(2)} Cr`;
      } else {
        return `${val < 0 ? "-" : ""}₹${(absVal * 100).toFixed(0)}L`;
      }
    };

    const diffFormatted = formatCrLakhs(difference);
    const pctFormatted = `${pctChange >= 0 ? "+" : ""}${pctChange.toFixed(1)}%`;
    const diffColorClass = difference >= 0 ? "text-emerald-400 font-bold" : "text-rose-500 font-bold";

    return (
      <div className="bg-[#0c1322]/95 backdrop-blur-md border border-[#17253f] rounded-2xl p-4 shadow-2xl text-xs font-semibold pointer-events-none min-w-[200px] text-white">
        <div className="text-slate-400 uppercase tracking-widest text-[10px] font-bold mb-2">Year {label}</div>
        <div className="space-y-1.5 text-slate-200">
          <div className="flex justify-between items-center gap-6">
            <span className="text-slate-400 font-medium">Baseline</span>
            <span className="font-extrabold text-white">₹{baseline.toFixed(2)} Cr</span>
          </div>
          <div className="flex justify-between items-center gap-6">
            <span className="text-slate-400 font-medium">Scenario</span>
            <span className="font-extrabold text-white">₹{simulated.toFixed(2)} Cr</span>
          </div>
          <div className="border-t border-[#17253f] my-1 pt-1.5 flex justify-between items-center gap-6">
            <span className="text-slate-400 font-medium">Difference</span>
            <span className={diffColorClass}>{diffFormatted}</span>
          </div>
          <div className="flex justify-between items-center gap-6">
            <span className="text-slate-400 font-medium">Change</span>
            <span className={diffColorClass}>{pctFormatted}</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

// Custom Floating Label Pill on the latest value of the curves
const RenderFloatingLabel = ({ x, y, value, index, fillColor, totalPoints }) => {
  if (index === totalPoints - 1) {
    return (
      <g className="pointer-events-none">
        <rect
          x={x + 8}
          y={y - 12}
          width={62}
          height={20}
          rx={6}
          fill={fillColor}
        />
        <text
          x={x + 39}
          y={y + 1}
          fill="#ffffff"
          fontSize={9}
          fontWeight="black"
          textAnchor="middle"
        >
          ₹{value.toFixed(1)}Cr
        </text>
      </g>
    );
  }
  return null;
};

export default function SimulatorPage({ userId, currency = "₹", onMenuToggle, healthScore }) {
  const [selectedEvent, setSelectedEvent] = useState("car");
  const [amount, setAmount] = useState(1500000);
  const [months, setMonths] = useState(6);
  const [downpaymentPct, setDownpaymentPct] = useState(20);
  const [loanInterestRate, setLoanInterestRate] = useState(8.5);
  
  // Custom event config states
  const [customName, setCustomName] = useState("Start Startup");
  const [customBehavior, setCustomBehavior] = useState("expense"); // "expense" | "drag" | "income"

  // Database scenarios state
  const [savedScenarios, setSavedScenarios] = useState([]);
  const [saveStatus, setSaveStatus] = useState("");
  
  // Holdings state to calculate real digital twin baseline
  const [holdings, setHoldings] = useState([]);

  // Dataset visibility toggles
  const [showBaseline, setShowBaseline] = useState(true);
  const [showSimulated, setShowSimulated] = useState(true);

  // Reference for chart capture
  const chartCardRef = useRef(null);

  // 1. Fetch user's holdings to calculate baseline
  useEffect(() => {
    if (userId) {
      fetchHoldings(userId).then((data) => {
        if (data && data.length > 0) {
          setHoldings(data);
        }
      });
    }
  }, [userId]);

  // Compute baseline starting parameters based on active portfolio
  const { currentWealth, weightedReturnRate } = useMemo(() => {
    if (holdings.length > 0) {
      let totalWealth = 0;
      let totalWeightedReturn = 0;
      holdings.forEach((h) => {
        totalWealth += h.amount;
        totalWeightedReturn += h.amount * h.growthRate;
      });
      if (totalWealth > 0) {
        return {
          currentWealth: totalWealth,
          weightedReturnRate: totalWeightedReturn / totalWealth,
        };
      }
    }
    // Fallback baseline: 60 Lakhs (0.6 Cr) compounding at 10%
    return {
      currentWealth: 6000000.0,
      weightedReturnRate: 10.0,
    };
  }, [holdings]);

  // Load saved scenarios on mount
  const loadScenarios = () => {
    if (userId) {
      fetchSavedScenarios(userId).then(setSavedScenarios);
    }
  };

  useEffect(() => {
    loadScenarios();
  }, [userId]);

  // Sensible slider adjustments on event changes to improve UX
  useEffect(() => {
    const defaults = {
      car: { amount: 1500000, months: 6, dp: 20, rate: 8.5 },
      house: { amount: 12000000, months: 12, dp: 25, rate: 9.0 },
      edu: { amount: 2500000, months: 9, dp: 10, rate: 7.5 },
      career: { amount: 1200000, months: 6, dp: 0, rate: 0 },
      pivot: { amount: 2000000, months: 12, dp: 0, rate: 0 },
      emergency: { amount: 600000, months: 3, dp: 100, rate: 0 },
      custom: { amount: 1000000, months: 12, dp: 0, rate: 0 }
    };

    const config = defaults[selectedEvent];
    if (config) {
      setAmount(config.amount);
      setMonths(config.months);
      setDownpaymentPct(config.dp);
      setLoanInterestRate(config.rate);
    }
  }, [selectedEvent]);

  // 2. Comprehensive Client-Side Calculation Engine (Instantaneous Slider Updates)
  const { wealthProjectionData, impact, optimizedPaths } = useMemo(() => {
    const currentYear = 2024;
    const numYears = 21; // 2024 to 2044 inclusive
    const eventYear = currentYear + Math.round(months / 12);
    const costLakhs = amount / 100000.0;
    const rate = weightedReturnRate / 100.0;

    // Base savings parameters
    let yearlySavings = 600000; // default ₹6L per year
    const savingsInflation = 0.05; // savings grow 5% annually

    // 2.1 Calculate Baseline Projection
    const baselineProjection = [];
    for (let i = 0; i < numYears; i++) {
      const year = currentYear + i;
      let bWealth = currentWealth;
      
      for (let j = 0; j < i; j++) {
        bWealth = bWealth * (1 + rate) + (yearlySavings * Math.pow(1 + savingsInflation, j));
      }
      baselineProjection.push({
        year,
        baseline: +(bWealth / 10000000.0).toFixed(4),
        savings: yearlySavings * Math.pow(1 + savingsInflation, i)
      });
    }

    // 2.2 Calculate Simulated Projection
    const simulatedProjection = [];
    const downpaymentAmt = amount * (downpaymentPct / 100.0);
    const loanAmt = amount * (1.0 - downpaymentPct / 100.0);
    const loanRate = loanInterestRate / 100.0;

    const calcYearlyEMI = (p, r, n) => {
      if (p <= 0) return 0;
      if (r <= 0) return p / n;
      return p * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    };

    const houseEMI = calcYearlyEMI(loanAmt, loanRate, 15);
    const carEMI = calcYearlyEMI(loanAmt, loanRate, 5);
    const eduEMI = calcYearlyEMI(loanAmt, loanRate, 10);

    for (let i = 0; i < numYears; i++) {
      const year = currentYear + i;
      let simWealth = currentWealth;

      for (let y = 0; y < i; y++) {
        const curY = currentYear + y;
        let savings = yearlySavings * Math.pow(1 + savingsInflation, y);
        let yearRate = rate;

        // Apply events immediately at event Year
        if (curY === eventYear) {
          if (["house", "car", "edu"].includes(selectedEvent)) {
            simWealth -= downpaymentAmt;
          } else if (selectedEvent === "pivot") {
            simWealth -= amount * 0.15; // 15% upfront risk dip
          } else if (selectedEvent === "emergency") {
            simWealth -= amount; // Reallocate cash
          } else if (selectedEvent === "custom") {
            if (customBehavior === "expense") {
              simWealth -= amount; // instant drop
            } else if (customBehavior === "drag") {
              simWealth -= amount * 0.10; // initial fee
            } else if (customBehavior === "income") {
              simWealth -= amount; // initial investment
            }
          }
        }

        // Apply running adjustments after Event Year
        if (curY >= eventYear) {
          const yearsPostEvent = curY - eventYear;

          if (selectedEvent === "house") {
            if (yearsPostEvent < 15) {
              savings = Math.max(0, savings - houseEMI);
            }
            // 5% house appreciation adds back to wealth
            simWealth += amount * 0.05 * Math.pow(1.05, yearsPostEvent);
          } else if (selectedEvent === "car") {
            if (yearsPostEvent < 5) {
              savings = Math.max(0, savings - carEMI);
            }
            // 3% yearly maintenance cost drag
            savings = Math.max(0, savings - amount * 0.03);
            
            // Car depreciates 15% yearly
            if (yearsPostEvent === 0) {
              simWealth += amount;
            } else {
              simWealth -= amount * Math.pow(0.85, yearsPostEvent - 1) * 0.15;
            }
          } else if (selectedEvent === "edu") {
            if (yearsPostEvent < 10) {
              savings = Math.max(0, savings - eduEMI);
            }
            // Salary increase boost (20% of tuition fee added to annual savings)
            savings += amount * 0.20;
          } else if (selectedEvent === "career") {
            // Salary growth rate increases to +8%
            savings = (yearlySavings * Math.pow(1 + savingsInflation, eventYear - currentYear)) * Math.pow(1.08, yearsPostEvent);
          } else if (selectedEvent === "pivot") {
            // Pivot grows entire subsequent wealth at rate + 2.5%
            yearRate = rate + 0.025;
          } else if (selectedEvent === "emergency") {
            // Emergency fund compounds at low 4% yield
            simWealth += amount * Math.pow(1.04, yearsPostEvent);
          } else if (selectedEvent === "custom") {
            if (customBehavior === "drag") {
              savings = Math.max(0, savings - (amount * 0.05)); // 5% annual cost drag
            } else if (customBehavior === "income") {
              savings += amount * 0.15; // 15% annual yield boost
            }
          }
        }

        // Apply transitions before Event Year
        if (curY < eventYear && selectedEvent === "career") {
          savings = savings * 0.75; // 25% salary dip during shift prep
        }

        simWealth = simWealth * (1 + yearRate) + savings;
      }

      simulatedProjection.push({
        year,
        baseline: baselineProjection[i].baseline,
        simulated: Math.max(0.0, +(simWealth / 10000000.0).toFixed(4)),
      });
    }

    // Impact Metric Calculations
    const baselineFinal = baselineProjection[numYears - 1].baseline;
    const simulatedFinal = simulatedProjection[numYears - 1].simulated;
    const corpusChangeCr = simulatedFinal - baselineFinal;
    const lossCr = baselineFinal - simulatedFinal;
    const lossLakhs = +(lossCr * 100.0).toFixed(1);

    let retirementAgeDelta = 0;
    if (lossCr > 0) {
      retirementAgeDelta = Math.min(10, +(lossCr * 1.6).toFixed(1));
    } else {
      retirementAgeDelta = Math.max(-5, +(lossCr * 1.2).toFixed(1));
    }

    let liquidityRisk = "Low";
    if (selectedEvent === "emergency") {
      liquidityRisk = "Very Low";
    } else {
      const pctOfWealth = (amount / currentWealth) * 100;
      if (pctOfWealth > 45 || (downpaymentPct > 75 && amount > 3000000)) {
        liquidityRisk = "High";
      } else if (pctOfWealth > 15 || amount > 1800000) {
        liquidityRisk = "Medium";
      }
    }

    let recoveryTime = "N/A";
    let recovered = false;
    if (["emergency", "house", "edu", "career", "pivot", "custom"].includes(selectedEvent)) {
      for (let i = eventYear - currentYear + 1; i < numYears; i++) {
        if (simulatedProjection[i].simulated >= simulatedProjection[i].baseline) {
          recoveryTime = `${i - (eventYear - currentYear)} Years`;
          recovered = true;
          break;
        }
      }
    }
    if (!recovered) {
      if (lossCr > 0) {
        recoveryTime = `${Math.min(20, +(lossLakhs / 8.5).toFixed(1))} Years`;
      } else {
        recoveryTime = "Instant";
      }
    }

    let qolScore = 50;
    if (selectedEvent === "car") qolScore = Math.min(95, 60 + Math.round(costLakhs / 4));
    else if (selectedEvent === "house") qolScore = Math.min(98, 70 + Math.round(costLakhs / 12));
    else if (selectedEvent === "edu") qolScore = Math.min(95, 65 + Math.round(costLakhs / 6));
    else if (selectedEvent === "career") qolScore = Math.min(90, 55 + Math.round(months / 1.5));
    else if (selectedEvent === "pivot") qolScore = Math.min(92, 50 + Math.round(months / 1.5));
    else if (selectedEvent === "emergency") qolScore = Math.min(88, 75 - Math.round(costLakhs / 15));
    else if (selectedEvent === "custom") {
      qolScore = customBehavior === "income" ? Math.min(95, 65 + Math.round(costLakhs / 8)) : Math.max(20, 75 - Math.round(costLakhs / 10));
    }

    // Dynamic Recommendations
    const pathsList = [];

    // Recommendation 1: Delay purchase by 12 months
    const delayedYear = eventYear + 1;
    let delayedSimWealth = currentWealth;
    for (let y = 0; y < numYears - 1; y++) {
      const curY = currentYear + y;
      let savings = yearlySavings * Math.pow(1 + savingsInflation, y);
      let yearRate = rate;

      if (curY === delayedYear) {
        if (["house", "car", "edu"].includes(selectedEvent)) {
          delayedSimWealth -= downpaymentAmt;
        } else if (selectedEvent === "pivot") {
          delayedSimWealth -= amount * 0.15;
        } else if (selectedEvent === "emergency") {
          delayedSimWealth -= amount;
        } else if (selectedEvent === "custom") {
          if (customBehavior === "expense" || customBehavior === "income") {
            delayedSimWealth -= amount;
          } else {
            delayedSimWealth -= amount * 0.10;
          }
        }
      }

      if (curY >= delayedYear) {
        const yearsPostEvent = curY - delayedYear;
        if (selectedEvent === "house") {
          if (yearsPostEvent < 15) savings = Math.max(0, savings - houseEMI);
          delayedSimWealth += amount * 0.05 * Math.pow(1.05, yearsPostEvent);
        } else if (selectedEvent === "car") {
          if (yearsPostEvent < 5) savings = Math.max(0, savings - carEMI);
          savings = Math.max(0, savings - amount * 0.03);
          if (yearsPostEvent === 0) delayedSimWealth += amount;
          else delayedSimWealth -= amount * Math.pow(0.85, yearsPostEvent - 1) * 0.15;
        } else if (selectedEvent === "edu") {
          if (yearsPostEvent < 10) savings = Math.max(0, savings - eduEMI);
          savings += amount * 0.20;
        } else if (selectedEvent === "career") {
          savings = (yearlySavings * Math.pow(1 + savingsInflation, delayedYear - currentYear)) * Math.pow(1.08, yearsPostEvent);
        } else if (selectedEvent === "pivot") {
          yearRate = rate + 0.025;
        } else if (selectedEvent === "emergency") {
          delayedSimWealth += amount * Math.pow(1.04, yearsPostEvent);
        } else if (selectedEvent === "custom") {
          if (customBehavior === "drag") {
            savings = Math.max(0, savings - (amount * 0.05));
          } else if (customBehavior === "income") {
            savings += amount * 0.15;
          }
        }
      }

      if (curY < delayedYear && selectedEvent === "career") {
        savings = savings * 0.75;
      }
      delayedSimWealth = delayedSimWealth * (1 + yearRate) + savings;
    }
    const delayedFinalCr = delayedSimWealth / 10000000.0;
    const delayedRecoveredLakhs = +((delayedFinalCr - simulatedFinal) * 100.0).toFixed(1);

    if (delayedRecoveredLakhs > 0.5) {
      pathsList.push({
        title: "Delay purchase by 12 months",
        desc: `Recovers ₹${delayedRecoveredLakhs}L of projected loss by allowing your core capital to compound longer.`,
        icon: "TrendingUp",
      });
    }

    // Recommendation 2: Increase Downpayment by 10%
    if (downpaymentPct <= 90 && ["house", "car", "edu"].includes(selectedEvent)) {
      const nextDPPct = downpaymentPct + 10;
      const nextDPAmt = amount * (nextDPPct / 100.0);
      const nextLoanAmt = amount * (1.0 - nextDPPct / 100.0);
      const nextEMI = calcYearlyEMI(nextLoanAmt, loanRate, selectedEvent === "house" ? 15 : selectedEvent === "car" ? 5 : 10);
      
      let dpSimWealth = currentWealth;
      for (let y = 0; y < numYears - 1; y++) {
        const curY = currentYear + y;
        let savings = yearlySavings * Math.pow(1 + savingsInflation, y);
        let yearRate = rate;

        if (curY === eventYear) {
          dpSimWealth -= nextDPAmt;
        }
        if (curY >= eventYear) {
          const yearsPostEvent = curY - eventYear;
          if (selectedEvent === "house") {
            if (yearsPostEvent < 15) savings = Math.max(0, savings - nextEMI);
            dpSimWealth += amount * 0.05 * Math.pow(1.05, yearsPostEvent);
          } else if (selectedEvent === "car") {
            if (yearsPostEvent < 5) savings = Math.max(0, savings - nextEMI);
            savings = Math.max(0, savings - amount * 0.03);
            if (yearsPostEvent === 0) dpSimWealth += amount;
            else dpSimWealth -= amount * Math.pow(0.85, yearsPostEvent - 1) * 0.15;
          } else if (selectedEvent === "edu") {
            if (yearsPostEvent < 10) savings = Math.max(0, savings - nextEMI);
            savings += amount * 0.20;
          }
        }
        dpSimWealth = dpSimWealth * (1 + yearRate) + savings;
      }
      const dpFinalCr = dpSimWealth / 10000000.0;
      const dpRecoveredLakhs = +((dpFinalCr - simulatedFinal) * 100.0).toFixed(1);

      if (dpRecoveredLakhs > 0.5) {
        pathsList.push({
          title: `Increase downpayment to ${nextDPPct}%`,
          desc: `Recovers ₹${dpRecoveredLakhs}L in debt servicing drag. Reduces compounding interest expenses.`,
          icon: "PiggyBank",
        });
      }
    }

    // Recommendation 3: Reduce loan tenure
    if (["house", "car"].includes(selectedEvent) && downpaymentPct < 100) {
      const shortTenure = selectedEvent === "house" ? 10 : 3;
      const shortEMI = calcYearlyEMI(loanAmt, loanRate, shortTenure);

      let tenureSimWealth = currentWealth;
      for (let y = 0; y < numYears - 1; y++) {
        const curY = currentYear + y;
        let savings = yearlySavings * Math.pow(1 + savingsInflation, y);
        let yearRate = rate;

        if (curY === eventYear) {
          tenureSimWealth -= downpaymentAmt;
        }
        if (curY >= eventYear) {
          const yearsPostEvent = curY - eventYear;
          if (selectedEvent === "house") {
            if (yearsPostEvent < shortTenure) savings = Math.max(0, savings - shortEMI);
            tenureSimWealth += amount * 0.05 * Math.pow(1.05, yearsPostEvent);
          } else if (selectedEvent === "car") {
            if (yearsPostEvent < shortTenure) savings = Math.max(0, savings - shortEMI);
            savings = Math.max(0, savings - amount * 0.03);
            if (yearsPostEvent === 0) tenureSimWealth += amount;
            else tenureSimWealth -= amount * Math.pow(0.85, yearsPostEvent - 1) * 0.15;
          }
        }
        tenureSimWealth = tenureSimWealth * (1 + yearRate) + savings;
      }
      const tenureFinalCr = tenureSimWealth / 10000000.0;
      const tenureRecoveredLakhs = +((tenureFinalCr - simulatedFinal) * 100.0).toFixed(1);

      if (tenureRecoveredLakhs > 0.5) {
        pathsList.push({
          title: `Reduce loan tenure to ${shortTenure} years`,
          desc: `Recovers ₹${tenureRecoveredLakhs}L by minimizing total bank interest payables.`,
          icon: "Calendar",
        });
      }
    }

    // Recommendation 4: Increase monthly SIP
    let sipSum = 0;
    for (let y = 0; y < numYears - 1; y++) {
      sipSum = sipSum * (1 + rate) + 120000; // Extra ₹10k/mo = ₹1.2L/year
    }
    const sipSumLakhs = +(sipSum / 100000.0).toFixed(1);
    pathsList.push({
      title: "Increase SIP by ₹10,000 / month",
      desc: `Offsets scenario drag entirely by injecting an extra ₹${sipSumLakhs}L into compounding investments.`,
      icon: "Coins",
    });

    if (selectedEvent === "edu") {
      pathsList.push({
        title: "Postpone education by 6 months",
        desc: `Earn ₹${+(costLakhs * 0.15).toFixed(1)}L extra in core income prior to taking tuition debt.`,
        icon: "GraduationCap",
      });
    }

    return {
      wealthProjectionData: simulatedProjection,
      impact: {
        lossAmountLakhs: Math.abs(lossLakhs),
        isPositive: corpusChangeCr >= 0,
        corpusChangeCr: Math.abs(corpusChangeCr),
        retirementAgeDeltaYears: retirementAgeDelta,
        liquidityRisk,
        timeToRecoveryYears: recoveryTime,
        qualityOfLifeScore: qolScore
      },
      optimizedPaths: pathsList.slice(0, 3)
    };
  }, [months, amount, downpaymentPct, loanInterestRate, selectedEvent, currentWealth, weightedReturnRate, customBehavior]);

  // 3. PNG Image Export
  const handleDownloadPNG = async () => {
    if (!chartCardRef.current) return;
    
    const toastId = toast.loading("Preparing high-resolution PNG chart...");
    try {
      const canvas = await html2canvas(chartCardRef.current, {
        scale: 2.5,
        backgroundColor: "#050b14",
        logging: false,
        useCORS: true,
        onclone: (clonedDoc) => {
          const actionRow = clonedDoc.querySelector("#chart-actions-row");
          if (actionRow) actionRow.style.display = "none";
        }
      });
      
      const link = document.createElement("a");
      link.href = canvas.toDataURL("image/png");
      link.download = `WhatIf-Simulator-${selectedEvent}-${new Date().toISOString().slice(0, 10)}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success("Chart exported as PNG!", { id: toastId });
    } catch (e) {
      console.error(e);
      toast.error("Failed to generate PNG chart.", { id: toastId });
    }
  };

  // 4. CSV Dataset Export
  const handleExportCSV = () => {
    try {
      const rows = [
        ["Year", "Baseline Wealth (Cr)", "Scenario Wealth (Cr)", "Difference (Cr)", "Percentage Change"]
      ];

      wealthProjectionData.forEach((d) => {
        const diff = d.simulated - d.baseline;
        const pct = d.baseline > 0 ? (diff / d.baseline) * 100 : 0;
        rows.push([
          d.year,
          d.baseline.toFixed(4),
          d.simulated.toFixed(4),
          diff.toFixed(4),
          `${pct.toFixed(1)}%`
        ]);
      });

      const csvContent = "data:text/csv;charset=utf-8,"
        + rows.map(e => e.map(val => `"${val}"`).join(",")).join("\n");
      const encodedUri = encodeURI(csvContent);
      
      const link = document.createElement("a");
      link.href = encodedUri;
      link.download = `WhatIf-Simulation-${selectedEvent}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success("CSV file downloaded!");
    } catch (e) {
      console.error(e);
      toast.error("Failed to compile CSV.");
    }
  };

  // 5. MongoDB Scenario Actions
  const handleSaveScenario = () => {
    if (!userId) return;
    const labelToSave = selectedEvent === "custom" ? customName : (lifeEvents.find(e => e.key === selectedEvent)?.label || "Life Event");
    const newScenario = {
      eventKey: selectedEvent,
      label: labelToSave,
      amount: amount,
      months: months
    };
    saveSimulationScenario(userId, newScenario).then(() => {
      loadScenarios();
      setSaveStatus("Scenario saved successfully!");
      toast.success("Scenario saved to your profile!");
      setTimeout(() => setSaveStatus(""), 3000);
      window.dispatchEvent(new Event("fintwin_scenarios_changed"));
    });
  };

  const handleDeleteScenario = (e, scenarioId) => {
    e.stopPropagation();
    if (!userId) return;
    deleteSimulationScenario(userId, scenarioId).then(() => {
      loadScenarios();
      setSaveStatus("Scenario deleted");
      toast.success("Scenario removed.");
      setTimeout(() => setSaveStatus(""), 3000);
      window.dispatchEvent(new Event("fintwin_scenarios_changed"));
    });
  };

  const handleLoadScenario = (scenario) => {
    if (scenario.eventKey === "custom") {
      setCustomName(scenario.label);
    }
    setSelectedEvent(scenario.eventKey);
    setAmount(scenario.amount);
    setMonths(scenario.months);
    toast.success(`Loaded saved "${scenario.label}" config!`);
  };

  // Calculate coordinates of maximum gap for ReferenceLine
  const maxGap = useMemo(() => {
    let maxDiff = -1;
    let maxYear = 2024;
    let baselineVal = 0;
    let simulatedVal = 0;
    wealthProjectionData.forEach((d) => {
      const diff = Math.abs(d.baseline - d.simulated);
      if (diff > maxDiff) {
        maxDiff = diff;
        maxYear = d.year;
        baselineVal = d.baseline;
        simulatedVal = d.simulated;
      }
    });
    return { year: maxYear, diff: maxDiff, baseline: baselineVal, simulated: simulatedVal };
  }, [wealthProjectionData]);

  // Extract last year statistics
  const lastIndex = wealthProjectionData.length - 1;
  const baselineFinal = lastIndex >= 0 ? wealthProjectionData[lastIndex].baseline : 0;
  const simulatedFinal = lastIndex >= 0 ? wealthProjectionData[lastIndex].simulated : 0;
  const corpusChangeVal = simulatedFinal - baselineFinal;

  return (
    <>
      <Header title="What-If Simulator" onMenuToggle={onMenuToggle} healthScore={healthScore} />
      <main className="flex-1 p-6 md:p-10 w-full overflow-y-auto space-y-8 bg-[#050b14] text-white animate-fade-in min-h-screen">
        
        {/* Floating Save Alerts */}
        <AnimatePresence>
          {saveStatus && (
            <motion.div 
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.9 }}
              className="fixed bottom-6 right-6 z-50 bg-indigo-600 text-white px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 text-xs font-black"
            >
              <Sparkles size={16} className="animate-spin" />
              {saveStatus}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <h2 className="text-3xl md:text-5xl font-black tracking-tight mb-2 text-white">
              What-If Simulator
            </h2>
            <p className="max-w-2xl text-sm text-slate-400">
              Compound simulated lifetime milestones dynamically on top of your personalized twin baseline in real time.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* CONFIGURATION COLUMN */}
          <div className="col-span-1 lg:col-span-4 space-y-6">
            <div className="rounded-3xl border border-[#17253f] p-6 bg-[#0c1322] shadow-2xl">
              
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-[#17253f] pb-4 mb-5 flex items-center gap-2">
                <SlidersHorizontal size={14} className="text-indigo-400" />
                Scenario Config
              </h3>

              <div className="space-y-6">
                
                {/* Event Selector Grid */}
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2.5">
                    Life Event Type
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {lifeEvents.map((ev) => {
                      const Icon = ev.icon;
                      const active = selectedEvent === ev.key;
                      return (
                        <button
                          key={ev.key}
                          onClick={() => setSelectedEvent(ev.key)}
                          className="p-3 border rounded-2xl text-center text-xs flex flex-col items-center gap-1.5 transition-all duration-300 font-bold cursor-pointer"
                          style={
                            active
                              ? { background: "#131f37", borderColor: "#6366F1", color: "#818cf8" }
                              : { background: "#080e1a", borderColor: "#17253f", color: "#94a3b8" }
                          }
                        >
                          <Icon size={18} className={active ? "text-indigo-400" : "text-slate-500"} />
                          {ev.label}
                        </button>
                      );
                    })}
                    {/* Dynamic Custom Event Trigger tab */}
                    {(() => {
                      const active = selectedEvent === "custom";
                      return (
                        <button
                          onClick={() => setSelectedEvent("custom")}
                          className="p-3 border rounded-2xl text-center text-xs flex flex-col items-center gap-1.5 transition-all duration-300 font-bold cursor-pointer"
                          style={
                            active
                              ? { background: "#131f37", borderColor: "#6366F1", color: "#818cf8" }
                              : { background: "#080e1a", borderColor: "#17253f", color: "#94a3b8" }
                          }
                        >
                          <Plus size={18} className={active ? "text-indigo-400" : "text-slate-500"} />
                          {customName || "Custom Event"}
                        </button>
                      );
                    })()}
                  </div>
                </div>

                {/* Secondary Configuration block when custom event is selected */}
                <AnimatePresence>
                  {selectedEvent === "custom" && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="border border-[#17253f] rounded-2xl p-4 bg-[#080e1a]/50 space-y-4 overflow-hidden"
                    >
                      <div>
                        <label className="block text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1.5">
                          Custom Event Label
                        </label>
                        <input
                          type="text"
                          value={customName}
                          onChange={(e) => setCustomName(e.target.value)}
                          placeholder="e.g. Start Startup"
                          className="w-full px-3 py-2 border border-[#17253f] bg-[#080e1a] rounded-xl outline-none text-xs font-semibold text-white focus:border-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">
                          Milestone Behavior
                        </label>
                        <div className="grid grid-cols-3 gap-1">
                          {[
                            { key: "expense", label: "Cost", desc: "Upfront Cost" },
                            { key: "drag", label: "Drag", desc: "Ongoing Drag" },
                            { key: "income", label: "Yield", desc: "Salary Yield" },
                          ].map((t) => (
                            <button
                              key={t.key}
                              type="button"
                              onClick={() => setCustomBehavior(t.key)}
                              className={`p-2 border rounded-xl text-center text-[10px] font-bold cursor-pointer transition-all duration-300 ${
                                customBehavior === t.key
                                  ? "bg-[#131f37] border-indigo-500 text-indigo-400"
                                  : "bg-[#080e1a] border-[#17253f] text-slate-400 hover:border-slate-700"
                              }`}
                            >
                              {t.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Estimate Amount Input Slider */}
                <div>
                  <div className="flex justify-between items-center text-xs mb-2">
                    <span className="font-bold text-slate-400 uppercase tracking-widest">
                      Estimated Cost
                    </span>
                    <span className="font-extrabold text-indigo-400">
                      {formatCurrency(amount, currency)}
                    </span>
                  </div>
                  <div className="relative group mb-3">
                    <span className="absolute left-4 top-3.5 font-black text-slate-500">
                      {currency}
                    </span>
                    <input
                      className="w-full pl-8 pr-4 py-3 border border-[#17253f] bg-[#080e1a] rounded-2xl outline-none text-sm font-extrabold transition-all focus:border-indigo-500 text-white"
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(Math.max(0, Number(e.target.value)))}
                    />
                  </div>
                  <input
                    type="range"
                    min={selectedEvent === "car" ? 100000 : selectedEvent === "house" ? 1000000 : 50000}
                    max={selectedEvent === "house" ? 50000000 : selectedEvent === "car" ? 10000000 : 10000000}
                    step={selectedEvent === "house" ? 500000 : 50000}
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    className="w-full h-1.5 bg-[#080e1a] rounded-lg appearance-none cursor-pointer accent-indigo-500"
                  />
                </div>

                {/* Target Timeline Slider */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-400 uppercase tracking-widest">
                      Target Timeline
                    </span>
                    <span className="font-extrabold text-indigo-400">
                      In {months} Months ({Math.round(months/12 * 10)/10} Yrs)
                    </span>
                  </div>
                  <input
                    className="w-full h-1.5 bg-[#080e1a] rounded-lg appearance-none cursor-pointer accent-indigo-500"
                    max="120"
                    min="1"
                    type="range"
                    value={months}
                    onChange={(e) => setMonths(Number(e.target.value))}
                  />
                  <div className="flex justify-between text-[10px] font-black text-slate-500">
                    <span>Immediate</span>
                    <span>5 Years</span>
                    <span>10 Years</span>
                  </div>
                </div>

                {/* Loan & Debt Config Panel */}
                {["house", "car", "edu"].includes(selectedEvent) && (
                  <div className="border border-[#17253f] rounded-2xl p-4 bg-[#080e1a]/80 space-y-4">
                    
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <label className="font-bold text-slate-400 uppercase tracking-widest">
                          Downpayment (%)
                        </label>
                        <span className="font-extrabold text-indigo-400">
                          {downpaymentPct}% Cash
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="5"
                        value={downpaymentPct}
                        onChange={(e) => setDownpaymentPct(Number(e.target.value))}
                        className="w-full h-1.5 bg-[#080e1a] rounded-lg appearance-none cursor-pointer accent-indigo-500"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <label className="font-bold text-slate-400 uppercase tracking-widest">
                          Loan Rate (%)
                        </label>
                        <span className="font-extrabold text-indigo-400">
                          {loanInterestRate}% Interest
                        </span>
                      </div>
                      <input
                        type="range"
                        min="4"
                        max="18"
                        step="0.1"
                        value={loanInterestRate}
                        onChange={(e) => setLoanInterestRate(Number(e.target.value))}
                        className="w-full h-1.5 bg-[#080e1a] rounded-lg appearance-none cursor-pointer accent-indigo-500"
                      />
                    </div>

                    <div className="h-2 flex rounded-full overflow-hidden mt-3 bg-slate-800">
                      {downpaymentPct > 0 && <div style={{ width: `${downpaymentPct}%`, background: "#6366F1" }} />}
                      {downpaymentPct < 100 && <div style={{ width: `${100 - downpaymentPct}%`, background: "#EF4444" }} />}
                    </div>
                    
                    <div className="flex justify-between text-[10px] font-black">
                      <span className="text-indigo-400">
                        {formatCurrency(amount * downpaymentPct / 100, currency)} Down
                      </span>
                      <span className="text-rose-450">
                        {formatCurrency(amount * (100 - downpaymentPct) / 100, currency)} Loan
                      </span>
                    </div>
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={handleSaveScenario}
                    className="w-full text-white font-extrabold text-xs py-3.5 rounded-2xl transition-all shadow-lg active:scale-98 flex justify-center items-center gap-2 cursor-pointer bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400"
                  >
                    <Save size={14} /> SAVE TO PROFILE
                  </button>
                </div>
              </div>
            </div>

            {/* SAVED SCENARIOS SIDEBAR */}
            {savedScenarios.length > 0 && (
              <div className="rounded-3xl border border-[#17253f] p-6 bg-[#0c1322]">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">
                  Saved Scenarios ({savedScenarios.length})
                </h4>
                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                  {savedScenarios.map((sc) => (
                    <div
                      key={sc.id}
                      onClick={() => handleLoadScenario(sc)}
                      className="p-3 border border-[#17253f] rounded-2xl flex items-center justify-between text-xs cursor-pointer hover:bg-[#131f37] hover:border-indigo-900 transition-all bg-[#080e1a] text-white"
                    >
                      <div className="flex-1">
                        <span className="font-extrabold block">
                          {sc.label}
                        </span>
                        <div className="text-[10px] text-slate-500 font-semibold mt-0.5">
                          {formatCurrency(sc.amount, currency)} • In {sc.months} Mo
                        </div>
                      </div>
                      <button
                        onClick={(e) => handleDeleteScenario(e, sc.id)}
                        className="p-1.5 hover:bg-rose-950/30 text-rose-500 rounded-xl transition-all cursor-pointer"
                      >
                        <Trash size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* DYNAMIC RESULTS COLUMN */}
          <div className="col-span-1 lg:col-span-8 space-y-6 flex flex-col">
            
            {/* STATS HEADER */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              
              <div className="p-5 rounded-3xl border border-[#17253f] bg-[#0c1322] shadow-md">
                <div className="text-[9px] font-extrabold uppercase tracking-widest text-indigo-400 mb-1 flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-indigo-500" />
                  Baseline Wealth (2044)
                </div>
                <div className="text-3xl font-black text-white">
                  <AnimatedCounter value={baselineFinal} prefix="₹" suffix=" Cr" decimals={2} />
                </div>
              </div>

              <div className="p-5 rounded-3xl border border-[#17253f] bg-[#0c1322] shadow-md">
                <div className="text-[9px] font-extrabold uppercase tracking-widest text-rose-400 mb-1 flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-rose-500 border border-dashed" />
                  Simulated Wealth (2044)
                </div>
                <div className="text-3xl font-black text-white">
                  <AnimatedCounter value={simulatedFinal} prefix="₹" suffix=" Cr" decimals={2} />
                </div>
              </div>

              <div className={`p-5 rounded-3xl border shadow-md bg-[#0c1322] ${
                corpusChangeVal >= 0 ? "border-emerald-950/50" : "border-amber-950/50"
              }`}>
                <div className={`text-[9px] font-extrabold uppercase tracking-widest mb-1 flex items-center gap-1.5 ${
                  corpusChangeVal >= 0 ? "text-emerald-400" : "text-amber-400"
                }`}>
                  <TrendingUp size={12} className={corpusChangeVal < 0 ? "rotate-180" : ""} />
                  Net Projected Difference
                </div>
                <div className={`text-3xl font-black ${
                  corpusChangeVal >= 0 ? "text-emerald-400" : "text-amber-400"
                }`}>
                  {corpusChangeVal >= 0 ? "+" : "-"}
                  <AnimatedCounter value={Math.abs(corpusChangeVal)} prefix="₹" suffix=" Cr" decimals={2} />
                </div>
              </div>
            </div>

            {/* CHART CONTAINER CARD */}
            <motion.div
              ref={chartCardRef}
              whileHover={{ scale: 1.002 }}
              transition={{ duration: 0.3 }}
              className="rounded-3xl border border-[#17253f] shadow-2xl p-6 md:p-8 flex-1 flex flex-col bg-[#0c1322]"
            >
              <div id="chart-header-row" className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                  <h3 className="text-xl font-black text-white">
                    20-Year Wealth Projection
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">Custom digital twin wealth curve</p>
                </div>
                
                {/* TOOLBAR ACTIONS */}
                <div id="chart-actions-row" className="flex flex-wrap items-center gap-3 text-xs font-extrabold">
                  {/* Dataset toggles */}
                  <div className="flex bg-[#080e1a] rounded-xl p-0.5 border border-[#17253f]">
                    <button
                      onClick={() => setShowBaseline(!showBaseline)}
                      className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                        showBaseline 
                          ? "bg-[#131f37] text-indigo-400 shadow-sm" 
                          : "text-slate-500 hover:text-slate-350"
                      }`}
                    >
                      {showBaseline ? <Eye size={12} /> : <EyeOff size={12} />}
                      Baseline
                    </button>
                    <button
                      onClick={() => setShowSimulated(!showSimulated)}
                      className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                        showSimulated 
                          ? "bg-[#131f37] text-rose-450 shadow-sm" 
                          : "text-slate-500 hover:text-slate-350"
                      }`}
                    >
                      {showSimulated ? <Eye size={12} /> : <EyeOff size={12} />}
                      Simulated
                    </button>
                  </div>

                  {/* Exports */}
                  <button 
                    onClick={handleExportCSV}
                    title="Export data as CSV"
                    className="p-2 border border-[#17253f] bg-[#080e1a] rounded-xl hover:bg-[#131f37] text-slate-300 transition-all cursor-pointer"
                  >
                    <FileText size={14} />
                  </button>
                  <button 
                    onClick={handleDownloadPNG}
                    title="Export chart as PNG"
                    className="p-2 border border-[#17253f] bg-[#080e1a] rounded-xl hover:bg-[#131f37] text-slate-300 transition-all cursor-pointer"
                  >
                    <Download size={14} />
                  </button>
                </div>
              </div>

              {/* RECHARTS COMPOSED CHART */}
              <div className="flex-1 min-h-[340px] w-full relative">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={wealthProjectionData} margin={{ top: 15, right: 35, left: -20, bottom: 5 }}>
                    <defs>
                      <linearGradient id="baselineGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6366F1" stopOpacity={0.20} />
                        <stop offset="100%" stopColor="#6366F1" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="simGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#EF4444" stopOpacity={0.20} />
                        <stop offset="100%" stopColor="#EF4444" stopOpacity={0.0} />
                      </linearGradient>

                      <filter id="shadow-baseline" height="200%" width="200%">
                        <feDropShadow dx="0" dy="8" stdDeviation="4" floodColor="#6366F1" floodOpacity={0.2} />
                      </filter>
                      <filter id="shadow-simulated" height="200%" width="200%">
                        <feDropShadow dx="0" dy="8" stdDeviation="4" floodColor="#EF4444" floodOpacity={0.2} />
                      </filter>
                    </defs>

                    <CartesianGrid stroke="#17253f" vertical={false} />
                    <XAxis 
                      dataKey="year" 
                      tick={{ fontSize: 10, fill: "#64748b", fontWeight: "bold" }} 
                      tickLine={false} 
                      axisLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: "#64748b", fontWeight: "bold" }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => `₹${v}Cr`}
                    />
                    
                    <Tooltip content={<CustomTooltip currency={currency} />} />

                    {/* Maximum Gap Highlights */}
                    {showBaseline && showSimulated && maxGap.diff > 0.05 && (
                      <ReferenceLine
                        x={maxGap.year}
                        stroke="#f59e0b"
                        strokeDasharray="4 4"
                        strokeWidth={2}
                        label={{
                          value: `Max Gap: ₹${(maxGap.diff * 100).toFixed(0)}L`,
                          position: "top",
                          fill: "#f59e0b",
                          fontSize: 9,
                          fontWeight: "black",
                        }}
                      />
                    )}

                    {/* Gradient Fills */}
                    {showBaseline && (
                      <Area
                        type="monotone"
                        dataKey="baseline"
                        stroke="none"
                        fill="url(#baselineGrad)"
                        isAnimationActive={true}
                        animationDuration={800}
                        animationEasing="ease-in-out"
                      />
                    )}
                    {showSimulated && (
                      <Area
                        type="monotone"
                        dataKey="simulated"
                        stroke="none"
                        fill="url(#simGrad)"
                        isAnimationActive={true}
                        animationDuration={800}
                        animationEasing="ease-in-out"
                      />
                    )}

                    {/* Lines */}
                    {showBaseline && (
                      <Line
                        type="monotone"
                        dataKey="baseline"
                        stroke="#6366F1"
                        strokeWidth={3.5}
                        strokeLinecap="round"
                        dot={false}
                        filter="url(#shadow-baseline)"
                        isAnimationActive={true}
                        animationDuration={800}
                        animationEasing="ease-in-out"
                        label={({ x, y, value, index }) => (
                          <RenderFloatingLabel x={x} y={y} value={value} index={index} fillColor="#6366F1" totalPoints={wealthProjectionData.length} />
                        )}
                      />
                    )}
                    {showSimulated && (
                      <Line
                        type="monotone"
                        dataKey="simulated"
                        stroke="#EF4444"
                        strokeWidth={3.5}
                        strokeLinecap="round"
                        strokeDasharray="5 5"
                        dot={false}
                        filter="url(#shadow-simulated)"
                        isAnimationActive={true}
                        animationDuration={800}
                        animationEasing="ease-in-out"
                        label={({ x, y, value, index }) => (
                          <RenderFloatingLabel x={x} y={y} value={value} index={index} fillColor="#EF4444" totalPoints={wealthProjectionData.length} />
                        )}
                      />
                    )}
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </motion.div>

            {/* IMPACT CARDS AND RECOMENDATIONS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Predicted Impact Card */}
              <div className="rounded-3xl border border-[#17253f] p-6 relative overflow-hidden bg-[#0c1322] flex flex-col justify-between shadow-2xl">
                <div className="absolute top-1/2 right-4 w-40 h-40 rounded-full bg-indigo-500/5 filter blur-3xl pointer-events-none" />
                
                <div>
                  <h4 className="text-[10px] font-black uppercase tracking-widest mb-3 flex items-center gap-1.5 text-indigo-400">
                    <Sparkles size={14} className="animate-pulse" /> Predicted Twin Impact
                  </h4>
                  <p className="text-sm leading-relaxed text-slate-300">
                    {selectedEvent === "emergency" ? (
                      <>
                        Reallocating liquidity into an emergency fund reduces asset growth rate, creating a safe drag of{" "}
                        <span className="font-extrabold text-amber-500">₹{impact.lossAmountLakhs} Lakh</span> but boosting security.
                      </>
                    ) : (
                      <>
                        This milestone yields a lifetime net wealth shift of{" "}
                        <span className={`font-black ${impact.isPositive ? "text-emerald-400" : "text-rose-500"}`}>
                          ₹{impact.lossAmountLakhs} Lakh
                        </span>{" "}
                        and alters your target financial freedom points.
                      </>
                    )}
                  </p>
                </div>

                <div className="mt-6 grid grid-cols-3 gap-2 border-t pt-4 border-[#17253f]">
                  <div className="p-2.5 rounded-xl border border-[#17253f] text-center bg-[#080e1a]/85">
                    <div className="text-[9px] font-black text-slate-500 uppercase tracking-wider leading-none mb-1.5 h-6 flex items-center justify-center">
                      Retirement Age
                    </div>
                    <div className={`text-base font-black ${impact.retirementAgeDeltaYears > 0 ? "text-rose-500" : "text-emerald-400"}`}>
                      {60 + Math.round(impact.retirementAgeDeltaYears)}y
                      <span className="text-[9px] block font-bold mt-0.5">
                        {impact.retirementAgeDeltaYears >= 0 ? `+${impact.retirementAgeDeltaYears.toFixed(1)}y` : `${impact.retirementAgeDeltaYears.toFixed(1)}y`}
                      </span>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl border border-[#17253f] text-center bg-[#080e1a]/85">
                    <div className="text-[9px] font-black text-slate-500 uppercase tracking-wider leading-none mb-1.5 h-6 flex items-center justify-center">
                      Liquidity Risk
                    </div>
                    <div className={`text-sm font-black pt-1 ${
                      impact.liquidityRisk === "High" ? "text-rose-500" : impact.liquidityRisk === "Medium" ? "text-amber-500" : "text-emerald-400"
                    }`}>
                      {impact.liquidityRisk}
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl border border-[#17253f] text-center bg-[#080e1a]/85">
                    <div className="text-[9px] font-black text-slate-500 uppercase tracking-wider leading-none mb-1.5 h-6 flex items-center justify-center">
                      Recovery Time
                    </div>
                    <div className="text-sm font-black text-emerald-400 pt-1">
                      {impact.timeToRecoveryYears}
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between text-[10px] font-bold text-slate-500 bg-[#080e1a]/60 p-2.5 rounded-xl">
                  <span>Quality of Life Rating:</span>
                  <span className="text-white font-extrabold text-xs">
                    {impact.qualityOfLifeScore} / 100
                  </span>
                </div>
              </div>

              {/* Optimized Path Recommendations */}
              <div className="space-y-3 flex flex-col justify-between">
                <h4 className="text-xs font-black uppercase tracking-widest text-slate-500 pl-1">
                  Optimized Action Recommendations
                </h4>
                
                {optimizedPaths.map((path, idx) => {
                  const IconComp = iconMap[path.icon] || TrendingUp;
                  return (
                    <OptimizedPath 
                      key={idx} 
                      title={path.title} 
                      desc={path.desc} 
                      icon={IconComp} 
                      theme="dark"
                    />
                  );
                })}
              </div>

            </div>
          </div>
        </div>
      </main>
    </>
  );
}
