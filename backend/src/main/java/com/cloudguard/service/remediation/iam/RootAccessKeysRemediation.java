package com.cloudguard.service.remediation.iam;

import com.cloudguard.model.RemediationResult;
import com.cloudguard.service.remediation.RemediationAction;
import org.springframework.stereotype.Component;
import software.amazon.awssdk.auth.credentials.AwsCredentials;

import java.time.Instant;

@Component
public class RootAccessKeysRemediation implements RemediationAction {

    @Override
    public String getCheckId() {
        return "IAM_003";
    }

    @Override
    public RemediationResult remediate(AwsCredentials creds, String resourceId, String region) {
        return RemediationResult.builder()
                .success(false)
                .message("Root access keys cannot be deleted programmatically. Delete them manually via AWS Console -> Security Credentials.")
                .actionTaken("Manual Action Required")
                .executedAt(Instant.now())
                .build();
    }
}
