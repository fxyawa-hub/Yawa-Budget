package com.YawaBudget.SB.controller;

import com.YawaBudget.SB.dto.AuthRequest;
import com.YawaBudget.SB.dto.AuthResponse;
import com.YawaBudget.SB.dto.RegisterRequest;
import com.YawaBudget.SB.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/auth")
public class AuthController {
    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        return ResponseEntity.ok(authService.register(request));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody AuthRequest request, HttpServletRequest httpRequest) {
        return ResponseEntity.ok(authService.login(request, httpRequest.getRemoteAddr()));
    }

    @DeleteMapping("/account")
    public ResponseEntity<Void> deleteAccount(@AuthenticationPrincipal String userId) {
        authService.deleteAccount(userId);
        return ResponseEntity.noContent().build();
    }
}