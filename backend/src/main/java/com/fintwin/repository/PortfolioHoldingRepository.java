package com.fintwin.repository;

import com.fintwin.model.PortfolioHolding;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PortfolioHoldingRepository extends MongoRepository<PortfolioHolding, String> {
    List<PortfolioHolding> findByUserId(String userId);
    Optional<PortfolioHolding> findByIdAndUserId(String id, String userId);
    void deleteByUserId(String userId);
}
