package com.fintwin.controller;

import com.fintwin.model.SimulationRequest;
import com.fintwin.model.SimulationResponse;
import com.fintwin.model.SimulationScenario;
import com.fintwin.repository.SimulationScenarioRepository;
import com.fintwin.service.SimulationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/simulator")
@CrossOrigin(origins = "*")
public class SimulationController {

    @Autowired
    private SimulationService simulationService;

    @Autowired
    private SimulationScenarioRepository simulationScenarioRepository;

    @PostMapping("/project")
    public SimulationResponse runSimulation(@RequestParam(required = false) String userId, @RequestBody SimulationRequest request) {
        return simulationService.runSimulation(userId, request);
    }

    @GetMapping("/scenarios")
    public List<SimulationScenario> getSavedScenarios(@RequestParam String userId) {
        return simulationScenarioRepository.findByUserId(userId);
    }

    @PostMapping("/scenarios")
    public SimulationScenario saveScenario(@RequestParam String userId, @RequestBody SimulationScenario scenario) {
        scenario.setUserId(userId);
        return simulationScenarioRepository.save(scenario);
    }

    @DeleteMapping("/scenarios/{id}")
    public ResponseEntity<?> deleteScenario(@RequestParam String userId, @PathVariable String id) {
        Optional<SimulationScenario> scenarioOpt = simulationScenarioRepository.findById(id);
        if (scenarioOpt.isPresent() && scenarioOpt.get().getUserId().equals(userId)) {
            simulationScenarioRepository.deleteById(id);
            return ResponseEntity.ok().build();
        }
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Access denied or scenario not found");
    }

    @GetMapping("/events")
    public List<Map<String, Object>> getLifeEvents() {
        List<Map<String, Object>> events = new ArrayList<>();
        
        events.add(createEvent("car", "Buy Car", "Car"));
        events.add(createEvent("house", "Buy House", "HomeIcon"));
        events.add(createEvent("career", "Career Shift", "Briefcase"));
        events.add(createEvent("edu", "Education", "GraduationCap"));
        events.add(createEvent("pivot", "Career Pivot", "Repeat"));
        events.add(createEvent("emergency", "Emergency Fund", "ShieldPlus"));

        return events;
    }

    private Map<String, Object> createEvent(String key, String label, String icon) {
        Map<String, Object> event = new HashMap<>();
        event.put("key", key);
        event.put("label", label);
        event.put("icon", icon);
        return event;
    }
}
