package com.cloudguard.service.remediation.iam;

import com.cloudguard.model.RemediationResult;
import com.cloudguard.service.remediation.RemediationAction;
import org.springframework.stereotype.Component;
import software.amazon.awssdk.auth.credentials.AwsCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.iam.IamClient;
import software.amazon.awssdk.services.iam.model.UpdateAccountPasswordPolicyRequest;

import java.time.Instant;

@Component
public class EnforcePasswordPolicyRemediation implements RemediationAction {

    @Override
    public String getCheckId() {
        return "IAM_001";
    }

    @Override
    public RemediationResult remediate(AwsCredentials creds, String resourceId, String region) {
        try (IamClient iamClient = IamClient.builder()
                .region(Region.AWS_GLOBAL)
                .credentialsProvider(StaticCredentialsProvider.create(creds))
                .build()) {

            UpdateAccountPasswordPolicyRequest request = UpdateAccountPasswordPolicyRequest.builder()
                    .minimumPasswordLength(14)
                    .requireUppercaseCharacters(true)
                    .requireLowercaseCharacters(true)
                    .requireNumbers(true)
                    .requireSymbols(true)
                    .maxPasswordAge(90)
                    .passwordReusePrevention(24)
                    .build();

            iamClient.updateAccountPasswordPolicy(request);

            return RemediationResult.builder()
                    .success(true)
                    .message("Successfully enforced strict IAM password policy.")
                    .actionTaken("IamClient.updateAccountPasswordPolicy: minLength=14, reqUpper/Lower/Num/Sym=true, maxAge=90, preventReuse=24")
                    .executedAt(Instant.now())
                    .build();

        } catch (Exception e) {
            return RemediationResult.builder()
                    .success(false)
                    .message("Failed to enforce password policy: " + e.getMessage())
                    .actionTaken("Attempted IamClient.updateAccountPasswordPolicy")
                    .executedAt(Instant.now())
                    .build();
        }
    }
}
