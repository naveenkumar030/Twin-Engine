package com.fintwin.controller;

import com.fintwin.model.User;
import com.fintwin.model.UserSettings;
import com.fintwin.repository.UserRepository;
import com.fintwin.repository.UserSettingsRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/settings")
@CrossOrigin(origins = "*")
public class SettingsController {

    @Autowired
    private UserSettingsRepository userSettingsRepository;

    @Autowired
    private UserRepository userRepository;

    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    @GetMapping
    public UserSettings getSettings(@RequestParam String userId) {
        return userSettingsRepository.findByUserId(userId)
                .orElseGet(() -> {
                    UserSettings defaultSettings = new UserSettings(
                            null,
                            userId,
                            "₹",
                            60,
                            42,
                            65.0,
                            25.0,
                            5.0,
                            5.0
                    );
                    return userSettingsRepository.save(defaultSettings);
                });
    }

    @PostMapping
    public UserSettings saveSettings(@RequestParam String userId, @RequestBody UserSettings settings) {
        Optional<UserSettings> existing = userSettingsRepository.findByUserId(userId);
        if (existing.isPresent()) {
            settings.setId(existing.get().getId());
        } else {
            settings.setId(null);
        }
        settings.setUserId(userId);
        return userSettingsRepository.save(settings);
    }

    @PostMapping("/profile")
    public ResponseEntity<?> updateProfile(@RequestParam String userId, @RequestBody Map<String, String> profileUpdate) {
        Optional<User> userOpt = userRepository.findByUsername(userId);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(createMessage("User not found"));
        }

        User user = userOpt.get();
        String email = profileUpdate.get("email");
        String password = profileUpdate.get("password");

        if (email != null && !email.trim().isEmpty()) {
            user.setEmail(email.trim());
        }

        if (password != null && !password.trim().isEmpty()) {
            if (password.length() < 4) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(createMessage("Password must be at least 4 characters"));
            }
            user.setPassword(passwordEncoder.encode(password));
        }

        User savedUser = userRepository.save(user);
        savedUser.setPassword(""); // blank out password for response
        return ResponseEntity.ok(savedUser);
    }

    private Map<String, String> createMessage(String message) {
        Map<String, String> map = new HashMap<>();
        map.put("message", message);
        return map;
    }
}
