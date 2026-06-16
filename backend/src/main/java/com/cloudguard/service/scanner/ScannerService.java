package com.cloudguard.service.scanner;

import com.cloudguard.model.Finding;
import com.cloudguard.model.ScanType;
import software.amazon.awssdk.auth.credentials.AwsCredentialsProvider;

import java.util.List;

public interface ScannerService {
    String getCategory(); // "S3", "IAM", "EC2", etc.
    List<Finding> scan(AwsCredentialsProvider creds, String region, String accountId, String scanId, ScanType scanType);
}
