package com.cloudguard.service.remediation;

import com.cloudguard.model.AwsAccount;
import com.cloudguard.model.Finding;
import com.cloudguard.model.RemediationAuditLog;
import com.cloudguard.model.RemediationResult;
import com.cloudguard.repository.AwsAccountRepository;
import com.cloudguard.repository.FindingRepository;
import com.cloudguard.repository.RemediationAuditLogRepository;
import com.cloudguard.util.EncryptionUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;

import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class RemediationService {

    private final Map<String, RemediationAction> actionMap;
    private final FindingRepository findingRepository;
    private final AwsAccountRepository accountRepository;
    private final RemediationAuditLogRepository auditLogRepository;
    private final EncryptionUtil encryptionUtil;

    @Autowired
    public RemediationService(
            List<RemediationAction> actions,
            FindingRepository findingRepository,
            AwsAccountRepository accountRepository,
            RemediationAuditLogRepository auditLogRepository,
            EncryptionUtil encryptionUtil) {
        this.actionMap = actions.stream()
                .collect(Collectors.toMap(RemediationAction::getCheckId, Function.identity()));
        
        // Alias existing string-based check IDs from scanners to new RemediationActions
        actionMap.put("S3_BLOCK_PUBLIC_ACCESS", actionMap.get("S3_001"));
        actionMap.put("S3_DEFAULT_ENCRYPTION_DISABLED", actionMap.get("S3_002"));
        actionMap.put("S3_DEFAULT_ENCRYPTION_NOT_KMS", actionMap.get("S3_002"));
        actionMap.put("S3_VERSIONING_DISABLED", actionMap.get("S3_003"));
        actionMap.put("IAM_WEAK_PASSWORD_POLICY", actionMap.get("IAM_001"));
        actionMap.put("IAM_NO_PASSWORD_POLICY", actionMap.get("IAM_001"));
        actionMap.put("IAM_ACCESS_KEY_ROTATION_REQUIRED", actionMap.get("IAM_002"));
        actionMap.put("IAM_ROOT_ACCESS_KEYS", actionMap.get("IAM_003"));
        actionMap.put("EC2_SSH_PUBLIC", actionMap.get("EC2_001"));
        actionMap.put("EC2_RDP_PUBLIC", actionMap.get("EC2_002"));
        actionMap.put("EC2_IMDSV2_NOT_ENFORCED", actionMap.get("EC2_003"));

        this.findingRepository = findingRepository;
        this.accountRepository = accountRepository;
        this.auditLogRepository = auditLogRepository;
        this.encryptionUtil = encryptionUtil;
    }

    public RemediationResult remediateFinding(String findingId) throws Exception {
        Finding finding = findingRepository.findById(findingId)
                .orElseThrow(() -> new IllegalArgumentException("Finding not found: " + findingId));

        String checkId = finding.getCheckId();
        RemediationAction action = actionMap.get(checkId);

        if (action == null) {
            throw new UnsupportedOperationException("No auto-remediation available for check: " + checkId);
        }

        AwsAccount account = accountRepository.findById(finding.getAccountId())
                .orElseThrow(() -> new IllegalArgumentException("Account not found: " + finding.getAccountId()));

        String accessKey = encryptionUtil.decrypt(account.getEncryptedAccessKey());
        String secretKey = encryptionUtil.decrypt(account.getEncryptedSecretKey());
        AwsBasicCredentials creds = AwsBasicCredentials.create(accessKey, secretKey);

        RemediationResult result = action.remediate(creds, finding.getResourceId(), account.getRegion());

        RemediationAuditLog auditLog = RemediationAuditLog.builder()
                .findingId(finding.getId())
                .checkId(checkId)
                .resourceId(finding.getResourceId())
                .accountId(finding.getAccountId())
                .actionTaken(result.getActionTaken())
                .success(result.isSuccess())
                .message(result.getMessage())
                .executedAt(result.getExecutedAt())
                .build();
        
        auditLogRepository.save(auditLog);

        if (result.isSuccess()) {
            finding.setStatus(Finding.Status.RESOLVED);
        } else {
            finding.setStatus(Finding.Status.REMEDIATION_FAILED);
        }
        findingRepository.save(finding);

        return result;
    }
}
