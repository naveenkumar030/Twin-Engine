package com.fintwin.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Document(collection = "user_settings")
public class UserSettings {
    @Id
    private String id;
    private String userId;
    private String currency = "\u20B9";
    private int targetRetirementAge = 60;
    private int currentAge = 42;
    private double equityAllocation = 65.0;
    private double debtAllocation = 25.0;
    private double goldAllocation = 5.0;
    private double realEstateAllocation = 5.0;

    public UserSettings() {}

    public UserSettings(String id, String userId, String currency, int targetRetirementAge, int currentAge,
                        double equityAllocation, double debtAllocation, double goldAllocation, double realEstateAllocation) {
        this.id = id;
        this.userId = userId;
        this.currency = currency;
        this.targetRetirementAge = targetRetirementAge;
        this.currentAge = currentAge;
        this.equityAllocation = equityAllocation;
        this.debtAllocation = debtAllocation;
        this.goldAllocation = goldAllocation;
        this.realEstateAllocation = realEstateAllocation;
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

    public String getCurrency() {
        return currency;
    }

    public void setCurrency(String currency) {
        this.currency = currency;
    }

    public int getTargetRetirementAge() {
        return targetRetirementAge;
    }

    public void setTargetRetirementAge(int targetRetirementAge) {
        this.targetRetirementAge = targetRetirementAge;
    }

    public double getEquityAllocation() {
        return equityAllocation;
    }

    public void setEquityAllocation(double equityAllocation) {
        this.equityAllocation = equityAllocation;
    }

    public double getDebtAllocation() {
        return debtAllocation;
    }

    public void setDebtAllocation(double debtAllocation) {
        this.debtAllocation = debtAllocation;
    }

    public double getGoldAllocation() {
        return goldAllocation;
    }

    public void setGoldAllocation(double goldAllocation) {
        this.goldAllocation = goldAllocation;
    }

    public double getRealEstateAllocation() {
        return realEstateAllocation;
    }

    public void setRealEstateAllocation(double realEstateAllocation) {
        this.realEstateAllocation = realEstateAllocation;
    }

    public int getCurrentAge() {
        return currentAge;
    }

    public void setCurrentAge(int currentAge) {
        this.currentAge = currentAge;
    }
}
