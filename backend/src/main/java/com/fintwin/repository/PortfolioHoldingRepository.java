package com.fintwin.repository;

import com.fintwin.model.PortfolioHolding;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PortfolioHoldingRepository extends MongoRepository<PortfolioHolding, String> {
    List<PortfolioHolding> findByUserId(String userId);
    void deleteByUserId(String userId);
}
