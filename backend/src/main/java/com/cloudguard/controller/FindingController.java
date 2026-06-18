package com.cloudguard.controller;

import com.cloudguard.model.Finding;
import com.cloudguard.model.RemediationAuditLog;
import com.cloudguard.model.RemediationResult;
import com.cloudguard.repository.RemediationAuditLogRepository;
import com.cloudguard.service.FindingService;
import com.cloudguard.service.remediation.RemediationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.HashMap;

@RestController
@RequestMapping("/api/findings")
@CrossOrigin(origins = "*")
public class FindingController {

    @Autowired
    private FindingService findingService;

    @Autowired
    private RemediationService remediationService;

    @Autowired
    private RemediationAuditLogRepository auditLogRepository;

    @GetMapping
    public List<Finding> getFindings(@RequestParam(required = false) String accountId) {
        if (accountId != null) {
            return findingService.getFindingsForAccount(accountId);
        }
        return findingService.getAllFindings();
    }

    @PatchMapping("/{id}")
    public ResponseEntity<Finding> updateFinding(@PathVariable String id, @RequestBody Map<String, String> updates) {
        Finding.Status status = Finding.Status.valueOf(updates.get("status").toUpperCase());
        return ResponseEntity.ok(findingService.updateFindingStatus(id, status));
    }

    @PostMapping("/{id}/remediate")
    public ResponseEntity<?> remediateFinding(@PathVariable String id) {
        try {
            RemediationResult result = remediationService.remediateFinding(id);
            return ResponseEntity.ok(result);
        } catch (UnsupportedOperationException e) {
            Map<String, Object> response = new HashMap<>();
            response.put("remediable", false);
            response.put("reason", e.getMessage());
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("success", false, "message", e.getMessage()));
        }
    }

    @GetMapping("/{id}/remediation-log")
    public ResponseEntity<List<RemediationAuditLog>> getRemediationLog(@PathVariable String id) {
        return ResponseEntity.ok(auditLogRepository.findByFindingId(id));
    }
}
