package com.fintwin.controller;

import com.fintwin.model.ProjectionPoint;
import com.fintwin.model.RetirementProfile;
import com.fintwin.model.RetirementRequest;
import com.fintwin.model.UserSettings;
import com.fintwin.repository.RetirementProfileRepository;
import com.fintwin.repository.UserSettingsRepository;
import com.fintwin.service.RetirementService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/retirement")
@CrossOrigin(origins = "*")
public class RetirementController {

    @Autowired
    private RetirementService retirementService;

    @Autowired
    private RetirementProfileRepository retirementProfileRepository;

    @Autowired
    private UserSettingsRepository userSettingsRepository;

    @GetMapping("/profile")
    public RetirementProfile getProfile(@RequestParam String userId) {
        return retirementProfileRepository.findByUserId(userId)
                .orElseGet(() -> {
                    RetirementProfile defaultProfile = new RetirementProfile(
                            null,
                            userId,
                            120000000.0, // 12 Cr
                            4800000.0,   // 48L
                            0.06,        // 6%
                            0.08         // 8%
                    );
                    return retirementProfileRepository.save(defaultProfile);
                });
    }

    @PostMapping("/profile")
    public RetirementProfile saveProfile(@RequestParam String userId, @RequestBody RetirementProfile profile) {
        // Ensure user is not overriding another user's profile
        Optional<RetirementProfile> existing = retirementProfileRepository.findByUserId(userId);
        if (existing.isPresent()) {
            profile.setId(existing.get().getId());
        } else {
            profile.setId(null);
        }
        profile.setUserId(userId);
        return retirementProfileRepository.save(profile);
    }

    @PostMapping("/projection")
    public List<ProjectionPoint> getProjection(@RequestParam(required = false) String userId, @RequestBody(required = false) RetirementRequest request) {
        if (request == null) {
            if (userId != null) {
                Optional<RetirementProfile> profileOpt = retirementProfileRepository.findByUserId(userId);
                if (profileOpt.isPresent()) {
                    RetirementProfile p = profileOpt.get();
                    request = new RetirementRequest(
                            p.getStartingCorpus(),
                            p.getStartingWithdrawal(),
                            p.getInflationRate(),
                            p.getReturnRate()
                    );
                }
            }
            if (request == null) {
                request = new RetirementRequest();
            }
        }
        return retirementService.calculateProjections(request);
    }

    @GetMapping("/allocation")
    public List<Map<String, Object>> getAllocation(@RequestParam(required = false) String userId) {
        double equityVal = 65.0;
        double debtVal = 25.0;
        double goldVal = 5.0;
        double reVal = 5.0;

        if (userId != null) {
            Optional<UserSettings> settingsOpt = userSettingsRepository.findByUserId(userId);
            if (settingsOpt.isPresent()) {
                UserSettings s = settingsOpt.get();
                equityVal = s.getEquityAllocation();
                debtVal = s.getDebtAllocation();
                goldVal = s.getGoldAllocation();
                reVal = s.getRealEstateAllocation();
            }
        }

        List<Map<String, Object>> allocation = new ArrayList<>();
        
        Map<String, Object> equity = new HashMap<>();
        equity.put("name", "Equity");
        equity.put("value", equityVal);
        equity.put("color", "#4b41e1");
        allocation.add(equity);

        Map<String, Object> debt = new HashMap<>();
        debt.put("name", "Debt");
        debt.put("value", debtVal);
        debt.put("color", "#004a31");
        allocation.add(debt);

        Map<String, Object> gold = new HashMap<>();
        gold.put("name", "Gold");
        gold.put("value", goldVal);
        gold.put("color", "#f59e0b");
        allocation.add(gold);

        Map<String, Object> re = new HashMap<>();
        re.put("name", "Real Estate");
        re.put("value", reVal);
        re.put("color", "#4059aa");
        allocation.add(re);

        return allocation;
    }
}
