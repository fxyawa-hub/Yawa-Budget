package com.YawaBudget.SB.repository;

import com.YawaBudget.SB.model.Category;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface CategoryRepository extends MongoRepository<Category, String> {
}