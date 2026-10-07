package com.YawaBudget.SB.service;

import com.YawaBudget.SB.dto.BudgetRequest;
import com.YawaBudget.SB.dto.BudgetSummaryDto;
import com.YawaBudget.SB.model.Budget;
import com.YawaBudget.SB.repository.BudgetRepository;
import org.bson.Document;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.aggregation.Aggregation;
import org.springframework.data.mongodb.core.aggregation.AggregationResults;
import org.springframework.data.mongodb.core.aggregation.GroupOperation;
import org.springframework.data.mongodb.core.aggregation.MatchOperation;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.List;

@Service
public class BudgetService {
    private final BudgetRepository budgetRepository;
    private final MongoTemplate mongoTemplate;

    public BudgetService(BudgetRepository budgetRepository, MongoTemplate mongoTemplate) {
        this.budgetRepository = budgetRepository;
        this.mongoTemplate = mongoTemplate;
    }

    public void setBudget(String userId, BudgetRequest request) {
        Budget budget = budgetRepository.findByUserIdAndCategoryName(userId, request.categoryName())
                .orElse(new Budget());
        budget.setUserId(userId);
        budget.setCategoryName(request.categoryName());
        budget.setMonthlyLimit(request.monthlyLimit());
        budgetRepository.save(budget);
    }

    public List<BudgetSummaryDto> getBudgetSummaries(String userId) {
        List<Budget> budgets = budgetRepository.findByUserId(userId);
        List<BudgetSummaryDto> summaries = new ArrayList<>();

        LocalDate start = YearMonth.now().atDay(1);
        LocalDate end = YearMonth.now().atEndOfMonth();

        for (Budget budget : budgets) {
            MatchOperation match = Aggregation.match(Criteria.where("userId").is(userId)
                    .and("categoryName").is(budget.getCategoryName())
                    .and("type").is("EXPENSE")
                    .and("date").gte(start).lte(end));

            GroupOperation group = Aggregation.group().sum("amount").as("totalSpent");
            Aggregation aggregation = Aggregation.newAggregation(match, group);

            AggregationResults<Document> results = mongoTemplate.aggregate(aggregation, "transactions", Document.class);
            Document result = results.getUniqueMappedResult();

            BigDecimal spent = result != null ? new BigDecimal(result.get("totalSpent").toString()) : BigDecimal.ZERO;
            boolean nearingLimit = spent.compareTo(budget.getMonthlyLimit().multiply(new BigDecimal("0.8"))) >= 0;

            summaries.add(new BudgetSummaryDto(budget.getCategoryName(), budget.getMonthlyLimit(), spent, nearingLimit));
        }
        return summaries;
    }
}