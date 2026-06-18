package com.cloudguard.model;

import lombok.Builder;
import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Data
@Builder
@Document(collection = "remediation_audit_logs")
public class RemediationAuditLog {
    @Id
    private String id;
    private String findingId;
    private String checkId;
    private String resourceId;
    private String accountId;
    private String actionTaken;
    private boolean success;
    private String message;
    private Instant executedAt;
}
