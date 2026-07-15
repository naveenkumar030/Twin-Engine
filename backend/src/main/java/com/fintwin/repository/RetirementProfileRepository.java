package com.fintwin.repository;

import com.fintwin.model.RetirementProfile;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface RetirementProfileRepository extends MongoRepository<RetirementProfile, String> {
    Optional<RetirementProfile> findByUserId(String userId);
}
