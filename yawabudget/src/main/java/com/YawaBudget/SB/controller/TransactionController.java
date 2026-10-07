package com.YawaBudget.SB.controller;

import com.YawaBudget.SB.dto.TransactionDto;
import com.YawaBudget.SB.service.TransactionService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/transactions")
public class TransactionController {
    private final TransactionService transactionService;

    public TransactionController(TransactionService transactionService) {
        this.transactionService = transactionService;
    }

    @PostMapping
    public ResponseEntity<TransactionDto> create(
            @AuthenticationPrincipal String userId,
            @Valid @RequestBody TransactionDto dto) {
        return ResponseEntity.ok(transactionService.createTransaction(userId, dto));
    }

    @GetMapping
    public ResponseEntity<List<TransactionDto>> get(
            @AuthenticationPrincipal String userId,
            @RequestParam LocalDate start,
            @RequestParam LocalDate end) {
        return ResponseEntity.ok(transactionService.getTransactions(userId, start, end));
    }
}