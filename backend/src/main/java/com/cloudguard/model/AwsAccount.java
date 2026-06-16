package com.cloudguard.model;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Data
@Document(collection = "aws_accounts")
public class AwsAccount {
    @Id
    private String id;
    private String alias;
    private String encryptedAccessKey;
    private String encryptedSecretKey;
    private String region;
    private Instant createdAt;
    private Instant lastScanTime;
    private Integer lastScore;
}
