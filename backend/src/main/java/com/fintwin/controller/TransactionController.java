package com.fintwin.controller;

import com.fintwin.model.Transaction;
import com.fintwin.repository.TransactionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.*;

@RestController
@RequestMapping("/api/transactions")
@CrossOrigin(origins = "*")
public class TransactionController {

    @Autowired
    private TransactionRepository transactionRepository;

    @GetMapping
    public ResponseEntity<List<Transaction>> getTransactions(@RequestParam String userId) {
        List<Transaction> transactions = transactionRepository.findByUserId(userId);
        return ResponseEntity.ok(transactions);
    }

    @DeleteMapping
    public ResponseEntity<?> clearTransactions(@RequestParam String userId) {
        transactionRepository.deleteByUserId(userId);
        Map<String, String> response = new HashMap<>();
        response.put("message", "All transactions cleared successfully");
        return ResponseEntity.ok(response);
    }

    @PostMapping("/upload")
    public ResponseEntity<?> uploadCSV(@RequestParam("file") MultipartFile file, @RequestParam String userId) {
        if (file.isEmpty()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(createMessage("CSV file is empty"));
        }

        try (BufferedReader reader = new BufferedReader(new InputStreamReader(file.getInputStream(), StandardCharsets.UTF_8))) {
            String headerLine = reader.readLine();
            if (headerLine == null) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(createMessage("Empty file"));
            }

            // Parse headers to find indices
            String[] headers = parseCsvLine(headerLine);
            int dateIdx = -1;
            int descIdx = -1;
            int catIdx = -1;
            int amtIdx = -1;
            int typeIdx = -1;

            for (int i = 0; i < headers.length; i++) {
                String h = headers[i].trim().toLowerCase();
                if (h.contains("date")) dateIdx = i;
                else if (h.contains("desc")) descIdx = i;
                else if (h.contains("category") || h.contains("cat")) catIdx = i;
                else if (h.contains("amount") || h.contains("amt") || h.contains("val")) amtIdx = i;
                else if (h.contains("type")) typeIdx = i;
            }

            // Safe fallbacks to prevent index collisions
            Set<Integer> usedIndices = new HashSet<>();
            if (dateIdx != -1) usedIndices.add(dateIdx);
            if (descIdx != -1) usedIndices.add(descIdx);
            if (catIdx != -1) usedIndices.add(catIdx);
            if (amtIdx != -1) usedIndices.add(amtIdx);
            if (typeIdx != -1) usedIndices.add(typeIdx);

            if (dateIdx == -1) { dateIdx = findUnusedIndex(usedIndices, 0); usedIndices.add(dateIdx); }
            if (descIdx == -1) { descIdx = findUnusedIndex(usedIndices, 1); usedIndices.add(descIdx); }
            if (catIdx == -1) { catIdx = findUnusedIndex(usedIndices, 2); usedIndices.add(catIdx); }
            if (amtIdx == -1) { amtIdx = findUnusedIndex(usedIndices, 3); usedIndices.add(amtIdx); }
            if (typeIdx == -1) { typeIdx = findUnusedIndex(usedIndices, 4); usedIndices.add(typeIdx); }

            List<Transaction> transactionsToSave = new ArrayList<>();
            String line;
            while ((line = reader.readLine()) != null) {
                if (line.trim().isEmpty()) continue;

                String[] values = parseCsvLine(line);
                if (values.length == 0) continue;

                String date = getValue(values, dateIdx, "2026-07-15");
                String description = getValue(values, descIdx, "Unspecified");
                String category = getValue(values, catIdx, "Other");
                String amtStr = getValue(values, amtIdx, "0.0").replaceAll("[^0-9.]", "");
                double amount = 0.0;
                try {
                    amount = Double.parseDouble(amtStr);
                } catch (NumberFormatException e) {
                    // Keep 0.0
                }
                String type = getValue(values, typeIdx, "EXPENSE").toUpperCase().trim();
                if (!type.equals("INCOME") && !type.equals("EXPENSE")) {
                    if (type.contains("INC") || type.contains("REV") || type.contains("EARN") || type.contains("DEP")) {
                        type = "INCOME";
                    } else {
                        type = "EXPENSE";
                    }
                }

                Transaction t = new Transaction(null, userId, date, description, category, amount, type);
                transactionsToSave.add(t);
            }

            if (transactionsToSave.isEmpty()) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(createMessage("No valid transaction rows found in CSV"));
            }

            List<Transaction> saved = transactionRepository.saveAll(transactionsToSave);
            return ResponseEntity.ok(saved);

        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(createMessage("Failed to parse CSV: " + e.getMessage()));
        }
    }

    private String getValue(String[] values, int index, String fallback) {
        if (index >= 0 && index < values.length) {
            String val = values[index].trim();
            // Strip leading/trailing quotes if present
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

    private int findUnusedIndex(Set<Integer> used, int preferred) {
        int idx = preferred;
        while (used.contains(idx)) {
            idx++;
        }
        return idx;
    }
}
