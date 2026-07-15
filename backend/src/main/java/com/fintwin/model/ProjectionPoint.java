package com.fintwin.model;

public class ProjectionPoint {
    private int age;
    private double corpus;
    private double withdrawal;

    public ProjectionPoint() {}

    public ProjectionPoint(int age, double corpus, double withdrawal) {
        this.age = age;
        this.corpus = corpus;
        this.withdrawal = withdrawal;
    }

    public int getAge() {
        return age;
    }

    public void setAge(int age) {
        this.age = age;
    }

    public double getCorpus() {
        return corpus;
    }

    public void setCorpus(double corpus) {
        this.corpus = corpus;
    }

    public double getWithdrawal() {
        return withdrawal;
    }

    public void setWithdrawal(double withdrawal) {
        this.withdrawal = withdrawal;
    }
}
