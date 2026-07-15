package com.fintwin.model;

import java.util.List;

public class SimulationResponse {
    private List<WealthPoint> wealthProjection;
    private ImpactDetails predictedImpact;
    private List<OptimizedPathDto> optimizedPaths;

    public SimulationResponse() {}

    public SimulationResponse(List<WealthPoint> wealthProjection, ImpactDetails predictedImpact, List<OptimizedPathDto> optimizedPaths) {
        this.wealthProjection = wealthProjection;
        this.predictedImpact = predictedImpact;
        this.optimizedPaths = optimizedPaths;
    }

    public List<WealthPoint> getWealthProjection() {
        return wealthProjection;
    }

    public void setWealthProjection(List<WealthPoint> wealthProjection) {
        this.wealthProjection = wealthProjection;
    }

    public ImpactDetails getPredictedImpact() {
        return predictedImpact;
    }

    public void setPredictedImpact(ImpactDetails predictedImpact) {
        this.predictedImpact = predictedImpact;
    }

    public List<OptimizedPathDto> getOptimizedPaths() {
        return optimizedPaths;
    }

    public void setOptimizedPaths(List<OptimizedPathDto> optimizedPaths) {
        this.optimizedPaths = optimizedPaths;
    }

    public static class WealthPoint {
        private int year;
        private double baseline;
        private double simulated;

        public WealthPoint() {}

        public WealthPoint(int year, double baseline, double simulated) {
            this.year = year;
            this.baseline = baseline;
            this.simulated = simulated;
        }

        public int getYear() {
            return year;
        }

        public void setYear(int year) {
            this.year = year;
        }

        public double getBaseline() {
            return baseline;
        }

        public void setBaseline(double baseline) {
            this.baseline = baseline;
        }

        public double getSimulated() {
            return simulated;
        }

        public void setSimulated(double simulated) {
            this.simulated = simulated;
        }
    }

    public static class ImpactDetails {
        private double lossAmountLakhs;
        private int qualityOfLifeImprovementPct;
        private int retirementAgeDeltaYears;
        private String liquidityRisk;
        private double timeToRecoveryYears;

        public ImpactDetails() {}

        public ImpactDetails(double lossAmountLakhs, int qualityOfLifeImprovementPct, int retirementAgeDeltaYears, String liquidityRisk, double timeToRecoveryYears) {
            this.lossAmountLakhs = lossAmountLakhs;
            this.qualityOfLifeImprovementPct = qualityOfLifeImprovementPct;
            this.retirementAgeDeltaYears = retirementAgeDeltaYears;
            this.liquidityRisk = liquidityRisk;
            this.timeToRecoveryYears = timeToRecoveryYears;
        }

        public double getLossAmountLakhs() {
            return lossAmountLakhs;
        }

        public void setLossAmountLakhs(double lossAmountLakhs) {
            this.lossAmountLakhs = lossAmountLakhs;
        }

        public int getQualityOfLifeImprovementPct() {
            return qualityOfLifeImprovementPct;
        }

        public void setQualityOfLifeImprovementPct(int qualityOfLifeImprovementPct) {
            this.qualityOfLifeImprovementPct = qualityOfLifeImprovementPct;
        }

        public int getRetirementAgeDeltaYears() {
            return retirementAgeDeltaYears;
        }

        public void setRetirementAgeDeltaYears(int retirementAgeDeltaYears) {
            this.retirementAgeDeltaYears = retirementAgeDeltaYears;
        }

        public String getLiquidityRisk() {
            return liquidityRisk;
        }

        public void setLiquidityRisk(String liquidityRisk) {
            this.liquidityRisk = liquidityRisk;
        }

        public double getTimeToRecoveryYears() {
            return timeToRecoveryYears;
        }

        public void setTimeToRecoveryYears(double timeToRecoveryYears) {
            this.timeToRecoveryYears = timeToRecoveryYears;
        }
    }

    public static class OptimizedPathDto {
        private String title;
        private String desc;
        private String icon; // "TrendingUp", "PiggyBank", etc.

        public OptimizedPathDto() {}

        public OptimizedPathDto(String title, String desc, String icon) {
            this.title = title;
            this.desc = desc;
            this.icon = icon;
        }

        public String getTitle() {
            return title;
        }

        public void setTitle(String title) {
            this.title = title;
        }

        public String getDesc() {
            return desc;
        }

        public void setDesc(String desc) {
            this.desc = desc;
        }

        public String getIcon() {
            return icon;
        }

        public void setIcon(String icon) {
            this.icon = icon;
        }
    }
}
