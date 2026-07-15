package com.fintwin.controller;

import com.fintwin.model.User;
import com.fintwin.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*")
public class AuthController {

    @Autowired
    private UserRepository userRepository;

    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody User user) {
        if (user.getEmail() == null || user.getEmail().trim().isEmpty()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(createMessage("Email is required"));
        }
        if (user.getPassword() == null || user.getPassword().length() < 4) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(createMessage("Password must be at least 4 characters"));
        }

        Optional<User> existingUser = userRepository.findByEmail(user.getEmail().trim());
        if (existingUser.isPresent()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(createMessage("Email already exists"));
        }

        // Hash password
        user.setPassword(passwordEncoder.encode(user.getPassword()));
        user.setEmail(user.getEmail().trim());
        // Default username to email if it's not provided
        if (user.getUsername() == null || user.getUsername().trim().isEmpty()) {
            user.setUsername(user.getEmail());
        }
        
        User savedUser = userRepository.save(user);
        savedUser.setPassword(""); // blank out password for response
        return ResponseEntity.ok(savedUser);
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody User loginRequest) {
        if (loginRequest.getEmail() == null || loginRequest.getPassword() == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(createMessage("Email and password are required"));
        }

        Optional<User> userOpt = userRepository.findByEmail(loginRequest.getEmail().trim());
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(createMessage("Invalid email or password"));
        }

        User user = userOpt.get();
        if (!passwordEncoder.matches(loginRequest.getPassword(), user.getPassword())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(createMessage("Invalid email or password"));
        }

        user.setPassword(""); // blank out password for response
        return ResponseEntity.ok(user);
    }

    private Map<String, String> createMessage(String message) {
        Map<String, String> map = new HashMap<>();
        map.put("message", message);
        return map;
    }
}
