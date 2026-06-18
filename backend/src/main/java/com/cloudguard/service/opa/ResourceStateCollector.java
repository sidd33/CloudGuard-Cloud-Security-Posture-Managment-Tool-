package com.cloudguard.service.opa;

import org.springframework.stereotype.Service;
import software.amazon.awssdk.auth.credentials.AwsCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.ec2.Ec2Client;
import software.amazon.awssdk.services.ec2.model.DescribeInstancesResponse;
import software.amazon.awssdk.services.ec2.model.DescribeSecurityGroupsResponse;
import software.amazon.awssdk.services.ec2.model.Instance;
import software.amazon.awssdk.services.ec2.model.SecurityGroup;
import software.amazon.awssdk.services.ec2.model.Tag;
import software.amazon.awssdk.services.iam.IamClient;
import software.amazon.awssdk.services.iam.model.AccessKeyMetadata;
import software.amazon.awssdk.services.iam.model.GetAccountPasswordPolicyResponse;
import software.amazon.awssdk.services.iam.model.GetAccountPasswordPolicyRequest;
import software.amazon.awssdk.services.iam.model.PasswordPolicy;
import software.amazon.awssdk.services.iam.model.User;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.Bucket;
import software.amazon.awssdk.services.s3.model.GetBucketEncryptionResponse;
import software.amazon.awssdk.services.s3.model.GetBucketVersioningResponse;
import software.amazon.awssdk.services.s3.model.GetPublicAccessBlockResponse;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class ResourceStateCollector {

    public Map<String, Object> collectS3State(AwsCredentialsProvider creds, String regionStr) {
        Region region = Region.of(regionStr);
        try (S3Client s3Client = S3Client.builder().credentialsProvider(creds).region(region).build()) {
            List<Map<String, Object>> bucketsData = new ArrayList<>();
            List<Bucket> buckets = s3Client.listBuckets().buckets();
            for (Bucket bucket : buckets) {
                Map<String, Object> bMap = new HashMap<>();
                bMap.put("name", bucket.name());
                bMap.put("arn", "arn:aws:s3:::" + bucket.name());
                bMap.put("region", regionStr);

                boolean publicAccessBlocked = false;
                try {
                    GetPublicAccessBlockResponse pab = s3Client.getPublicAccessBlock(r -> r.bucket(bucket.name()));
                    publicAccessBlocked = pab.publicAccessBlockConfiguration().blockPublicAcls() &&
                            pab.publicAccessBlockConfiguration().blockPublicPolicy() &&
                            pab.publicAccessBlockConfiguration().ignorePublicAcls() &&
                            pab.publicAccessBlockConfiguration().restrictPublicBuckets();
                } catch (Exception e) {
                }
                bMap.put("public_access_blocked", publicAccessBlocked);

                boolean versioningEnabled = false;
                try {
                    GetBucketVersioningResponse ver = s3Client.getBucketVersioning(r -> r.bucket(bucket.name()));
                    versioningEnabled = "Enabled".equals(ver.statusAsString());
                } catch (Exception e) {
                }
                bMap.put("versioning_enabled", versioningEnabled);

                boolean encryptionEnabled = false;
                try {
                    GetBucketEncryptionResponse enc = s3Client.getBucketEncryption(r -> r.bucket(bucket.name()));
                    encryptionEnabled = enc.serverSideEncryptionConfiguration() != null &&
                            !enc.serverSideEncryptionConfiguration().rules().isEmpty();
                } catch (Exception e) {
                }
                bMap.put("encryption_enabled", encryptionEnabled);

                bucketsData.add(bMap);
            }
            Map<String, Object> result = new HashMap<>();
            result.put("buckets", bucketsData);
            return result;
        }
    }

    public Map<String, Object> collectIamState(AwsCredentialsProvider creds) {
        try (IamClient iamClient = IamClient.builder().credentialsProvider(creds).region(Region.AWS_GLOBAL).build()) {
            List<Map<String, Object>> usersData = new ArrayList<>();
            List<User> users = iamClient.listUsers().users();
            for (User user : users) {
                Map<String, Object> uMap = new HashMap<>();
                uMap.put("username", user.userName());
                uMap.put("arn", user.arn());
                
                boolean mfaEnabled = !iamClient.listMFADevices(r -> r.userName(user.userName())).mfaDevices().isEmpty();
                uMap.put("mfa_enabled", mfaEnabled);

                List<AccessKeyMetadata> keys = iamClient.listAccessKeys(r -> r.userName(user.userName())).accessKeyMetadata();
                List<Map<String, Object>> keysData = new ArrayList<>();
                for (AccessKeyMetadata key : keys) {
                    Map<String, Object> kMap = new HashMap<>();
                    kMap.put("key_id", key.accessKeyId());
                    kMap.put("active", "Active".equals(key.statusAsString()));
                    kMap.put("create_date", key.createDate().toString());
                    keysData.add(kMap);
                }
                uMap.put("access_keys", keysData);
                usersData.add(uMap);
            }

            Map<String, Object> pwdPolicyMap = new HashMap<>();
            try {
                GetAccountPasswordPolicyResponse pwdRes = iamClient.getAccountPasswordPolicy(GetAccountPasswordPolicyRequest.builder().build());
                PasswordPolicy pp = pwdRes.passwordPolicy();
                pwdPolicyMap.put("min_length", pp.minimumPasswordLength());
                pwdPolicyMap.put("require_symbols", pp.requireSymbols());
                pwdPolicyMap.put("max_age_days", pp.maxPasswordAge());
            } catch (Exception e) {
                pwdPolicyMap.put("min_length", 0);
            }

            Map<String, Object> result = new HashMap<>();
            result.put("users", usersData);
            result.put("password_policy", pwdPolicyMap);
            return result;
        }
    }

    public Map<String, Object> collectEc2State(AwsCredentialsProvider creds, String regionStr) {
        Region region = Region.of(regionStr);
        try (Ec2Client ec2Client = Ec2Client.builder().credentialsProvider(creds).region(region).build()) {
            List<Map<String, Object>> instancesData = new ArrayList<>();
            DescribeInstancesResponse res = ec2Client.describeInstances();
            res.reservations().forEach(r -> {
                for (Instance instance : r.instances()) {
                    Map<String, Object> iMap = new HashMap<>();
                    iMap.put("instance_id", instance.instanceId());
                    iMap.put("arn", "arn:aws:ec2:" + regionStr + ":account:instance/" + instance.instanceId());
                    iMap.put("imdsv2_required", "required".equals(instance.metadataOptions().httpTokensAsString()));
                    iMap.put("public_ip", instance.publicIpAddress());
                    Map<String, String> tags = new HashMap<>();
                    for (Tag t : instance.tags()) {
                        tags.put(t.key(), t.value());
                    }
                    iMap.put("tags", tags);
                    instancesData.add(iMap);
                }
            });

            List<Map<String, Object>> sgData = new ArrayList<>();
            DescribeSecurityGroupsResponse sgRes = ec2Client.describeSecurityGroups();
            for (SecurityGroup sg : sgRes.securityGroups()) {
                Map<String, Object> sMap = new HashMap<>();
                sMap.put("group_id", sg.groupId());
                sMap.put("arn", "arn:aws:ec2:" + regionStr + ":account:security-group/" + sg.groupId());
                
                List<Map<String, Object>> rulesData = new ArrayList<>();
                sg.ipPermissions().forEach(p -> {
                    Map<String, Object> rule = new HashMap<>();
                    rule.put("protocol", p.ipProtocol());
                    rule.put("from_port", p.fromPort());
                    rule.put("to_port", p.toPort());
                    if (!p.ipRanges().isEmpty()) {
                        rule.put("cidr", p.ipRanges().get(0).cidrIp());
                    }
                    rulesData.add(rule);
                });
                sMap.put("inbound_rules", rulesData);
                sgData.add(sMap);
            }

            Map<String, Object> result = new HashMap<>();
            result.put("instances", instancesData);
            result.put("security_groups", sgData);
            return result;
        }
    }
}
