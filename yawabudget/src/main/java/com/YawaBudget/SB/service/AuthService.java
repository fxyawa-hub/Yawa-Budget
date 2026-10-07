package com.YawaBudget.SB.service;

import com.YawaBudget.SB.dto.AuthRequest;
import com.YawaBudget.SB.dto.AuthResponse;
import com.YawaBudget.SB.dto.RegisterRequest;
import com.YawaBudget.SB.model.User;
import com.YawaBudget.SB.repository.BudgetRepository;
import com.YawaBudget.SB.repository.TransactionRepository;
import com.YawaBudget.SB.repository.UserRepository;
import com.YawaBudget.SB.security.JwtService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class AuthService {
    private final UserRepository userRepository;
    private final TransactionRepository transactionRepository;
    private final BudgetRepository budgetRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final Map<String, Integer> loginAttempts = new ConcurrentHashMap<>();

    public AuthService(UserRepository userRepository, TransactionRepository transactionRepository,
                       BudgetRepository budgetRepository, PasswordEncoder passwordEncoder, JwtService jwtService) {
        this.userRepository = userRepository;
        this.transactionRepository = transactionRepository;
        this.budgetRepository = budgetRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    public AuthResponse register(RegisterRequest request) {
        if (userRepository.findByEmail(request.email()).isPresent()) {
            throw new IllegalArgumentException("Email already in use");
        }
        User user = new User();
        user.setName(request.name());
        user.setEmail(request.email());
        user.setPassword(passwordEncoder.encode(request.password()));
        user = userRepository.save(user);

        return new AuthResponse(jwtService.generateToken(user.getId()), user.getId(), user.getName());
    }

    public AuthResponse login(AuthRequest request, String ipAddress) {
        int attempts = loginAttempts.getOrDefault(ipAddress, 0);
        if (attempts >= 5) throw new SecurityException("Too many login attempts");

        User user = userRepository.findByEmail(request.email())
                .orElseThrow(() -> registerFailedAttempt(ipAddress, attempts));

        if (!passwordEncoder.matches(request.password(), user.getPassword())) {
            throw registerFailedAttempt(ipAddress, attempts);
        }

        loginAttempts.remove(ipAddress);
        return new AuthResponse(jwtService.generateToken(user.getId()), user.getId(), user.getName());
    }

    private IllegalArgumentException registerFailedAttempt(String ipAddress, int attempts) {
        loginAttempts.put(ipAddress, attempts + 1);
        return new IllegalArgumentException("Invalid credentials");
    }

    public void deleteAccount(String userId) {
        transactionRepository.deleteByUserId(userId);
        budgetRepository.deleteByUserId(userId);
        userRepository.deleteById(userId);
    }
}