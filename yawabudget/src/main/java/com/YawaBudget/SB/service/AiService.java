package com.YawaBudget.SB.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;
import java.util.Map;

@Service
public class AiService {

    private static final Logger log = LoggerFactory.getLogger(AiService.class);

    // Must match the category names seeded in the database.
    private static final List<String> CATEGORIES =
            List.of("Food", "Transport", "Bills", "Shopping", "Entertainment", "Other");

    @Value("${ai.llm.api-key:}")
    private String apiKey;

    @Value("${ai.llm.model:gemini-3.7-flash}")
    private String model;

    private final HttpClient http = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(5))
            .build();
    private final ObjectMapper mapper = new ObjectMapper();

    /** Asks the LLM for a category. If anything goes wrong, falls back to simple word rules. */
    public String categorize(String description) {
        String system = "You sort personal spending into exactly one category. "
                + "Valid categories: Food, Transport, Bills, Shopping, Entertainment, Other. "
                + "Reply with ONLY the category name. No punctuation, no explanation.";
        try {
            String reply = callLlm(system, "Transaction: " + description).trim();
            for (String category : CATEGORIES) {
                if (category.equalsIgnoreCase(reply)) {
                    return category;
                }
            }
            log.warn("LLM returned a category that is not in our list, using rules instead");
        } catch (Exception e) {
            log.warn("LLM categorize failed, using rules instead: {}", e.getMessage());
        }
        return categorizeWithRules(description);
    }

    /** Answers a question using ONLY the transactions we pass in. */
    public String answerQuestion(String question, String transactionsJson) {
        String system = "You are the assistant inside Yawa Budget, a personal finance app. "
                + "Answer ONLY using the transactions provided. "
                + "If the data does not contain the answer, say so plainly. "
                + "Never invent numbers. Keep the answer short and friendly.";
        String user = "Transactions this month:\n" + transactionsJson + "\n\nQuestion: " + question;
        try {
            return callLlm(system, user).trim();
        } catch (Exception e) {
            log.warn("LLM answer failed: {}", e.getMessage());
            return "Sorry, I couldn't reach the AI right now. Please try again in a moment.";
        }
    }

    private String callLlm(String system, String user) throws Exception {
        if (apiKey == null || apiKey.isBlank()) {
            throw new IllegalStateException("AI_LLM_API_KEY is not set");
        }
        Map<String, Object> body = Map.of(
                "system_instruction", Map.of("parts", List.of(Map.of("text", system))),
                "contents", List.of(Map.of("parts", List.of(Map.of("text", user)))));

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create("https://generativelanguage.googleapis.com/v1beta/models/"
                        + model + ":generateContent"))
                .timeout(Duration.ofSeconds(15))
                .header("Content-Type", "application/json")
                .header("x-goog-api-key", apiKey)
                .POST(HttpRequest.BodyPublishers.ofString(mapper.writeValueAsString(body)))
                .build();

        HttpResponse<String> response = http.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() != 200) {
            throw new IllegalStateException("LLM returned HTTP " + response.statusCode());
        }
        JsonNode text = mapper.readTree(response.body()).at("/candidates/0/content/parts/0/text");
        if (text.isMissingNode()) {
            throw new IllegalStateException("LLM reply had no text");
        }
        return text.asText();
    }

    // The old word rules, kept as a safety net so the app never breaks when the AI is down.
    private String categorizeWithRules(String description) {
        String d = description.toLowerCase();
        if (d.contains("uber") || d.contains("train") || d.contains("bus")) return "Transport";
        if (d.contains("burger") || d.contains("grocery") || d.contains("food")) return "Food";
        if (d.contains("bill") || d.contains("electricity") || d.contains("water")) return "Bills";
        if (d.contains("movie") || d.contains("netflix") || d.contains("spotify")) return "Entertainment";
        return "Other";
    }
}