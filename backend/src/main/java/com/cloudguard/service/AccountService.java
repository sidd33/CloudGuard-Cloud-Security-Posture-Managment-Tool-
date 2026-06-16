package com.cloudguard.service;

import com.cloudguard.model.AwsAccount;
import com.cloudguard.repository.AwsAccountRepository;
import com.cloudguard.util.EncryptionUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.AwsCredentialsProvider;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.sts.StsClient;
import software.amazon.awssdk.services.sts.model.GetCallerIdentityResponse;

import java.time.Instant;
import java.util.List;

@Service
public class AccountService {

    @Autowired
    private AwsAccountRepository accountRepository;

    @Autowired
    private EncryptionUtil encryptionUtil;

    public AwsAccount onboardAccount(String alias, String accessKey, String secretKey, String region) throws Exception {
        if (accessKey != null) accessKey = accessKey.trim();
        if (secretKey != null) secretKey = secretKey.trim();
        if (alias != null) alias = alias.trim();
        if (region != null) region = region.trim();

        // Validate credentials
        AwsCredentialsProvider creds = StaticCredentialsProvider.create(AwsBasicCredentials.create(accessKey, secretKey));
        try (StsClient sts = StsClient.builder().region(Region.US_EAST_1).credentialsProvider(creds).build()) {
            GetCallerIdentityResponse callerIdentity = sts.getCallerIdentity();
            
            AwsAccount account = new AwsAccount();
            // Store the actual AWS account ID as the internal ID
            account.setId(callerIdentity.account());
            account.setAlias(alias);
            account.setRegion(region);
            account.setEncryptedAccessKey(encryptionUtil.encrypt(accessKey));
            account.setEncryptedSecretKey(encryptionUtil.encrypt(secretKey));
            account.setCreatedAt(Instant.now());
            
            return accountRepository.save(account);
        } catch (Exception e) {
            throw new RuntimeException("Invalid AWS credentials: " + e.getMessage());
        }
    }

    public List<AwsAccount> getAllAccounts() {
        return accountRepository.findAll();
    }

    public void deleteAccount(String accountId) {
        accountRepository.deleteById(accountId);
    }

    public AwsCredentialsProvider getCredentialsProvider(AwsAccount account) {
        try {
            String accessKey = encryptionUtil.decrypt(account.getEncryptedAccessKey());
            String secretKey = encryptionUtil.decrypt(account.getEncryptedSecretKey());
            return StaticCredentialsProvider.create(AwsBasicCredentials.create(accessKey, secretKey));
        } catch (Exception e) {
            throw new RuntimeException("Error decrypting credentials", e);
        }
    }
}
