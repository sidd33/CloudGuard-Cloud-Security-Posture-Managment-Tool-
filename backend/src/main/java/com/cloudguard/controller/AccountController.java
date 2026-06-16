package com.cloudguard.controller;

import com.cloudguard.model.AwsAccount;
import com.cloudguard.model.ScanType;
import com.cloudguard.service.AccountService;
import com.cloudguard.service.ScanOrchestrator;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/accounts")
@CrossOrigin(origins = "*") // In production, restrict this
public class AccountController {

    @Autowired
    private AccountService accountService;

    @Autowired
    private ScanOrchestrator scanOrchestrator;

    @PostMapping
    public ResponseEntity<?> onboardAccount(@RequestBody Map<String, String> payload) {
        try {
            AwsAccount account = accountService.onboardAccount(
                    payload.get("alias"),
                    payload.get("accessKey"),
                    payload.get("secretKey"),
                    payload.get("region")
            );
            return ResponseEntity.ok(account);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping
    public List<AwsAccount> getAccounts() {
        return accountService.getAllAccounts();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteAccount(@PathVariable String id) {
        accountService.deleteAccount(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/scan")
    public ResponseEntity<Map<String, String>> triggerScan(@PathVariable String id) {
        // Trigger scan asynchronously
        scanOrchestrator.runFullScan(id);
        return ResponseEntity.ok(Map.of("message", "Scan triggered"));
    }

    @PostMapping("/{id}/scan/deep")
    public ResponseEntity<Map<String, String>> triggerDeepScan(@PathVariable String id, @RequestBody Map<String, Object> payload) {
        List<String> services = null;
        if (payload != null && payload.containsKey("services")) {
            services = (List<String>) payload.get("services");
        }
        scanOrchestrator.runCustomScan(id, ScanType.DEEP, services);
        return ResponseEntity.ok(Map.of("message", "Deep Scan triggered"));
    }
}
