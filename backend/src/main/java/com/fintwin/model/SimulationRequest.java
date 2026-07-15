package com.fintwin.model;

public class SimulationRequest {
    private String selectedEvent;
    private double amount;
    private int months;
    private double downpaymentPct = 30.0;
    private double loanInterestRate = 8.5;

    public SimulationRequest() {}

    public SimulationRequest(String selectedEvent, double amount, int months, double downpaymentPct, double loanInterestRate) {
        this.selectedEvent = selectedEvent;
        this.amount = amount;
        this.months = months;
        this.downpaymentPct = downpaymentPct;
        this.loanInterestRate = loanInterestRate;
    }

    public String getSelectedEvent() {
        return selectedEvent;
    }

    public void setSelectedEvent(String selectedEvent) {
        this.selectedEvent = selectedEvent;
    }

    public double getAmount() {
        return amount;
    }

    public void setAmount(double amount) {
        this.amount = amount;
    }

    public int getMonths() {
        return months;
    }

    public void setMonths(int months) {
        this.months = months;
    }

    public double getDownpaymentPct() {
        return downpaymentPct;
    }

    public void setDownpaymentPct(double downpaymentPct) {
        this.downpaymentPct = downpaymentPct;
    }

    public double getLoanInterestRate() {
        return loanInterestRate;
    }

    public void setLoanInterestRate(double loanInterestRate) {
        this.loanInterestRate = loanInterestRate;
    }
}
