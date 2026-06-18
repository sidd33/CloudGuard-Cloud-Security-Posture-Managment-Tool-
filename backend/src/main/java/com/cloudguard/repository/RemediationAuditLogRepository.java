package com.cloudguard.repository;

import com.cloudguard.model.RemediationAuditLog;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RemediationAuditLogRepository extends MongoRepository<RemediationAuditLog, String> {
    List<RemediationAuditLog> findByFindingId(String findingId);
}
