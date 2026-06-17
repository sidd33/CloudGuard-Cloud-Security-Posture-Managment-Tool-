package com.cloudguard.service.scanner;

import com.cloudguard.model.Finding;
import com.cloudguard.model.ScanType;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.auth.credentials.AwsCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.iam.IamClient;
import software.amazon.awssdk.services.iam.model.GetAccountSummaryResponse;
import software.amazon.awssdk.services.iam.model.ListUsersResponse;
import software.amazon.awssdk.services.iam.model.User;
import software.amazon.awssdk.services.iam.model.GetAccountPasswordPolicyResponse;
import software.amazon.awssdk.services.iam.model.ListRolesResponse;
import software.amazon.awssdk.services.iam.model.Role;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
public class IAMScanner implements ScannerService {

    private static final Logger log = LoggerFactory.getLogger(IAMScanner.class);

    @Override
    public String getCategory() {
        return "IAM";
    }

    @Override
    public List<Finding> scan(AwsCredentialsProvider creds, String regionStr, String accountId, String scanId, ScanType scanType) {
        List<Finding> findings = new ArrayList<>();
        // IAM is global, region is usually aws-global
        try (IamClient iam = IamClient.builder().region(Region.AWS_GLOBAL).credentialsProvider(creds).build()) {
            
            try {
                GetAccountSummaryResponse summary = iam.getAccountSummary();
                Map<String, Integer> summaryMap = summary.summaryMapAsStrings();

                // Root MFA
                if (summaryMap.getOrDefault("AccountMFAEnabled", 0) == 0) {
                    findings.add(createFinding(accountId, scanId, "RootAccount", "global",
                            "IAM_ROOT_MFA_DISABLED", "Root account does not have MFA enabled",
                            "The root account is the most privileged user in an AWS account. MFA adds an extra layer of protection.",
                            Finding.Severity.CRITICAL, "To enable Root MFA: Sign in as Root -> IAM -> Security credentials -> Assign MFA device"));
                }
                
                // Root Access Keys
                if (summaryMap.getOrDefault("AccountAccessKeysPresent", 0) > 0) {
                    findings.add(createFinding(accountId, scanId, "RootAccount", "global",
                            "IAM_ROOT_ACCESS_KEYS", "Root account has active access keys",
                            "Root access keys provide unrestricted access to your AWS resources. They should be deleted.",
                            Finding.Severity.CRITICAL, "To delete Root keys: Sign in as Root -> IAM -> Security credentials -> Access keys -> Delete"));
                }
            } catch (Exception e) {
                log.warn("Could not get IAM account summary for account {}: {}", accountId, e.getMessage());
            }

            if (scanType == ScanType.DEEP) {
                try {
                    GetAccountPasswordPolicyResponse passPolicy = iam.getAccountPasswordPolicy();
                    var policy = passPolicy.passwordPolicy();
                    if (policy.minimumPasswordLength() == null || policy.minimumPasswordLength() < 14 ||
                        !Boolean.TRUE.equals(policy.requireLowercaseCharacters()) ||
                        !Boolean.TRUE.equals(policy.requireUppercaseCharacters()) ||
                        !Boolean.TRUE.equals(policy.requireNumbers()) ||
                        !Boolean.TRUE.equals(policy.requireSymbols())) {
                        findings.add(createFinding(accountId, scanId, "PasswordPolicy", "global",
                                "IAM_WEAK_PASSWORD_POLICY", "IAM Password Policy is weak",
                                "Password policy should require at least 14 characters, uppercase, lowercase, numbers, and symbols. (Deep Scan Check)",
                                Finding.Severity.MEDIUM, "To fix: Go to IAM Console -> Account settings -> Password policy -> Edit -> Enforce strict requirements"));
                    }
                } catch (Exception e) {
                    findings.add(createFinding(accountId, scanId, "PasswordPolicy", "global",
                            "IAM_NO_PASSWORD_POLICY", "No custom IAM Password Policy found",
                            "A custom password policy is not configured for the account. (Deep Scan Check)",
                            Finding.Severity.MEDIUM, "To fix: Go to IAM Console -> Account settings -> Password policy -> Edit -> Create strict policy"));
                }
            }

            // Users list
            try {
                ListUsersResponse usersResp = iam.listUsers();
                for (User user : usersResp.users()) {
                    try {
                        var mfaResp = iam.listMFADevices(r -> r.userName(user.userName()));
                        if (mfaResp.mfaDevices().isEmpty()) {
                            findings.add(createUserFinding(accountId, scanId, user.userName(), "global",
                                    "IAM_USER_MFA_DISABLED", "IAM User MFA Disabled",
                                    "IAM user '" + user.userName() + "' does not have multi-factor authentication (MFA) enabled.",
                                    Finding.Severity.HIGH, "To enable MFA for " + user.userName() + ": Go to IAM Console -> Users -> select " + user.userName() + " -> Security credentials -> Assign MFA device"));
                        }
                    } catch (Exception e) {
                        log.warn("Could not check MFA for user {}: {}", user.userName(), e.getMessage());
                    }

                    // Check active access key rotation age (>90 days old)
                    try {
                        var keysResp = iam.listAccessKeys(r -> r.userName(user.userName()));
                        for (var keyMeta : keysResp.accessKeyMetadata()) {
                            if (software.amazon.awssdk.services.iam.model.StatusType.ACTIVE.equals(keyMeta.status())) {
                                Instant createDate = keyMeta.createDate();
                                long daysOld = java.time.temporal.ChronoUnit.DAYS.between(createDate, Instant.now());
                                if (daysOld > 90) {
                                    findings.add(createUserFinding(accountId, scanId, user.userName(), "global",
                                            "IAM_ACCESS_KEY_ROTATION_REQUIRED", "Access Key Rotation Required (>90 days old)",
                                            "Active access key '" + keyMeta.accessKeyId() + "' for user '" + user.userName() + "' was created " + daysOld + " days ago. Keys should be rotated every 90 days.",
                                            Finding.Severity.MEDIUM, "To fix: Go to IAM Console -> Users -> select " + user.userName() + " -> Security credentials -> Deactivate/Delete access key '" + keyMeta.accessKeyId() + "' and create a new one"));
                                }
                            }
                        }
                    } catch (Exception e) {
                        log.warn("Could not check access key age for user {}: {}", user.userName(), e.getMessage());
                    }
                }
            } catch (Exception e) {
                log.warn("Could not list IAM users for account {}: {}", accountId, e.getMessage());
            }

            // Roles list
            try {
                ObjectMapper mapper = new ObjectMapper();
                ListRolesResponse rolesResp = iam.listRoles();
                for (Role role : rolesResp.roles()) {
                    // Skip service-linked roles and SSO managed roles
                    if (role.path().startsWith("/aws-service-role/") || role.arn().contains("aws-reserved/sso.amazonaws.com/")) {
                        continue;
                    }
                    try {
                        String policyStr = URLDecoder.decode(role.assumeRolePolicyDocument(), StandardCharsets.UTF_8.name());
                        
                        try {
                            java.nio.file.Files.write(
                                java.nio.file.Paths.get("d:\\GIT-PROJ\\roles_debug.txt"), 
                                (role.roleName() + ": " + policyStr + "\n").getBytes(), 
                                java.nio.file.StandardOpenOption.CREATE, 
                                java.nio.file.StandardOpenOption.APPEND
                            );
                        } catch (Exception e) {}

                        JsonNode policyNode = mapper.readTree(policyStr);
                        JsonNode statements = policyNode.path("Statement");
                        
                        java.util.List<JsonNode> stmtList = new java.util.ArrayList<>();
                        if (statements.isArray()) {
                            statements.forEach(stmtList::add);
                        } else if (statements.isObject()) {
                            stmtList.add(statements);
                        }

                        for (JsonNode stmt : stmtList) {
                            if ("Allow".equals(stmt.path("Effect").asText())) {
                                JsonNode principal = stmt.path("Principal");
                                boolean isWildcard = false;
                                if (principal.isTextual() && principal.asText().contains("*")) {
                                    isWildcard = true;
                                } else if (principal.has("AWS")) {
                                    JsonNode awsPrincipal = principal.get("AWS");
                                    if (awsPrincipal.isTextual() && awsPrincipal.asText().contains("*")) {
                                        isWildcard = true;
                                    } else if (awsPrincipal.isArray()) {
                                        for (JsonNode p : awsPrincipal) {
                                            if (p.asText().contains("*")) {
                                                isWildcard = true;
                                                break;
                                            }
                                        }
                                    }
                                }
                                
                                if (isWildcard) {
                                    findings.add(createRoleFinding(accountId, scanId, role.roleName(), "global",
                                            "IAM_OVERLY_PERMISSIVE_ROLE", "Overly Permissive IAM Role Trust Policy",
                                            "IAM Role '" + role.roleName() + "' allows AssumeRole from wildcard accounts (*).",
                                            Finding.Severity.CRITICAL, "To fix: Go to IAM Console -> Roles -> " + role.roleName() + " -> Trust relationships -> Edit trust policy to remove wildcard (*) and restrict Principal to specific trusted accounts."));
                                }
                            }
                        }
                    } catch (Exception e) {
                        log.warn("Could not parse trust policy for role {}: {}", role.roleName(), e.getMessage());
                    }
                }
            } catch (Exception e) {
                log.warn("Could not list IAM roles for account {}: {}", accountId, e.getMessage());
            }

        } catch (Exception e) {
            log.error("Error executing IAM scan for account {}: {}", accountId, e.getMessage(), e);
        }
        return findings;
    }

    private Finding createUserFinding(String accountId, String scanId, String userName, String region,
                                      String checkId, String title, String desc, Finding.Severity severity, String rem) {
        Finding f = new Finding();
        f.setAccountId(accountId);
        f.setScanId(scanId);
        f.setTimestamp(Instant.now());
        f.setService("IAM");
        f.setResourceId("arn:aws:iam::" + accountId + ":user/" + userName);
        f.setResourceName(userName);
        f.setCheckId(checkId);
        f.setTitle(title);
        f.setDescription(desc);
        f.setSeverity(severity);
        f.setStatus(Finding.Status.OPEN);
        f.setRemediationSteps(rem);
        f.setRegion(region);
        f.setFramework(List.of("CIS_AWS_1.4", "NIST_800_53"));
        f.setControlIds(List.of("CIS-1.16", "NIST-AC-3"));
        return f;
    }

    private Finding createRoleFinding(String accountId, String scanId, String roleName, String region,
                                      String checkId, String title, String desc, Finding.Severity severity, String rem) {
        Finding f = new Finding();
        f.setAccountId(accountId);
        f.setScanId(scanId);
        f.setTimestamp(Instant.now());
        f.setService("IAM");
        f.setResourceId("arn:aws:iam::" + accountId + ":role/" + roleName);
        f.setResourceName(roleName);
        f.setCheckId(checkId);
        f.setTitle(title);
        f.setDescription(desc);
        f.setSeverity(severity);
        f.setStatus(Finding.Status.OPEN);
        f.setRemediationSteps(rem);
        f.setRegion(region);
        f.setFramework(List.of("CIS_AWS_1.4", "NIST_800_53"));
        f.setControlIds(List.of("CIS-1.4", "NIST-IA-5"));
        return f;
    }

    private Finding createFinding(String accountId, String scanId, String resourceName, String region,
                                  String checkId, String title, String desc, Finding.Severity severity, String rem) {
        Finding f = new Finding();
        f.setAccountId(accountId);
        f.setScanId(scanId);
        f.setTimestamp(Instant.now());
        f.setService("IAM");
        f.setResourceId("arn:aws:iam::" + accountId + ":root");
        f.setResourceName(resourceName);
        f.setCheckId(checkId);
        f.setTitle(title);
        f.setDescription(desc);
        f.setSeverity(severity);
        f.setStatus(Finding.Status.OPEN);
        f.setRemediationSteps(rem);
        f.setRegion(region);
        f.setFramework(List.of("CIS_AWS_1.4", "NIST_800_53"));
        f.setControlIds(List.of("CIS-1.14", "NIST-IA-2"));
        return f;
    }
}
