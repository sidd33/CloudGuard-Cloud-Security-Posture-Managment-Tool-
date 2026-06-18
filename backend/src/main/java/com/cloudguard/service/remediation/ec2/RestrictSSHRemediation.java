package com.cloudguard.service.remediation.ec2;

import com.cloudguard.model.RemediationResult;
import com.cloudguard.service.remediation.RemediationAction;
import org.springframework.stereotype.Component;
import software.amazon.awssdk.auth.credentials.AwsCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.ec2.Ec2Client;
import software.amazon.awssdk.services.ec2.model.IpPermission;
import software.amazon.awssdk.services.ec2.model.IpRange;
import software.amazon.awssdk.services.ec2.model.Ipv6Range;
import software.amazon.awssdk.services.ec2.model.RevokeSecurityGroupIngressRequest;

import java.time.Instant;

@Component
public class RestrictSSHRemediation implements RemediationAction {

    @Override
    public String getCheckId() {
        return "EC2_001";
    }

    @Override
    public RemediationResult remediate(AwsCredentials creds, String resourceId, String region) {
        String sgId = parseSecurityGroupId(resourceId);

        try (Ec2Client ec2Client = Ec2Client.builder()
                .region(Region.of(region))
                .credentialsProvider(StaticCredentialsProvider.create(creds))
                .build()) {

            IpPermission permissionV4 = IpPermission.builder()
                    .ipProtocol("tcp")
                    .fromPort(22)
                    .toPort(22)
                    .ipRanges(IpRange.builder().cidrIp("0.0.0.0/0").build())
                    .build();

            IpPermission permissionV6 = IpPermission.builder()
                    .ipProtocol("tcp")
                    .fromPort(22)
                    .toPort(22)
                    .ipv6Ranges(Ipv6Range.builder().cidrIpv6("::/0").build())
                    .build();

            RevokeSecurityGroupIngressRequest request = RevokeSecurityGroupIngressRequest.builder()
                    .groupId(sgId)
                    .ipPermissions(permissionV4, permissionV6)
                    .build();

            ec2Client.revokeSecurityGroupIngress(request);

            return RemediationResult.builder()
                    .success(true)
                    .message("Successfully restricted SSH access from 0.0.0.0/0 and ::/0.")
                    .actionTaken("Ec2Client.revokeSecurityGroupIngress: tcp/22 for 0.0.0.0/0 and ::/0")
                    .executedAt(Instant.now())
                    .build();

        } catch (Exception e) {
            // It might fail if the rule doesn't exist, which is okay but we should return failure for audit
            return RemediationResult.builder()
                    .success(false)
                    .message("Failed to restrict SSH: " + e.getMessage())
                    .actionTaken("Attempted Ec2Client.revokeSecurityGroupIngress for port 22")
                    .executedAt(Instant.now())
                    .build();
        }
    }

    private String parseSecurityGroupId(String resourceId) {
        // Assume format is just sg-xxx or arn:aws:ec2:us-east-1:123456789:security-group/sg-xxx
        if (resourceId != null && resourceId.contains("sg-")) {
            return resourceId.substring(resourceId.indexOf("sg-"));
        }
        return resourceId;
    }
}
