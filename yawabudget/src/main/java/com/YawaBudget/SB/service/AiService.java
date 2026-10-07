package com.YawaBudget.SB.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class AiService {

    @Value("${ai.llm.api-key}")
    private String apiKey;

    public String categorize(String description) {
        String descLower = description.toLowerCase();
        if (descLower.contains("uber") || descLower.contains("train") || descLower.contains("bus")) return "Transport";
        if (descLower.contains("burger") || descLower.contains("grocery") || descLower.contains("food")) return "Food";
        if (descLower.contains("bill") || descLower.contains("electricity") || descLower.contains("water")) return "Bills";
        if (descLower.contains("movie") || descLower.contains("netflix") || descLower.contains("spotify")) return "Entertainment";
        return "Other";
    }

    public String answerQuestion(String question, String transactionsJson) {
        return "Based on your transaction history, here is your summary response for: " + question;
    }
}