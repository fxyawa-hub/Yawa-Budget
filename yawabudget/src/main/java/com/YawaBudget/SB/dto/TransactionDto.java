package com.YawaBudget.SB.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import java.math.BigDecimal;
import java.time.LocalDate;

public record TransactionDto(
        String id,
        @NotNull @Positive BigDecimal amount,
        @NotBlank String description,
        String categoryName,
        @NotNull LocalDate date,
        @Pattern(regexp = "^(INCOME|EXPENSE)$") String type
) {}