package com.fintwin.model;

public class Insight {
    private String title;
    private String description;
    private String type; // warning, success, info, tip
    private String impactMetric;
    private String category; // Retirement, Allocation, Liquidity
    private String actionableStep;

    public Insight() {}

    public Insight(String title, String description, String type, String impactMetric, String category, String actionableStep) {
        this.title = title;
        this.description = description;
        this.type = type;
        this.impactMetric = impactMetric;
        this.category = category;
        this.actionableStep = actionableStep;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public String getImpactMetric() {
        return impactMetric;
    }

    public void setImpactMetric(String impactMetric) {
        this.impactMetric = impactMetric;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public String getActionableStep() {
        return actionableStep;
    }

    public void setActionableStep(String actionableStep) {
        this.actionableStep = actionableStep;
    }
}
