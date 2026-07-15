package com.fintwin.model;

public class RetirementRequest {
    private double startingCorpus = 120000000.0;
    private double startingWithdrawal = 4800000.0;
    private double inflationRate = 0.06;
    private double returnRate = 0.08;

    public RetirementRequest() {}

    public RetirementRequest(double startingCorpus, double startingWithdrawal, double inflationRate, double returnRate) {
        this.startingCorpus = startingCorpus;
        this.startingWithdrawal = startingWithdrawal;
        this.inflationRate = inflationRate;
        this.returnRate = returnRate;
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
