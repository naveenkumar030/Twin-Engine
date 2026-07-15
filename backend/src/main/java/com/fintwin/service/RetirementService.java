package com.fintwin.service;

import com.fintwin.model.ProjectionPoint;
import com.fintwin.model.RetirementRequest;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;

@Service
public class RetirementService {

    public List<ProjectionPoint> calculateProjections(RetirementRequest request) {
        List<ProjectionPoint> points = new ArrayList<>();
        double corpus = request.getStartingCorpus();
        double withdrawal = request.getStartingWithdrawal();
        double inflation = 1.0 + request.getInflationRate();
        double ret = 1.0 + request.getReturnRate();

        for (int age = 60; age <= 90; age++) {
            // corpus in Cr (divide by 10,000,000)
            double corpusCr = round(corpus / 10000000.0, 2);
            // withdrawal in Lakhs (divide by 100,000)
            double withdrawalL = round(withdrawal / 100000.0, 1);

            points.add(new ProjectionPoint(age, corpusCr, withdrawalL));

            corpus = Math.max(0.0, (corpus - withdrawal) * ret);
            withdrawal *= inflation;
        }

        return points;
    }

    private double round(double value, int places) {
        if (places < 0) throw new IllegalArgumentException();
        BigDecimal bd = BigDecimal.valueOf(value);
        bd = bd.setScale(places, RoundingMode.HALF_UP);
        return bd.doubleValue();
    }
}
