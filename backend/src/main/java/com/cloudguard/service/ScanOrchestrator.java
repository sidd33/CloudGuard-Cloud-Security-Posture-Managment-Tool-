package com.cloudguard.service;

import com.cloudguard.model.AwsAccount;
import com.cloudguard.model.Finding;
import com.cloudguard.model.ScanResult;
import com.cloudguard.model.ScanType;
import com.cloudguard.repository.AwsAccountRepository;
import com.cloudguard.repository.FindingRepository;
import com.cloudguard.repository.ScanResultRepository;
import com.cloudguard.service.scanner.ScannerService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.auth.credentials.AwsCredentialsProvider;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.stream.Collectors;

@Service
public class ScanOrchestrator {

    @Autowired
    private List<ScannerService> scanners;

    @Autowired
    private ScanResultRepository scanResultRepository;

    @Autowired
    private FindingRepository findingRepository;

    @Autowired
    private AwsAccountRepository accountRepository;

    @Autowired
    private AccountService accountService;

    @Autowired
    private SseService sseService;

    @Async("scanExecutor")
    public void runFullScan(String accountId) {
        runCustomScan(accountId, ScanType.REGULAR, null);
    }

    @Async("scanExecutor")
    public void runCustomScan(String accountId, ScanType scanType, List<String> targetServices) {
        AwsAccount account = accountRepository.findById(accountId).orElseThrow();
        AwsCredentialsProvider creds = accountService.getCredentialsProvider(account);

        ScanResult scanResult = new ScanResult();
        scanResult.setAccountId(accountId);
        scanResult.setStartTime(Instant.now());
        scanResult.setStatus(ScanResult.Status.RUNNING);
        scanResult.setFindingsBySeverity(new HashMap<>());
        scanResult.setFindingsByService(new HashMap<>());
        scanResult = scanResultRepository.save(scanResult);

        String scanId = scanResult.getId();

        List<CompletableFuture<List<Finding>>> futures = new ArrayList<>();

        for (ScannerService scanner : scanners) {
            if (targetServices != null && !targetServices.isEmpty() && !targetServices.contains(scanner.getCategory().toUpperCase())) {
                continue; // Skip scanners not requested
            }
            CompletableFuture<List<Finding>> future = CompletableFuture.supplyAsync(() -> {
                try {
                    List<Finding> findings = scanner.scan(creds, account.getRegion(), accountId, scanId, scanType);
                    // Emit SSE event for completion of this scanner
                    Map<String, Object> event = new HashMap<>();
                    event.put("service", scanner.getCategory());
                    event.put("status", "COMPLETED");
                    event.put("findingsCount", findings.size());
                    sseService.sendEvent(scanId, event);
                    return findings;
                } catch (Exception e) {
                    Map<String, Object> event = new HashMap<>();
                    event.put("service", scanner.getCategory());
                    event.put("status", "FAILED");
                    event.put("error", e.getMessage());
                    sseService.sendEvent(scanId, event);
                    return new ArrayList<>();
                }
            });
            futures.add(future);
        }

        CompletableFuture.allOf(futures.toArray(new CompletableFuture[0])).join();

        // Collect all findings
        List<Finding> allFindings = futures.stream()
                .flatMap(f -> f.join().stream())
                .collect(Collectors.toList());

        // Delete old findings for this account for the scanned services
        List<Finding> oldFindings = findingRepository.findByAccountId(accountId);
        if (targetServices != null && !targetServices.isEmpty()) {
            oldFindings = oldFindings.stream()
                .filter(f -> targetServices.contains(f.getService().toUpperCase()))
                .collect(Collectors.toList());
        }
        findingRepository.deleteAll(oldFindings);

        findingRepository.saveAll(allFindings);

        // Update ScanResult
        scanResult.setEndTime(Instant.now());
        scanResult.setStatus(ScanResult.Status.COMPLETED);
        scanResult.setTotalFindings(allFindings.size());

        Map<String, Integer> bySeverity = new HashMap<>();
        Map<String, Integer> byService = new HashMap<>();
        int criticalCount = 0;
        int highCount = 0;

        for (Finding f : allFindings) {
            bySeverity.merge(f.getSeverity().name(), 1, Integer::sum);
            byService.merge(f.getService(), 1, Integer::sum);
            if (f.getSeverity() == Finding.Severity.CRITICAL) criticalCount++;
            if (f.getSeverity() == Finding.Severity.HIGH) highCount++;
        }

        scanResult.setFindingsBySeverity(bySeverity);
        scanResult.setFindingsByService(byService);
        scanResultRepository.save(scanResult);

        // Calculate score
        int totalChecks = 100; // Simplified
        int passingChecks = 100 - (criticalCount + highCount); // Simplified formula
        int score = (int) Math.round(((double) passingChecks / totalChecks) * 100);
        score -= (criticalCount * 3) + (highCount * 1);
        score = Math.max(0, score);
        account.setLastScore(score);
        account.setLastScanTime(Instant.now());
        accountRepository.save(account);

        Map<String, Object> finalEvent = new HashMap<>();
        finalEvent.put("scanStatus", "COMPLETED");
        finalEvent.put("score", score);
        sseService.sendEvent(scanId, finalEvent);
        sseService.complete(scanId);
    }
}
