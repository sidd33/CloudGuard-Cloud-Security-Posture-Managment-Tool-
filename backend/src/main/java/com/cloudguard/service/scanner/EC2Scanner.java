package com.cloudguard.service.scanner;

import com.cloudguard.model.Finding;
import com.cloudguard.model.ScanType;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.auth.credentials.AwsCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.ec2.Ec2Client;
import software.amazon.awssdk.services.ec2.model.DescribeSecurityGroupsResponse;
import software.amazon.awssdk.services.ec2.model.IpPermission;
import software.amazon.awssdk.services.ec2.model.IpRange;
import software.amazon.awssdk.services.ec2.model.SecurityGroup;
import software.amazon.awssdk.services.ec2.model.DescribeInstancesResponse;
import software.amazon.awssdk.services.ec2.model.Reservation;
import software.amazon.awssdk.services.ec2.model.Instance;
import software.amazon.awssdk.services.ec2.model.HttpTokensState;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Service
public class EC2Scanner implements ScannerService {

    private static final Logger log = LoggerFactory.getLogger(EC2Scanner.class);

    @Override
    public String getCategory() {
        return "EC2";
    }

    @Override
    public List<Finding> scan(AwsCredentialsProvider creds, String regionStr, String accountId, String scanId, ScanType scanType) {
        List<Finding> findings = new ArrayList<>();
        Region region = Region.of(regionStr);
        try (Ec2Client ec2 = Ec2Client.builder().region(region).credentialsProvider(creds).build()) {
            DescribeSecurityGroupsResponse sgResp = ec2.describeSecurityGroups();
            for (SecurityGroup sg : sgResp.securityGroups()) {
                // Check if it's default security group and has inbound rules
                if ("default".equals(sg.groupName()) && !sg.ipPermissions().isEmpty()) {
                    findings.add(createFinding(accountId, scanId, sg.groupId(), regionStr,
                            "EC2_DEFAULT_SG_NOT_EMPTY", "Default security group allows inbound traffic",
                            "The default security group " + sg.groupId() + " allows inbound traffic. Default security groups should restrict all inbound traffic.",
                            Finding.Severity.HIGH, "To fix: Go to EC2 Console -> Security Groups -> select Default SG -> Edit inbound rules -> Delete all inbound rules -> Save"));
                }

                for (IpPermission perm : sg.ipPermissions()) {
                    boolean isSsh = perm.fromPort() != null && perm.fromPort() <= 22 && perm.toPort() >= 22;
                    boolean isRdp = perm.fromPort() != null && perm.fromPort() <= 3389 && perm.toPort() >= 3389;
                    if (isSsh || isRdp) {
                        for (IpRange ipRange : perm.ipRanges()) {
                            if ("0.0.0.0/0".equals(ipRange.cidrIp())) {
                                String type = isSsh ? "SSH" : "RDP";
                                String checkId = isSsh ? "EC2_SSH_PUBLIC" : "EC2_RDP_PUBLIC";
                                findings.add(createFinding(accountId, scanId, sg.groupId(), regionStr,
                                        checkId, type + " open to the internet (0.0.0.0/0)",
                                        "Security group " + sg.groupId() + " (" + sg.groupName() + ") allows public " + type + " access.",
                                        Finding.Severity.HIGH, "To fix: Go to EC2 Console -> Security Groups -> Edit inbound rules -> Remove 0.0.0.0/0 for port " + (isSsh ? 22 : 3389)));
                            }
                        }
                    }
                }
            }

            if (scanType == ScanType.DEEP) {
                // Check IMDSv2 on instances
                try {
                    DescribeInstancesResponse instancesResp = ec2.describeInstances();
                    for (Reservation res : instancesResp.reservations()) {
                        for (Instance inst : res.instances()) {
                            if (inst.metadataOptions() != null && inst.metadataOptions().httpTokens() != HttpTokensState.REQUIRED) {
                                findings.add(createFinding(accountId, scanId, inst.instanceId(), regionStr,
                                        "EC2_IMDSV2_NOT_ENFORCED", "EC2 Instance does not enforce IMDSv2",
                                        "Instance " + inst.instanceId() + " allows IMDSv1. Enforcing IMDSv2 provides better protection against SSRF vulnerabilities. (Deep Scan Check)",
                                        Finding.Severity.MEDIUM, "To fix: Go to EC2 Console -> Instances -> Select Instance -> Actions -> Instance settings -> Modify instance metadata options -> Require IMDSv2"));
                            }
                        }
                    }
                } catch (Exception e) {
                    log.warn("Could not list EC2 instances for deep scan: {}", e.getMessage());
                }
            }
        } catch (Exception e) {
            log.error("Error executing EC2 scan for account {}: {}", accountId, e.getMessage(), e);
        }
        return findings;
    }

    private Finding createFinding(String accountId, String scanId, String resourceName, String region,
                                  String checkId, String title, String desc, Finding.Severity severity, String rem) {
        Finding f = new Finding();
        f.setAccountId(accountId);
        f.setScanId(scanId);
        f.setTimestamp(Instant.now());
        f.setService("EC2");
        f.setResourceId("arn:aws:ec2:" + region + ":" + accountId + ":security-group/" + resourceName);
        f.setResourceName(resourceName);
        f.setCheckId(checkId);
        f.setTitle(title);
        f.setDescription(desc);
        f.setSeverity(severity);
        f.setStatus(Finding.Status.OPEN);
        f.setRemediationSteps(rem);
        f.setRegion(region);
        f.setFramework(List.of("CIS_AWS_1.4"));
        return f;
    }
}
