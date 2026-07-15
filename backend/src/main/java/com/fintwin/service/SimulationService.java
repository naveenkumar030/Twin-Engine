package com.fintwin.service;

import com.fintwin.model.SimulationRequest;
import com.fintwin.model.SimulationResponse;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;

@Service
public class SimulationService {

    public SimulationResponse runSimulation(SimulationRequest request) {
        // 1. Generate dynamic wealth points
        List<SimulationResponse.WealthPoint> points = new ArrayList<>();
        int currentYear = 2024;
        double costCr = request.getAmount() / 10000000.0;
        int eventYear = currentYear + (int) Math.round(request.getMonths() / 12.0);

        // Baseline progression
        int[] years = {2024, 2027, 2030, 2034, 2039, 2044};
        double[] baselines = {0.6, 1.2, 1.9, 2.9, 4.0, 5.1};

        for (int i = 0; i < years.length; i++) {
            int year = years[i];
            double baseline = baselines[i];
            double simulated = baseline;

            if (year >= eventYear) {
                int yearsCompounded = year - eventYear;
                double downpaymentAmt = request.getAmount() * (request.getDownpaymentPct() / 100.0);
                double loanAmt = request.getAmount() * (1.0 - request.getDownpaymentPct() / 100.0);
                
                double downpaymentDrag = (downpaymentAmt / 10000000.0) * Math.pow(1.075, yearsCompounded);
                double loanDrag = (loanAmt / 10000000.0) * Math.pow(1.0 + request.getLoanInterestRate() / 100.0, yearsCompounded);
                
                double totalDrag = downpaymentDrag + loanDrag;
                simulated = Math.max(0.0, round(baseline - totalDrag, 2));
            }
            points.add(new SimulationResponse.WealthPoint(year, baseline, simulated));
        }

        // 2. Calculate dynamic impact details
        double costLakhs = request.getAmount() / 100000.0;
        
        // Final simulated wealth vs baseline
        double finalBaseline = baselines[baselines.length - 1];
        double finalSimulated = points.get(points.size() - 1).getSimulated();
        double lossCr = finalBaseline - finalSimulated;
        double lossAmountLakhs = round(lossCr * 100.0, 1);
        if (lossAmountLakhs <= 0.0) {
            lossAmountLakhs = round(costLakhs * 1.47, 1); // fallback estimation
        }

        int qolPct = getQualityOfLifePct(request.getSelectedEvent());
        int ageDelta = (int) Math.max(1, Math.round(costLakhs / 7.5)); // 7.5 Lakhs roughly shifts target age by 1 year
        
        String risk = "Low";
        if (costLakhs > 35.0) {
            risk = "High";
        } else if (costLakhs > 12.0) {
            risk = "Medium";
        }

        double recoveryYears = round((costLakhs / 15.0) * 8.5, 1); // 15L takes 8.5 years to fully recover

        SimulationResponse.ImpactDetails impact = new SimulationResponse.ImpactDetails(
                lossAmountLakhs,
                qolPct,
                ageDelta,
                risk,
                recoveryYears
        );

        // 3. Create optimized paths suggestions
        List<SimulationResponse.OptimizedPathDto> paths = new ArrayList<>();
        double delaySavings = round(lossAmountLakhs * 0.63, 1);
        paths.add(new SimulationResponse.OptimizedPathDto(
                "Delay by 12 Months",
                "Recovers ₹" + delaySavings + "L of projected loss by allowing corpus growth.",
                "TrendingUp"
        ));
        paths.add(new SimulationResponse.OptimizedPathDto(
                "Increase Downpayment",
                "Shift 10% from equity to reduce debt burden and interest costs.",
                "PiggyBank"
        ));

        return new SimulationResponse(points, impact, paths);
    }

    private int getQualityOfLifePct(String event) {
        if (event == null) return 10;
        switch (event.toLowerCase()) {
            case "car": return 15;
            case "house": return 25;
            case "career": return 20;
            case "edu": return 22;
            case "pivot": return 18;
            case "emergency": return 8;
            default: return 12;
        }
    }

    private double round(double value, int places) {
        if (places < 0) throw new IllegalArgumentException();
        BigDecimal bd = BigDecimal.valueOf(value);
        bd = bd.setScale(places, RoundingMode.HALF_UP);
        return bd.doubleValue();
    }
}
