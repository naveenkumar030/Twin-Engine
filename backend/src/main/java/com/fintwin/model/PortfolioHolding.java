package com.fintwin.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Document(collection = "portfolio_holdings")
public class PortfolioHolding {
    @Id
    private String id;
    private String userId;
    private String assetName;
    private String category; // Equity, Debt, Gold, Real Estate
    private double amount;
    private double growthRate; // expected annual return %

    public PortfolioHolding() {}

    public PortfolioHolding(String id, String userId, String assetName, String category, double amount, double growthRate) {
        this.id = id;
        this.userId = userId;
        this.assetName = assetName;
        this.category = category;
        this.amount = amount;
        this.growthRate = growthRate;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }

    public String getAssetName() {
        return assetName;
    }

    public void setAssetName(String assetName) {
        this.assetName = assetName;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public double getAmount() {
        return amount;
    }

    public void setAmount(double amount) {
        this.amount = amount;
    }

    public double getGrowthRate() {
        return growthRate;
    }

    public void setGrowthRate(double growthRate) {
        this.growthRate = growthRate;
    }
}
