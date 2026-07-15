package com.fintwin.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Document(collection = "retirement_profiles")
public class RetirementProfile {
    @Id
    private String id;
    private String userId;
    private double startingCorpus;
    private double startingWithdrawal;
    private double inflationRate;
    private double returnRate;

    public RetirementProfile() {}

    public RetirementProfile(String id, String userId, double startingCorpus, double startingWithdrawal, double inflationRate, double returnRate) {
        this.id = id;
        this.userId = userId;
        this.startingCorpus = startingCorpus;
        this.startingWithdrawal = startingWithdrawal;
        this.inflationRate = inflationRate;
        this.returnRate = returnRate;
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

    public double getStartingCorpus() {
        return startingCorpus;
    }

    public void setStartingCorpus(double startingCorpus) {
        this.startingCorpus = startingCorpus;
    }

    public double getStartingWithdrawal() {
        return startingWithdrawal;
    }

    public void setStartingWithdrawal(double startingWithdrawal) {
        this.startingWithdrawal = startingWithdrawal;
    }

    public double getInflationRate() {
        return inflationRate;
    }

    public void setInflationRate(double inflationRate) {
        this.inflationRate = inflationRate;
    }

    public double getReturnRate() {
        return returnRate;
    }

    public void setReturnRate(double returnRate) {
        this.returnRate = returnRate;
    }
}
