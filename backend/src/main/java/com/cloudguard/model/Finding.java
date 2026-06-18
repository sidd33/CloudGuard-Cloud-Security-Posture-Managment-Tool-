package com.cloudguard.model;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.List;
import java.util.Map;

@Data
@Document(collection = "findings")
public class Finding {
    @Id
    private String id;
    private String accountId;
    private String scanId;
    private Instant timestamp;
    private String service; // "S3", "IAM", "EC2"
    private String resourceId; // ARN or resource name
    private String resourceName;
    private String checkId; // e.g. "S3_001"
    private String title;
    private String description;
    
    public enum Severity {
        CRITICAL, HIGH, MEDIUM, LOW, INFORMATIONAL
    }
    private Severity severity;
    
    public enum Status {
        OPEN, SUPPRESSED, RESOLVED, REMEDIATION_FAILED
    }
    private Status status;
    
    private List<String> framework; // ["CIS_AWS_1.4", "NIST_800-53"]
    private List<String> controlIds; // e.g. ["CIS 2.1.1", "NIST SC-28"]
    private String remediationSteps; // Step-by-step fix instructions
    private String region;
    private Map<String, String> tags;
}
