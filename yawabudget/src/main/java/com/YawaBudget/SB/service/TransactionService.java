package com.YawaBudget.SB.service;

import com.YawaBudget.SB.dto.TransactionDto;
import com.YawaBudget.SB.model.Transaction;
import com.YawaBudget.SB.repository.TransactionRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;

@Service
public class TransactionService {
    private final TransactionRepository transactionRepository;
    private final AiService aiService;

    public TransactionService(TransactionRepository transactionRepository, AiService aiService) {
        this.transactionRepository = transactionRepository;
        this.aiService = aiService;
    }

    public TransactionDto createTransaction(String userId, TransactionDto dto) {
        Transaction tx = new Transaction();
        tx.setUserId(userId);
        tx.setAmount(dto.amount());
        tx.setDescription(dto.description());
        tx.setDate(dto.date());
        tx.setType(dto.type());

        if (dto.categoryName() == null || dto.categoryName().isBlank()) {
            tx.setCategoryName(aiService.categorize(dto.description()));
        } else {
            tx.setCategoryName(dto.categoryName());
        }

        return mapToDto(transactionRepository.save(tx));
    }

    public List<TransactionDto> getTransactions(String userId, LocalDate start, LocalDate end) {
        return transactionRepository.findByUserIdAndDateBetween(userId, start, end)
                .stream().map(this::mapToDto).toList();
    }

    private TransactionDto mapToDto(Transaction tx) {
        return new TransactionDto(tx.getId(), tx.getAmount(), tx.getDescription(),
                tx.getCategoryName(), tx.getDate(), tx.getType());
    }
}