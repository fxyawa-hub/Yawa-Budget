package com.YawaBudget.SB.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.math.BigDecimal;

public record BudgetRequest(
        @NotBlank String categoryName,
        @NotNull @Positive BigDecimal monthlyLimit
) {}