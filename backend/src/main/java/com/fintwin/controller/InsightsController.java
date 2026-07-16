package com.fintwin.controller;

import com.fintwin.model.Insight;
import com.fintwin.model.RetirementProfile;
import com.fintwin.model.SimulationScenario;
import com.fintwin.model.UserSettings;
import com.fintwin.repository.RetirementProfileRepository;
import com.fintwin.repository.SimulationScenarioRepository;
import com.fintwin.repository.UserSettingsRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/insights")
@CrossOrigin(origins = "*")
public class InsightsController {

    @Autowired
    private RetirementProfileRepository retirementProfileRepository;

    @Autowired
    private UserSettingsRepository userSettingsRepository;

    @Autowired
    private SimulationScenarioRepository simulationScenarioRepository;

    @GetMapping
    public List<Insight> getInsights(@RequestParam String userId) {
        List<Insight> insights = new ArrayList<>();

        // Load user data or use defaults
        RetirementProfile profile = retirementProfileRepository.findByUserId(userId)
                .orElseGet(() -> new RetirementProfile(null, userId, 0.0, 0.0, 0.06, 0.08));

        UserSettings settings = userSettingsRepository.findByUserId(userId)
                .orElseGet(() -> new UserSettings(null, userId, "\u20B9", 60, 30, 0.0, 0.0, 0.0, 0.0));

        List<SimulationScenario> scenarios = simulationScenarioRepository.findByUserId(userId);

        // 1. Safe Withdrawal Rate (SWR) check
        if (profile.getStartingCorpus() <= 0.0 || profile.getStartingWithdrawal() <= 0.0) {
            insights.add(new Insight(
                    "Setup Retirement Targets",
                    "Please configure your retirement starting corpus and withdrawal needs to analyze safe withdrawal rate sustainability.",
                    "info",
                    "No Data",
                    "Retirement",
                    "Go to the Retirement Planning tab and set your targets."
            ));
        } else {
            double withdrawalRate = (profile.getStartingWithdrawal() / profile.getStartingCorpus()) * 100.0;
            // Simple formula: equity allocation scales SWR from 2.5% to 4.5%
            double safeWithdrawalRate = ((settings.getEquityAllocation() * 0.04 / 65.0) + 0.015) * 100.0;
            
            // Round values to 2 decimal places
            withdrawalRate = Math.round(withdrawalRate * 100.0) / 100.0;
            safeWithdrawalRate = Math.round(safeWithdrawalRate * 100.0) / 100.0;

            if (withdrawalRate > safeWithdrawalRate) {
                insights.add(new Insight(
                        "Withdrawal Rate Exceeds Safe Limit",
                        "Your planned annual withdrawal rate of " + withdrawalRate + "% exceeds the recommended Safe Withdrawal Rate (SWR) of " + safeWithdrawalRate + "% based on your portfolio mix.",
                        "warning",
                        "High Risk",
                        "Retirement",
                        "Consider lowering your initial annual withdrawal or increasing starting assets."
                ));
            } else {
                insights.add(new Insight(
                        "Withdrawal Rate is Sustainable",
                        "Your planned annual withdrawal rate of " + withdrawalRate + "% is within the recommended safe limit of " + safeWithdrawalRate + "% for your asset mix.",
                        "success",
                        "Optimal",
                        "Retirement",
                        "Maintain your planned retirement budget."
                ));
            }
        }

        // 2. Asset Allocation Volatility check
        double equity = settings.getEquityAllocation();
        if (settings.getEquityAllocation() == 0.0 && settings.getDebtAllocation() == 0.0 && settings.getGoldAllocation() == 0.0 && settings.getRealEstateAllocation() == 0.0) {
            insights.add(new Insight(
                    "Configure Target Asset Allocation",
                    "You have not configured your target asset allocation yet.",
                    "info",
                    "No Target",
                    "Allocation",
                    "Go to Settings to define your target equity, debt, gold, and real estate allocations."
            ));
        } else if (equity > 75.0) {
            insights.add(new Insight(
                    "High Equity Volatility Buffer",
                    "Your equity exposure is high (" + equity + "%). While this optimizes capital growth, it makes the portfolio highly vulnerable to market drawdowns.",
                    "tip",
                    "High Volatility",
                    "Allocation",
                    "Ensure you hold a 3-year withdrawal runway in safer liquid debt instruments."
            ));
        } else if (equity < 40.0) {
            insights.add(new Insight(
                    "Purchasing Power Risk (Inflation)",
                    "Your equity allocation (" + equity + "%) is low. This exposure might not outpace inflation over the long run, leading to premature corpus exhaustion.",
                    "warning",
                    "High Inflation Risk",
                    "Allocation",
                    "Consider increasing equity exposure to at least 50% if your risk tolerance permits."
            ));
        } else {
            insights.add(new Insight(
                    "Balanced Allocation Mix",
                    "Your portfolio mix is balanced with " + equity + "% equity and " + settings.getDebtAllocation() + "% debt, yielding stable inflation-adjusted growth.",
                    "success",
                    "Optimal",
                    "Allocation",
                    "Continue monitoring quarterly and rebalancing annually."
            ));
        }

        // 3. Saved Simulation Scenarios check
        if (!scenarios.isEmpty()) {
            double totalScenOutlay = 0;
            for (SimulationScenario sc : scenarios) {
                totalScenOutlay += sc.getAmount();
            }
            double outlayInLakhs = totalScenOutlay / 100000.0;
            int ageDelta = (int) Math.max(1, Math.round(outlayInLakhs / 7.5));
            insights.add(new Insight(
                    "Simulated Life Event Outlays",
                    "You have registered " + scenarios.size() + " custom life event(s) totaling " + settings.getCurrency() + outlayInLakhs + "L. This delays your standard retirement target by about " + ageDelta + " years.",
                    "warning",
                    "+" + ageDelta + " Years",
                    "Liquidity",
                    "Open the What-If Simulator to delay purchase timelines or adjust loan-to-cash ratios."
            ));
        } else {
            insights.add(new Insight(
                    "No Simulated Life Events",
                    "You have not simulated any major upcoming financial outlays (like property purchase, career transition, etc.) on your timeline.",
                    "info",
                    "Baseline Only",
                    "Liquidity",
                    "Use the What-If Simulator page to project how a major life event affects your corpus."
            ));
        }

        // 4. Inflation check
        double inflation = profile.getInflationRate();
        if (inflation > 0.07) {
            insights.add(new Insight(
                    "High Inflation Stress-Test Active",
                    "You are planning with a high inflation rate of " + Math.round(inflation * 100) + "%. This heavily compounding factor escalates your required final retirement corpus.",
                    "warning",
                    "High Stress",
                    "Retirement",
                    "Assess whether your baseline post-retirement expenditure estimates can be trimmed."
            ));
        } else {
            insights.add(new Insight(
                    "Inflation Rate Healthy",
                    "Your model assumes " + Math.round(inflation * 100) + "% inflation, which aligns with long-term macroeconomic targets.",
                    "success",
                    "Stable",
                    "Retirement",
                    "Continue monitoring local consumer price index trends."
            ));
        }

        return insights;
    }
}
