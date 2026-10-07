package com.YawaBudget.SB.config;

import com.YawaBudget.SB.model.Category;
import com.YawaBudget.SB.repository.CategoryRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class DatabaseSeeder implements CommandLineRunner {

    private final CategoryRepository categoryRepository;

    public DatabaseSeeder(CategoryRepository categoryRepository) {
        this.categoryRepository = categoryRepository;
    }

    @Override
    public void run(String... args) {
        if (categoryRepository.count() == 0) {
            List<String> defaultCategories = List.of(
                    "Food", "Transport", "Bills", "Shopping", "Entertainment", "Other"
            );

            defaultCategories.forEach(name -> categoryRepository.save(new Category(name)));
            System.out.println("Default categories seeded successfully!");
        }
    }
}