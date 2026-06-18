package com.cloudguard.service.remediation.ec2;

import com.cloudguard.model.RemediationResult;
import com.cloudguard.service.remediation.RemediationAction;
import org.springframework.stereotype.Component;
import software.amazon.awssdk.auth.credentials.AwsCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.ec2.Ec2Client;
import software.amazon.awssdk.services.ec2.model.HttpTokensState;
import software.amazon.awssdk.services.ec2.model.InstanceMetadataOptionsRequest;
import software.amazon.awssdk.services.ec2.model.ModifyInstanceMetadataOptionsRequest;

import java.time.Instant;

@Component
public class EnableIMDSv2Remediation implements RemediationAction {

    @Override
    public String getCheckId() {
        return "EC2_003";
    }

    @Override
    public RemediationResult remediate(AwsCredentials creds, String resourceId, String region) {
        String instanceId = parseInstanceId(resourceId);

        try (Ec2Client ec2Client = Ec2Client.builder()
                .region(Region.of(region))
                .credentialsProvider(StaticCredentialsProvider.create(creds))
                .build()) {

            ModifyInstanceMetadataOptionsRequest request = ModifyInstanceMetadataOptionsRequest.builder()
                    .instanceId(instanceId)
                    .httpTokens(HttpTokensState.REQUIRED)
                    .build();

            ec2Client.modifyInstanceMetadataOptions(request);

            return RemediationResult.builder()
                    .success(true)
                    .message("Successfully enforced IMDSv2 (HTTP Tokens = REQUIRED).")
                    .actionTaken("Ec2Client.modifyInstanceMetadataOptions: httpTokens=required")
                    .executedAt(Instant.now())
                    .build();

        } catch (Exception e) {
            return RemediationResult.builder()
                    .success(false)
                    .message("Failed to enforce IMDSv2: " + e.getMessage())
                    .actionTaken("Attempted Ec2Client.modifyInstanceMetadataOptions")
                    .executedAt(Instant.now())
                    .build();
        }
    }

    private String parseInstanceId(String resourceId) {
        // e.g. arn:aws:ec2:us-east-1:123456789:instance/i-0c1a2b3c
        if (resourceId != null && resourceId.contains("i-")) {
            return resourceId.substring(resourceId.indexOf("i-"));
        }
        return resourceId;
    }
}
