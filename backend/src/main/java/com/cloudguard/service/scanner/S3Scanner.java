package com.cloudguard.service.scanner;

import com.cloudguard.model.Finding;
import com.cloudguard.model.ScanType;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.auth.credentials.AwsCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.Bucket;
import software.amazon.awssdk.services.s3.model.GetBucketVersioningResponse;
import software.amazon.awssdk.services.s3.model.BucketVersioningStatus;
import software.amazon.awssdk.services.s3.model.GetPublicAccessBlockResponse;
import software.amazon.awssdk.services.s3.model.GetBucketLoggingResponse;
import software.amazon.awssdk.services.s3.model.GetBucketEncryptionResponse;
import software.amazon.awssdk.services.s3.model.ServerSideEncryptionRule;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Service
public class S3Scanner implements ScannerService {

    private static final Logger log = LoggerFactory.getLogger(S3Scanner.class);

    @Override
    public String getCategory() {
        return "S3";
    }

    @Override
    public List<Finding> scan(AwsCredentialsProvider creds, String regionStr, String accountId, String scanId, ScanType scanType) {
        List<Finding> findings = new ArrayList<>();
        Region region = Region.of(regionStr);
        try (S3Client s3 = S3Client.builder().region(region).credentialsProvider(creds).build()) {
            List<Bucket> buckets = s3.listBuckets().buckets();
            for (Bucket bucket : buckets) {
                // Check Versioning
                try {
                    GetBucketVersioningResponse versioning = s3.getBucketVersioning(b -> b.bucket(bucket.name()));
                    if (versioning.status() == null || versioning.status() == BucketVersioningStatus.SUSPENDED) {
                        findings.add(createFinding(accountId, scanId, bucket.name(), regionStr,
                                "S3_VERSIONING_DISABLED", "S3 Bucket Versioning Disabled",
                                "Bucket versioning is disabled or suspended. Enable it to protect against accidental overwrites/deletes.",
                                Finding.Severity.MEDIUM, "To enable S3 Versioning: Go to S3 Console -> Select bucket -> Properties -> Bucket Versioning -> Edit -> Enable"));
                    }
                } catch (Exception e) {
                    log.warn("Could not check S3 versioning for bucket {}: {}", bucket.name(), e.getMessage());
                }

                // Check Block Public Access
                try {
                    GetPublicAccessBlockResponse bpa = s3.getPublicAccessBlock(b -> b.bucket(bucket.name()));
                    if (bpa.publicAccessBlockConfiguration() == null ||
                        !Boolean.TRUE.equals(bpa.publicAccessBlockConfiguration().blockPublicAcls()) ||
                        !Boolean.TRUE.equals(bpa.publicAccessBlockConfiguration().blockPublicPolicy()) ||
                        !Boolean.TRUE.equals(bpa.publicAccessBlockConfiguration().ignorePublicAcls()) ||
                        !Boolean.TRUE.equals(bpa.publicAccessBlockConfiguration().restrictPublicBuckets())) {
                        
                        findings.add(createFinding(accountId, scanId, bucket.name(), regionStr,
                                "S3_BLOCK_PUBLIC_ACCESS", "S3 Block Public Access Not fully enabled",
                                "S3 Block Public Access should be enabled at the bucket level to prevent unintended public access.",
                                Finding.Severity.HIGH, "To enable S3 Block Public Access: Go to S3 Console -> Select bucket -> Permissions tab -> Block Public Access -> Edit -> Enable all four settings -> Save"));
                    }
                } catch (Exception e) {
                    // If it doesn't exist, it's not fully enabled
                    findings.add(createFinding(accountId, scanId, bucket.name(), regionStr,
                            "S3_BLOCK_PUBLIC_ACCESS", "S3 Block Public Access Not enabled",
                            "S3 Block Public Access is completely disabled for this bucket.",
                            Finding.Severity.CRITICAL, "To enable S3 Block Public Access: Go to S3 Console -> Select bucket -> Permissions tab -> Block Public Access -> Edit -> Enable all four settings -> Save"));
                }

                if (scanType == ScanType.DEEP) {
                    // Check Server Access Logging
                    try {
                        GetBucketLoggingResponse logging = s3.getBucketLogging(b -> b.bucket(bucket.name()));
                        if (logging.loggingEnabled() == null) {
                            findings.add(createFinding(accountId, scanId, bucket.name(), regionStr,
                                    "S3_SERVER_ACCESS_LOGGING_DISABLED", "S3 Server Access Logging is disabled",
                                    "Server Access Logging provides detailed records for the requests that are made to a bucket. (Deep Scan Check)",
                                    Finding.Severity.LOW, "To fix: Go to S3 Console -> Select bucket -> Properties -> Server access logging -> Edit -> Enable"));
                        }
                    } catch (Exception e) {
                        log.warn("Could not check S3 logging for bucket {}: {}", bucket.name(), e.getMessage());
                    }

                    // Check Encryption uses KMS
                    try {
                        GetBucketEncryptionResponse encryption = s3.getBucketEncryption(b -> b.bucket(bucket.name()));
                        boolean usesKms = false;
                        if (encryption.serverSideEncryptionConfiguration() != null) {
                            for (ServerSideEncryptionRule rule : encryption.serverSideEncryptionConfiguration().rules()) {
                                if (software.amazon.awssdk.services.s3.model.ServerSideEncryption.AWS_KMS.equals(rule.applyServerSideEncryptionByDefault().sseAlgorithm())) {
                                    usesKms = true;
                                    break;
                                }
                            }
                        }
                        if (!usesKms) {
                            findings.add(createFinding(accountId, scanId, bucket.name(), regionStr,
                                    "S3_DEFAULT_ENCRYPTION_NOT_KMS", "S3 Default Encryption does not use KMS",
                                    "Bucket encryption is enabled, but it does not use AWS KMS (SSE-KMS) which is recommended for strict control. (Deep Scan Check)",
                                    Finding.Severity.LOW, "To fix: Go to S3 Console -> Select bucket -> Properties -> Default encryption -> Edit -> Select SSE-KMS"));
                        }
                    } catch (Exception e) {
                        findings.add(createFinding(accountId, scanId, bucket.name(), regionStr,
                                "S3_DEFAULT_ENCRYPTION_DISABLED", "S3 Default Encryption is disabled",
                                "S3 buckets should have default encryption enabled using KMS. (Deep Scan Check)",
                                Finding.Severity.MEDIUM, "To fix: Go to S3 Console -> Select bucket -> Properties -> Default encryption -> Edit -> Select SSE-KMS"));
                    }
                }
            }
        } catch (Exception e) {
            log.error("Error executing S3 scan for account {}: {}", accountId, e.getMessage(), e);
        }
        return findings;
    }

    private Finding createFinding(String accountId, String scanId, String resourceName, String region,
                                  String checkId, String title, String desc, Finding.Severity severity, String rem) {
        Finding f = new Finding();
        f.setAccountId(accountId);
        f.setScanId(scanId);
        f.setTimestamp(Instant.now());
        f.setService("S3");
        f.setResourceId("arn:aws:s3:::" + resourceName);
        f.setResourceName(resourceName);
        f.setCheckId(checkId);
        f.setTitle(title);
        f.setDescription(desc);
        f.setSeverity(severity);
        f.setStatus(Finding.Status.OPEN);
        f.setRemediationSteps(rem);
        f.setRegion(region);
        f.setFramework(List.of("CIS_AWS_1.4")); // To be enriched
        f.setControlIds(List.of()); // To be enriched
        return f;
    }
}
