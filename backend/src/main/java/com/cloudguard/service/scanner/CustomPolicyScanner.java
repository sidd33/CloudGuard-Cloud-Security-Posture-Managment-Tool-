package com.cloudguard.service.scanner;

import com.cloudguard.model.CustomPolicy;
import com.cloudguard.model.Finding;
import com.cloudguard.model.ScanType;
import com.cloudguard.repository.CustomPolicyRepository;
import com.cloudguard.service.opa.OpaClient;
import com.cloudguard.service.opa.ResourceStateCollector;
import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.auth.credentials.AwsCredentialsProvider;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;

@Service
public class CustomPolicyScanner implements ScannerService {

    private final CustomPolicyRepository repository;
    private final OpaClient opaClient;
    private final ResourceStateCollector stateCollector;

    public CustomPolicyScanner(CustomPolicyRepository repository, OpaClient opaClient, ResourceStateCollector stateCollector) {
        this.repository = repository;
        this.opaClient = opaClient;
        this.stateCollector = stateCollector;
    }

    @Override
    public String getCategory() {
        return "CUSTOM";
    }

    @Override
    public List<Finding> scan(AwsCredentialsProvider creds, String region, String accountId, String scanId, ScanType scanType) {
        List<Finding> findings = new ArrayList<>();
        List<CustomPolicy> activePolicies = repository.findByEnabledTrue();

        if (activePolicies.isEmpty()) {
            return findings;
        }

        Map<String, Object> s3State = null;
        Map<String, Object> iamState = null;
        Map<String, Object> ec2State = null;

        for (CustomPolicy policy : activePolicies) {
            Map<String, Object> inputState = null;
            switch (policy.getResourceType()) {
                case S3:
                    if (s3State == null) s3State = stateCollector.collectS3State(creds, region);
                    inputState = s3State;
                    break;
                case IAM:
                    if (iamState == null) iamState = stateCollector.collectIamState(creds);
                    inputState = iamState;
                    break;
                case EC2:
                    if (ec2State == null) ec2State = stateCollector.collectEc2State(creds, region);
                    inputState = ec2State;
                    break;
            }

            if (inputState != null) {
                try {
                    JsonNode result = opaClient.evaluatePolicy(policy.getPolicyId(), inputState);
                    if (result != null && result.has("result")) {
                        JsonNode violations = result.get("result").get("violation");
                        if (violations != null && violations.isArray()) {
                            for (JsonNode v : violations) {
                                Finding f = new Finding();
                                f.setAccountId(accountId);
                                f.setScanId(scanId);
                                f.setTimestamp(Instant.now());
                                f.setService(policy.getResourceType().name());
                                f.setResourceId(v.has("resource_arn") ? v.get("resource_arn").asText() : "unknown");
                                f.setResourceName(f.getResourceId());
                                f.setCheckId(policy.getControlId());
                                f.setTitle(v.has("title") ? v.get("title").asText() : policy.getName());
                                f.setDescription(v.has("description") ? v.get("description").asText() : policy.getDescription());
                                
                                String sevStr = v.has("severity") ? v.get("severity").asText() : policy.getSeverity().name();
                                f.setSeverity(Finding.Severity.valueOf(sevStr));
                                
                                f.setStatus(Finding.Status.OPEN);
                                f.setFramework(Collections.singletonList(policy.getFramework() != null ? policy.getFramework() : "CUSTOM"));
                                f.setRegion(region);
                                findings.add(f);
                            }
                        }
                    }
                } catch (Exception e) {
                    System.err.println("Failed to evaluate custom policy: " + policy.getPolicyId() + " - " + e.getMessage());
                }
            }
        }

        return findings;
    }
}
