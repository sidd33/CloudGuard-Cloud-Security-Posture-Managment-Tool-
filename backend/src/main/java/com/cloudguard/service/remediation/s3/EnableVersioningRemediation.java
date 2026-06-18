package com.cloudguard.service.remediation.s3;

import com.cloudguard.model.RemediationResult;
import com.cloudguard.service.remediation.RemediationAction;
import org.springframework.stereotype.Component;
import software.amazon.awssdk.auth.credentials.AwsCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.BucketVersioningStatus;
import software.amazon.awssdk.services.s3.model.PutBucketVersioningRequest;
import software.amazon.awssdk.services.s3.model.VersioningConfiguration;

import java.time.Instant;

@Component
public class EnableVersioningRemediation implements RemediationAction {

    @Override
    public String getCheckId() {
        return "S3_003";
    }

    @Override
    public RemediationResult remediate(AwsCredentials creds, String resourceId, String region) {
        String bucketName = parseBucketName(resourceId);

        try (S3Client s3Client = S3Client.builder()
                .region(Region.of(region))
                .credentialsProvider(StaticCredentialsProvider.create(creds))
                .build()) {

            VersioningConfiguration config = VersioningConfiguration.builder()
                    .status(BucketVersioningStatus.ENABLED)
                    .build();

            PutBucketVersioningRequest request = PutBucketVersioningRequest.builder()
                    .bucket(bucketName)
                    .versioningConfiguration(config)
                    .build();

            s3Client.putBucketVersioning(request);

            return RemediationResult.builder()
                    .success(true)
                    .message("Successfully enabled bucket versioning.")
                    .actionTaken("S3Client.putBucketVersioning: status=ENABLED")
                    .executedAt(Instant.now())
                    .build();

        } catch (Exception e) {
            return RemediationResult.builder()
                    .success(false)
                    .message("Failed to enable versioning: " + e.getMessage())
                    .actionTaken("Attempted S3Client.putBucketVersioning")
                    .executedAt(Instant.now())
                    .build();
        }
    }

    private String parseBucketName(String arn) {
        if (arn != null && arn.startsWith("arn:aws:s3:::")) {
            return arn.substring("arn:aws:s3:::".length());
        }
        return arn;
    }
}
