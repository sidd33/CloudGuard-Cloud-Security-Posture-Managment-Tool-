package com.cloudguard.service.remediation;

import com.cloudguard.model.RemediationResult;
import software.amazon.awssdk.auth.credentials.AwsCredentials;

public interface RemediationAction {
    String getCheckId();
    RemediationResult remediate(AwsCredentials creds, String resourceId, String region);
}
