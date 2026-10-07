package com.YawaBudget.SB.controller;

import com.YawaBudget.SB.dto.BudgetRequest;
import com.YawaBudget.SB.dto.BudgetSummaryDto;
import com.YawaBudget.SB.service.BudgetService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/budgets")
public class BudgetController {
    private final BudgetService budgetService;

    public BudgetController(BudgetService budgetService) {
        this.budgetService = budgetService;
    }

    @PostMapping
    public ResponseEntity<Void> setBudget(
            @AuthenticationPrincipal String userId,
            @Valid @RequestBody BudgetRequest request) {
        budgetService.setBudget(userId, request);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/summary")
    public ResponseEntity<List<BudgetSummaryDto>> getSummary(@AuthenticationPrincipal String userId) {
        return ResponseEntity.ok(budgetService.getBudgetSummaries(userId));
    }
}