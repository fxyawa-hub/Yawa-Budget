package com.YawaBudget.SB.controller;

import com.YawaBudget.SB.dto.AiAskRequest;
import com.YawaBudget.SB.dto.AiAskResponse;
import com.YawaBudget.SB.dto.TransactionDto;
import com.YawaBudget.SB.service.AiService;
import com.YawaBudget.SB.service.TransactionService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/ai")
public class AiController {
    private final AiService aiService;
    private final TransactionService transactionService;

    public AiController(AiService aiService, TransactionService transactionService) {
        this.aiService = aiService;
        this.transactionService = transactionService;
    }

    @PostMapping("/categorize")
    public ResponseEntity<Map<String, String>> categorize(@RequestBody Map<String, String> body) {
        String description = body.get("description");
        if (description == null || description.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Description is required"));
        }
        String category = aiService.categorize(description);
        return ResponseEntity.ok(Map.of("category", category));
    }

    @PostMapping("/ask")
    public ResponseEntity<AiAskResponse> askQuestion(
            @AuthenticationPrincipal String userId,
            @Valid @RequestBody AiAskRequest request) {

        LocalDate start = LocalDate.now().withDayOfMonth(1);
        LocalDate end = LocalDate.now().plusMonths(1).withDayOfMonth(1).minusDays(1);
        List<TransactionDto> transactions = transactionService.getTransactions(userId, start, end);

        String answer = aiService.answerQuestion(request.question(), transactions.toString());
        return ResponseEntity.ok(new AiAskResponse(answer));
    }
}