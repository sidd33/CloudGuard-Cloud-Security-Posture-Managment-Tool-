package com.cloudguard.config;

import com.cloudguard.model.CustomPolicy;
import com.cloudguard.repository.CustomPolicyRepository;
import com.cloudguard.service.opa.OpaClient;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class PolicySyncRunner implements CommandLineRunner {

    private final CustomPolicyRepository repository;
    private final OpaClient opaClient;

    public PolicySyncRunner(CustomPolicyRepository repository, OpaClient opaClient) {
        this.repository = repository;
        this.opaClient = opaClient;
    }

    @Override
    public void run(String... args) throws Exception {
        System.out.println("Syncing custom policies to OPA on startup...");
        List<CustomPolicy> activePolicies = repository.findByEnabledTrue();
        for (CustomPolicy policy : activePolicies) {
            try {
                opaClient.uploadPolicy(policy.getPolicyId(), policy.getRegoContent());
                System.out.println("Successfully synced policy: " + policy.getPolicyId());
            } catch (Exception e) {
                System.err.println("Failed to sync policy: " + policy.getPolicyId() + " - " + e.getMessage());
            }
        }
    }
}
