package com.YawaBudget.SB.repository;

import com.YawaBudget.SB.model.Transaction;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.time.LocalDate;
import java.util.List;

public interface TransactionRepository extends MongoRepository<Transaction, String> {
    List<Transaction> findByUserIdAndDateBetween(String userId, LocalDate start, LocalDate end);
    void deleteByUserId(String userId);
}