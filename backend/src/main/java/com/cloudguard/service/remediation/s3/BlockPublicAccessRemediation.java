package com.cloudguard.service.remediation.s3;

import com.cloudguard.model.RemediationResult;
import com.cloudguard.service.remediation.RemediationAction;
import org.springframework.stereotype.Component;
import software.amazon.awssdk.auth.credentials.AwsCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.PublicAccessBlockConfiguration;
import software.amazon.awssdk.services.s3.model.PutPublicAccessBlockRequest;

import java.time.Instant;

@Component
public class BlockPublicAccessRemediation implements RemediationAction {

    @Override
    public String getCheckId() {
        return "S3_001";
    }

    @Override
    public RemediationResult remediate(AwsCredentials creds, String resourceId, String region) {
        String bucketName = parseBucketName(resourceId);
        
        try (S3Client s3Client = S3Client.builder()
                .region(Region.of(region))
                .credentialsProvider(StaticCredentialsProvider.create(creds))
                .build()) {

            PublicAccessBlockConfiguration configuration = PublicAccessBlockConfiguration.builder()
                    .blockPublicAcls(true)
                    .ignorePublicAcls(true)
                    .blockPublicPolicy(true)
                    .restrictPublicBuckets(true)
                    .build();

            PutPublicAccessBlockRequest request = PutPublicAccessBlockRequest.builder()
                    .bucket(bucketName)
                    .publicAccessBlockConfiguration(configuration)
                    .build();

            s3Client.putPublicAccessBlock(request);

            return RemediationResult.builder()
                    .success(true)
                    .message("Successfully blocked public access.")
                    .actionTaken("S3Client.putPublicAccessBlock: blockPublicAcls=true, ignorePublicAcls=true, blockPublicPolicy=true, restrictPublicBuckets=true")
                    .executedAt(Instant.now())
                    .build();

        } catch (Exception e) {
            return RemediationResult.builder()
                    .success(false)
                    .message("Failed to block public access: " + e.getMessage())
                    .actionTaken("Attempted S3Client.putPublicAccessBlock")
                    .executedAt(Instant.now())
                    .build();
        }
    }

    private String parseBucketName(String arn) {
        // e.g. arn:aws:s3:::prod-backups -> prod-backups
        if (arn != null && arn.startsWith("arn:aws:s3:::")) {
            return arn.substring("arn:aws:s3:::".length());
        }
        return arn;
    }
}
