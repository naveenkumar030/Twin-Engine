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
        if (user.getUsername() == null || user.getUsername().trim().isEmpty()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(createMessage("Username is required"));
        }
        if (user.getPassword() == null || user.getPassword().length() < 4) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(createMessage("Password must be at least 4 characters"));
        }

        Optional<User> existingUser = userRepository.findByUsername(user.getUsername().trim());
        if (existingUser.isPresent()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(createMessage("Username already exists"));
        }

        // Hash password
        user.setPassword(passwordEncoder.encode(user.getPassword()));
        user.setUsername(user.getUsername().trim());
        
        User savedUser = userRepository.save(user);
        savedUser.setPassword(""); // blank out password for response
        return ResponseEntity.ok(savedUser);
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody User loginRequest) {
        if (loginRequest.getUsername() == null || loginRequest.getPassword() == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(createMessage("Username and password are required"));
        }

        Optional<User> userOpt = userRepository.findByUsername(loginRequest.getUsername().trim());
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(createMessage("Invalid username or password"));
        }

        User user = userOpt.get();
        if (!passwordEncoder.matches(loginRequest.getPassword(), user.getPassword())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(createMessage("Invalid username or password"));
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
