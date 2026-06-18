package com.cloudguard.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RemediationResult {
    private boolean success;
    private String message;
    private String actionTaken;
    private Instant executedAt;
}
