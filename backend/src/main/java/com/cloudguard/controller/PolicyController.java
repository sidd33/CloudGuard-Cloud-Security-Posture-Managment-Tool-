package com.cloudguard.controller;

import com.cloudguard.model.CustomPolicy;
import com.cloudguard.repository.CustomPolicyRepository;
import com.cloudguard.service.opa.OpaClient;
import com.cloudguard.service.opa.ResourceStateCollector;
import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import software.amazon.awssdk.auth.credentials.DefaultCredentialsProvider;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/policies")
@CrossOrigin(origins = "*")
public class PolicyController {

    @Autowired
    private CustomPolicyRepository repository;

    @Autowired
    private OpaClient opaClient;

    @Autowired
    private ResourceStateCollector stateCollector;

    @GetMapping
    public List<CustomPolicy> listPolicies() {
        return repository.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<CustomPolicy> getPolicy(@PathVariable String id) {
        return repository.findById(id).map(ResponseEntity::ok).orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public CustomPolicy createPolicy(@RequestBody CustomPolicy policy) {
        policy.setCreatedAt(Instant.now());
        CustomPolicy saved = repository.save(policy);
        opaClient.uploadPolicy(saved.getPolicyId(), saved.getRegoContent());
        return saved;
    }

    @PutMapping("/{id}")
    public ResponseEntity<CustomPolicy> updatePolicy(@PathVariable String id, @RequestBody CustomPolicy policy) {
        return repository.findById(id).map(existing -> {
            policy.setId(existing.getId());
            policy.setCreatedAt(existing.getCreatedAt());
            CustomPolicy saved = repository.save(policy);
            opaClient.uploadPolicy(saved.getPolicyId(), saved.getRegoContent());
            return ResponseEntity.ok(saved);
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletePolicy(@PathVariable String id) {
        return repository.findById(id).map(policy -> {
            repository.delete(policy);
            try {
                opaClient.deletePolicy(policy.getPolicyId());
            } catch (Exception e) {}
            return ResponseEntity.ok().<Void>build();
        }).orElse(ResponseEntity.notFound().build());
    }

    @PatchMapping("/{id}/toggle")
    public ResponseEntity<CustomPolicy> togglePolicy(@PathVariable String id) {
        return repository.findById(id).map(policy -> {
            policy.setEnabled(!policy.isEnabled());
            return ResponseEntity.ok(repository.save(policy));
        }).orElse(ResponseEntity.notFound().build());
    }

    @Autowired
    private com.cloudguard.service.AccountService accountService;

    @Autowired
    private com.cloudguard.repository.AwsAccountRepository accountRepository;

    @PostMapping("/{id}/test")
    public ResponseEntity<?> testPolicy(@PathVariable String id, @RequestParam(defaultValue = "ap-south-1") String region, @RequestParam String accountId) {
        return repository.findById(id).map(policy -> {
            try {
                com.cloudguard.model.AwsAccount account = accountRepository.findById(accountId).orElseThrow();
                software.amazon.awssdk.auth.credentials.AwsCredentialsProvider creds = accountService.getCredentialsProvider(account);
                Map<String, Object> input = null;
                switch(policy.getResourceType()) {
                    case S3: input = stateCollector.collectS3State(creds, region); break;
                    case EC2: input = stateCollector.collectEc2State(creds, region); break;
                    case IAM: input = stateCollector.collectIamState(creds); break;
                }
                if (input == null) return ResponseEntity.badRequest().body(Map.of("error", "Unsupported resource type"));
                JsonNode res = opaClient.evaluatePolicy(policy.getPolicyId(), input);
                return ResponseEntity.ok(res);
            } catch (Exception e) {
                return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
            }
        }).orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/templates")
    public List<Map<String, String>> getTemplates() {
        List<Map<String, String>> templates = new ArrayList<>();
        templates.add(Map.of("name", "Template 1 — No public S3 buckets", "content", "package cloudguard.custom.no_public_s3\n\nimport rego.v1\n\nviolation contains msg if {\n  bucket := input.buckets[_]\n  bucket.public_access_blocked == false\n  msg := {\n    \"resource_arn\": bucket.arn,\n    \"title\": \"S3 bucket has public access enabled\",\n    \"description\": sprintf(\"Bucket '%v' does not have Block Public Access enabled\", [bucket.name]),\n    \"severity\": \"CRITICAL\"\n  }\n}"));
        templates.add(Map.of("name", "Template 2 — Require MFA for all IAM users", "content", "package cloudguard.custom.require_mfa\n\nimport rego.v1\n\nviolation contains msg if {\n  user := input.users[_]\n  user.mfa_enabled == false\n  msg := {\n    \"resource_arn\": user.arn,\n    \"title\": \"IAM user does not have MFA enabled\",\n    \"description\": sprintf(\"User '%v' has console access without MFA\", [user.username]),\n    \"severity\": \"HIGH\"\n  }\n}"));
        templates.add(Map.of("name", "Template 3 — Enforce Department tag on EC2", "content", "package cloudguard.custom.require_department_tag\n\nimport rego.v1\n\nviolation contains msg if {\n  instance := input.instances[_]\n  not instance.tags[\"Department\"]\n  msg := {\n    \"resource_arn\": instance.arn,\n    \"title\": \"EC2 instance missing required Department tag\",\n    \"description\": sprintf(\"Instance '%v' does not have a Department tag\", [instance.instance_id]),\n    \"severity\": \"MEDIUM\"\n  }\n}"));
        templates.add(Map.of("name", "Template 4 — Require Department tag matches specific values", "content", "package cloudguard.custom.valid_department_tag\n\nimport rego.v1\n\nvalid_departments := {\"Engineering\", \"Finance\", \"HR\", \"DevOps\"}\n\nviolation contains msg if {\n  instance := input.instances[_]\n  dept := instance.tags[\"Department\"]\n  not valid_departments[dept]\n  msg := {\n    \"resource_arn\": instance.arn,\n    \"title\": \"EC2 instance has invalid Department tag value\",\n    \"description\": sprintf(\"Instance '%v' has Department='%v', must be one of: Engineering, Finance, HR, DevOps\", [instance.instance_id, dept]),\n    \"severity\": \"LOW\"\n  }\n}"));
        templates.add(Map.of("name", "Template 5 — Password policy enforcement", "content", "package cloudguard.custom.password_policy\n\nimport rego.v1\n\nviolation contains msg if {\n  input.password_policy.min_length < 14\n  msg := {\n    \"resource_arn\": \"arn:aws:iam::account:root\",\n    \"title\": \"IAM password policy minimum length below 14\",\n    \"description\": sprintf(\"Current minimum length is %v, required 14+\", [input.password_policy.min_length]),\n    \"severity\": \"HIGH\"\n  }\n}"));
        return templates;
    }
}
