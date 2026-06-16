package com.cloudguard.model;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.Map;

@Data
@Document(collection = "scan_results")
public class ScanResult {
    @Id
    private String id;
    private String accountId;
    private Instant startTime;
    private Instant endTime;
    
    public enum Status {
        RUNNING, COMPLETED, FAILED
    }
    private Status status;
    
    private int totalFindings;
    private Map<String, Integer> findingsBySeverity;
    private Map<String, Integer> findingsByService;
}
