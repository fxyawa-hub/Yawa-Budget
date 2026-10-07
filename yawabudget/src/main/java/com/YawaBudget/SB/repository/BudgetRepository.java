package com.YawaBudget.SB.repository;

import com.YawaBudget.SB.model.Budget;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface BudgetRepository extends MongoRepository<Budget, String> {
    Optional<Budget> findByUserIdAndCategoryName(String userId, String categoryName);
    List<Budget> findByUserId(String userId);
    void deleteByUserId(String userId);
}