package com.YawaBudget.SB.dto;

import java.math.BigDecimal;

public record BudgetSummaryDto(
        String categoryName,
        BigDecimal limit,
        BigDecimal spent,
        boolean isNearingLimit
) {}