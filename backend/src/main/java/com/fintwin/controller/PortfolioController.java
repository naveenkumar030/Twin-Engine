package com.fintwin.controller;

import com.fintwin.model.PortfolioHolding;
import com.fintwin.repository.PortfolioHoldingRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/portfolio")
@CrossOrigin(origins = "*")
public class PortfolioController {

    @Autowired
    private PortfolioHoldingRepository portfolioHoldingRepository;

    @GetMapping("/holdings")
    public List<PortfolioHolding> getHoldings(@RequestParam String userId) {
        List<PortfolioHolding> holdings = portfolioHoldingRepository.findByUserId(userId);
        if (holdings.isEmpty()) {
            // Prepopulate realistic starting sample portfolio holdings
            List<PortfolioHolding> defaults = new ArrayList<>();
            defaults.add(new PortfolioHolding(null, userId, "HDFC Index Nifty 50 Fund", "Equity", 6500000.0, 12.0));
            defaults.add(new PortfolioHolding(null, userId, "SBI Corporate Bond Fund", "Debt", 2500000.0, 6.8));
            defaults.add(new PortfolioHolding(null, userId, "Sovereign Gold Bond (SGB)", "Gold", 500000.0, 8.0));
            defaults.add(new PortfolioHolding(null, userId, "DLF Real Estate REIT", "Real Estate", 500000.0, 9.5));

            for (PortfolioHolding h : defaults) {
                portfolioHoldingRepository.save(h);
            }
            holdings = portfolioHoldingRepository.findByUserId(userId);
        }
        return holdings;
    }

    @PostMapping("/holdings")
    public PortfolioHolding saveHolding(@RequestParam String userId, @RequestBody PortfolioHolding holding) {
        holding.setUserId(userId);
        return portfolioHoldingRepository.save(holding);
    }

    @DeleteMapping("/holdings/{id}")
    public ResponseEntity<?> deleteHolding(@PathVariable String id, @RequestParam String userId) {
        portfolioHoldingRepository.deleteById(id);
        Map<String, String> res = new HashMap<>();
        res.put("message", "Holding deleted successfully");
        return ResponseEntity.ok(res);
    }

    @DeleteMapping("/holdings")
    public ResponseEntity<?> clearHoldings(@RequestParam String userId) {
        portfolioHoldingRepository.deleteByUserId(userId);
        Map<String, String> res = new HashMap<>();
        res.put("message", "All holdings deleted successfully");
        return ResponseEntity.ok(res);
    }

    @PostMapping("/holdings/upload")
    public ResponseEntity<?> uploadHoldingsCSV(@RequestParam("file") org.springframework.web.multipart.MultipartFile file, @RequestParam String userId) {
        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body(createMessage("CSV file is empty"));
        }

        try (java.io.BufferedReader reader = new java.io.BufferedReader(new java.io.InputStreamReader(file.getInputStream(), java.nio.charset.StandardCharsets.UTF_8))) {
            String headerLine = reader.readLine();
            if (headerLine == null) {
                return ResponseEntity.badRequest().body(createMessage("Empty file"));
            }

            String[] headers = parseCsvLine(headerLine);
            int nameIdx = -1;
            int catIdx = -1;
            int amtIdx = -1;
            int rateIdx = -1;

            for (int i = 0; i < headers.length; i++) {
                String h = headers[i].trim().toLowerCase();
                if (h.contains("asset") || h.contains("name")) nameIdx = i;
                else if (h.contains("category") || h.contains("class") || h.contains("type")) catIdx = i;
                else if (h.contains("amount") || h.contains("val") || h.contains("value")) amtIdx = i;
                else if (h.contains("rate") || h.contains("growth") || h.contains("return")) rateIdx = i;
            }

            if (nameIdx == -1) nameIdx = 0;
            if (catIdx == -1) catIdx = 1;
            if (amtIdx == -1) amtIdx = 2;
            if (rateIdx == -1) rateIdx = 3;

            List<PortfolioHolding> holdingsToSave = new ArrayList<>();
            String line;
            while ((line = reader.readLine()) != null) {
                if (line.trim().isEmpty()) continue;

                String[] values = parseCsvLine(line);
                if (values.length == 0) continue;

                String assetName = getValue(values, nameIdx, "Unspecified");
                String category = getValue(values, catIdx, "Equity");
                category = formatCategory(category);

                String amtStr = getValue(values, amtIdx, "0.0").replaceAll("[^0-9.]", "");
                double amount = 0.0;
                try {
                    amount = Double.parseDouble(amtStr);
                } catch (NumberFormatException e) {}

                String rateStr = getValue(values, rateIdx, "0.0").replaceAll("[^0-9.]", "");
                double rate = 0.0;
                try {
                    rate = Double.parseDouble(rateStr);
                } catch (NumberFormatException e) {}

                PortfolioHolding h = new PortfolioHolding(null, userId, assetName, category, amount, rate);
                holdingsToSave.add(h);
            }

            if (holdingsToSave.isEmpty()) {
                return ResponseEntity.badRequest().body(createMessage("No valid holding rows found in CSV"));
            }

            List<PortfolioHolding> saved = portfolioHoldingRepository.saveAll(holdingsToSave);
            return ResponseEntity.ok(saved);

        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(createMessage("Failed to parse CSV: " + e.getMessage()));
        }
    }

    private String formatCategory(String cat) {
        String c = cat.trim().toLowerCase();
        if (c.contains("equity")) return "Equity";
        if (c.contains("debt") || c.contains("bond")) return "Debt";
        if (c.contains("gold") || c.contains("metal")) return "Gold";
        if (c.contains("real") || c.contains("estate") || c.contains("reit") || c.contains("property")) return "Real Estate";
        return "Equity";
    }

    private String getValue(String[] values, int index, String fallback) {
        if (index >= 0 && index < values.length) {
            String val = values[index].trim();
            if (val.startsWith("\"") && val.endsWith("\"") && val.length() >= 2) {
                val = val.substring(1, val.length() - 1).trim();
            }
            return val.isEmpty() ? fallback : val;
        }
        return fallback;
    }

    private String[] parseCsvLine(String line) {
        List<String> tokens = new ArrayList<>();
        StringBuilder sb = new StringBuilder();
        boolean inQuotes = false;
        for (int i = 0; i < line.length(); i++) {
            char c = line.charAt(i);
            if (c == '"') {
                inQuotes = !inQuotes;
            } else if (c == ',' && !inQuotes) {
                tokens.add(sb.toString().trim());
                sb.setLength(0);
            } else {
                sb.append(c);
            }
        }
        tokens.add(sb.toString().trim());
        return tokens.toArray(new String[0]);
    }

    private Map<String, String> createMessage(String message) {
        Map<String, String> map = new HashMap<>();
        map.put("message", message);
        return map;
    }
}
