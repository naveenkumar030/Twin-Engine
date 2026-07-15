package com.fintwin.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.Instant;

@Document(collection = "simulation_scenarios")
public class SimulationScenario {
    @Id
    private String id;
    private String userId;
    private String eventKey;
    private String label;
    private double amount;
    private int months;
    private Instant createdAt = Instant.now();

    public SimulationScenario() {}

    public SimulationScenario(String id, String userId, String eventKey, String label, double amount, int months) {
        this.id = id;
        this.userId = userId;
        this.eventKey = eventKey;
        this.label = label;
        this.amount = amount;
        this.months = months;
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

    public String getEventKey() {
        return eventKey;
    }

    public void setEventKey(String eventKey) {
        this.eventKey = eventKey;
    }

    public String getLabel() {
        return label;
    }

    public void setLabel(String label) {
        this.label = label;
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

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }
}
