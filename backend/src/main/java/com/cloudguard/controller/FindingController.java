package com.cloudguard.controller;

import com.cloudguard.model.Finding;
import com.cloudguard.service.FindingService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/findings")
@CrossOrigin(origins = "*")
public class FindingController {

    @Autowired
    private FindingService findingService;

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
}
