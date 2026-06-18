package com.cloudguard.model;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Data
@Document(collection = "custom_policies")
public class CustomPolicy {
    @Id
    private String id;
    private String name;
    private String description;
    private String policyId;        // used as OPA policy path e.g. "cloudguard/custom/no_public_s3"
    private String regoContent;     // full Rego code
    
    public enum ResourceType {
        S3, IAM, EC2
    }
    private ResourceType resourceType;
    private Finding.Severity severity;
    private String framework;       // e.g. "AcmeCorp_Playbook_v1"
    private String controlId;       // e.g. "ACME-S3-01"
    private boolean enabled;
    private Instant createdAt;
    private String createdBy;
}
