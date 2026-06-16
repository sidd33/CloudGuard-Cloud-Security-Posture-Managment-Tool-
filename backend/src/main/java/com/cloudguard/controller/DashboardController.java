package com.cloudguard.controller;

import com.cloudguard.model.Finding;
import com.cloudguard.model.AwsAccount;
import com.cloudguard.repository.AwsAccountRepository;
import com.cloudguard.repository.FindingRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/dashboard")
@CrossOrigin(origins = "*")
public class DashboardController {

    @Autowired
    private FindingRepository findingRepository;

    @Autowired
    private AwsAccountRepository accountRepository;

    @GetMapping("/summary")
    public Map<String, Object> getSummary() {
        List<AwsAccount> accounts = accountRepository.findAll();
        List<Finding> allFindings = findingRepository.findAll();
        
        long critical = allFindings.stream().filter(f -> f.getSeverity() == Finding.Severity.CRITICAL && f.getStatus() == Finding.Status.OPEN).count();
        long high = allFindings.stream().filter(f -> f.getSeverity() == Finding.Severity.HIGH && f.getStatus() == Finding.Status.OPEN).count();
        long medium = allFindings.stream().filter(f -> f.getSeverity() == Finding.Severity.MEDIUM && f.getStatus() == Finding.Status.OPEN).count();
        
        int averageScore = accounts.isEmpty() ? 0 : 
            (int) accounts.stream().mapToInt(a -> a.getLastScore() != null ? a.getLastScore() : 0).average().orElse(0);

        Map<String, Object> severityBreakdown = new HashMap<>();
        severityBreakdown.put("CRITICAL", critical);
        severityBreakdown.put("HIGH", high);
        severityBreakdown.put("MEDIUM", medium);

        Map<String, Object> summary = new HashMap<>();
        summary.put("averageScore", averageScore);
        summary.put("totalAccounts", accounts.size());
        summary.put("totalOpenFindings", critical + high + medium);
        summary.put("severityBreakdown", severityBreakdown);
        
        return summary;
    }
}
