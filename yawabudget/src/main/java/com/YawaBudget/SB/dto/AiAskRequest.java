package com.YawaBudget.SB.dto;

import jakarta.validation.constraints.NotBlank;

public record AiAskRequest(@NotBlank String question) {}