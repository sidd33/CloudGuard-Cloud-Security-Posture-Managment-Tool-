package com.cloudguard.repository;

import com.cloudguard.model.ScanResult;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ScanResultRepository extends MongoRepository<ScanResult, String> {
    List<ScanResult> findByAccountIdOrderByStartTimeDesc(String accountId);
}
