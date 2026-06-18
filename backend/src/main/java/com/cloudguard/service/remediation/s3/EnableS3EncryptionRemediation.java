package com.cloudguard.service.remediation.s3;

import com.cloudguard.model.RemediationResult;
import com.cloudguard.service.remediation.RemediationAction;
import org.springframework.stereotype.Component;
import software.amazon.awssdk.auth.credentials.AwsCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.ServerSideEncryption;
import software.amazon.awssdk.services.s3.model.ServerSideEncryptionByDefault;
import software.amazon.awssdk.services.s3.model.ServerSideEncryptionConfiguration;
import software.amazon.awssdk.services.s3.model.ServerSideEncryptionRule;
import software.amazon.awssdk.services.s3.model.PutBucketEncryptionRequest;

import java.time.Instant;

@Component
public class EnableS3EncryptionRemediation implements RemediationAction {

    @Override
    public String getCheckId() {
        return "S3_002";
    }

    @Override
    public RemediationResult remediate(AwsCredentials creds, String resourceId, String region) {
        String bucketName = parseBucketName(resourceId);

        try (S3Client s3Client = S3Client.builder()
                .region(Region.of(region))
                .credentialsProvider(StaticCredentialsProvider.create(creds))
                .build()) {

            ServerSideEncryptionByDefault sseByDefault = ServerSideEncryptionByDefault.builder()
                    .sseAlgorithm(ServerSideEncryption.AES256)
                    .build();

            ServerSideEncryptionRule rule = ServerSideEncryptionRule.builder()
                    .applyServerSideEncryptionByDefault(sseByDefault)
                    .build();

            ServerSideEncryptionConfiguration config = ServerSideEncryptionConfiguration.builder()
                    .rules(rule)
                    .build();

            PutBucketEncryptionRequest request = PutBucketEncryptionRequest.builder()
                    .bucket(bucketName)
                    .serverSideEncryptionConfiguration(config)
                    .build();

            s3Client.putBucketEncryption(request);

            return RemediationResult.builder()
                    .success(true)
                    .message("Successfully enabled S3 bucket encryption.")
                    .actionTaken("S3Client.putBucketEncryption: SSE-S3 (AES256)")
                    .executedAt(Instant.now())
                    .build();

        } catch (Exception e) {
            return RemediationResult.builder()
                    .success(false)
                    .message("Failed to enable encryption: " + e.getMessage())
                    .actionTaken("Attempted S3Client.putBucketEncryption")
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
