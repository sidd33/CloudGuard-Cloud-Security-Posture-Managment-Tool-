package com.cloudguard.model;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Data
@Document(collection = "global_settings")
public class GlobalSettings {
    @Id
    private String id;
    private String cronExpression;
    private String slackWebhook;
    private String jwtLifetime;
    private String symmetricAlgorithm;

    public GlobalSettings() {}

    public GlobalSettings(String id) {
        this.id = id;
    }
}
