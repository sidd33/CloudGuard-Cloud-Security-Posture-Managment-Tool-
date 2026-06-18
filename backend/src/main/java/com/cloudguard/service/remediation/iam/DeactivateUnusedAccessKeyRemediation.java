package com.cloudguard.service.remediation.iam;

import com.cloudguard.model.RemediationResult;
import com.cloudguard.service.remediation.RemediationAction;
import org.springframework.stereotype.Component;
import software.amazon.awssdk.auth.credentials.AwsCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.iam.IamClient;
import software.amazon.awssdk.services.iam.model.GetAccessKeyLastUsedRequest;
import software.amazon.awssdk.services.iam.model.GetAccessKeyLastUsedResponse;
import software.amazon.awssdk.services.iam.model.StatusType;
import software.amazon.awssdk.services.iam.model.UpdateAccessKeyRequest;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

@Component
public class DeactivateUnusedAccessKeyRemediation implements RemediationAction {

    @Override
    public String getCheckId() {
        return "IAM_002";
    }

    @Override
    public RemediationResult remediate(AwsCredentials creds, String resourceId, String region) {
        String username = parseUsername(resourceId);
        String keyId = parseKeyId(resourceId);

        if (username == null || keyId == null) {
            return RemediationResult.builder()
                    .success(false)
                    .message("Failed to parse username or access key ID from resourceId: " + resourceId)
                    .actionTaken("None")
                    .executedAt(Instant.now())
                    .build();
        }

        try (IamClient iamClient = IamClient.builder()
                .region(Region.AWS_GLOBAL)
                .credentialsProvider(StaticCredentialsProvider.create(creds))
                .build()) {

            GetAccessKeyLastUsedRequest lastUsedRequest = GetAccessKeyLastUsedRequest.builder()
                    .accessKeyId(keyId)
                    .build();

            GetAccessKeyLastUsedResponse lastUsedResponse = iamClient.getAccessKeyLastUsed(lastUsedRequest);
            Instant lastUsedDate = lastUsedResponse.accessKeyLastUsed().lastUsedDate();

            if (lastUsedDate != null) {
                long daysSinceLastUsed = ChronoUnit.DAYS.between(lastUsedDate, Instant.now());
                if (daysSinceLastUsed < 90) {
                    return RemediationResult.builder()
                            .success(false)
                            .message("Safety check failed: Access key was used " + daysSinceLastUsed + " days ago (must be 90+ days to auto-remediate).")
                            .actionTaken("IamClient.getAccessKeyLastUsed: Checked usage")
                            .executedAt(Instant.now())
                            .build();
                }
            }

            UpdateAccessKeyRequest updateRequest = UpdateAccessKeyRequest.builder()
                    .userName(username)
                    .accessKeyId(keyId)
                    .status(StatusType.INACTIVE)
                    .build();

            iamClient.updateAccessKey(updateRequest);

            return RemediationResult.builder()
                    .success(true)
                    .message("Successfully deactivated unused access key.")
                    .actionTaken("IamClient.updateAccessKey: status=INACTIVE for " + keyId)
                    .executedAt(Instant.now())
                    .build();

        } catch (Exception e) {
            return RemediationResult.builder()
                    .success(false)
                    .message("Failed to deactivate access key: " + e.getMessage())
                    .actionTaken("Attempted IamClient.updateAccessKey")
                    .executedAt(Instant.now())
                    .build();
        }
    }

    private String parseUsername(String resourceId) {
        // Assume format: arn:aws:iam::123456789:user/username|accessKeyId
        // or just pass as: username/accessKeyId
        if (resourceId != null && resourceId.contains("/")) {
            String[] parts = resourceId.split("/");
            if (parts.length >= 2) {
                String potentialUserKey = parts[parts.length - 1]; // e.g. deploy|AKIA...
                if (potentialUserKey.contains("|")) {
                    return potentialUserKey.split("\\|")[0];
                }
            }
        }
        return null;
    }

    private String parseKeyId(String resourceId) {
        if (resourceId != null && resourceId.contains("|")) {
            String[] parts = resourceId.split("\\|");
            return parts[parts.length - 1];
        }
        return null;
    }
}
