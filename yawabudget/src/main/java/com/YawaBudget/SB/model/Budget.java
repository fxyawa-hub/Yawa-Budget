package com.YawaBudget.SB.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.math.BigDecimal;

@Document(collection = "budgets")
public class Budget {
    @Id
    private String id;

    @Indexed
    private String userId;

    private String categoryName;
    private BigDecimal monthlyLimit;

    public Budget() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }

    public String getCategoryName() { return categoryName; }
    public void setCategoryName(String categoryName) { this.categoryName = categoryName; }

    public BigDecimal getMonthlyLimit() { return monthlyLimit; }
    public void setMonthlyLimit(BigDecimal monthlyLimit) { this.monthlyLimit = monthlyLimit; }
}