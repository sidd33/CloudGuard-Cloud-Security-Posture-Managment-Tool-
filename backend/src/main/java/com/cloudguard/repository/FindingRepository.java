package com.cloudguard.repository;

import com.cloudguard.model.Finding;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FindingRepository extends MongoRepository<Finding, String> {
    List<Finding> findByAccountId(String accountId);
    List<Finding> findByScanId(String scanId);
    List<Finding> findByAccountIdAndStatus(String accountId, Finding.Status status);
}
