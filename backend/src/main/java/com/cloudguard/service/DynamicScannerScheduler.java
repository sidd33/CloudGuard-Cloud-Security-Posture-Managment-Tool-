package com.cloudguard.service;

import com.cloudguard.model.GlobalSettings;
import com.cloudguard.model.AwsAccount;
import com.cloudguard.repository.AwsAccountRepository;
import com.cloudguard.repository.GlobalSettingsRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.TaskScheduler;
import org.springframework.scheduling.support.CronTrigger;
import org.springframework.stereotype.Service;

import jakarta.annotation.PostConstruct;
import java.util.List;
import java.util.concurrent.ScheduledFuture;

@Slf4j
@Service
public class DynamicScannerScheduler {

    @Autowired
    private TaskScheduler taskScheduler;

    @Autowired
    private GlobalSettingsRepository settingsRepository;

    @Autowired
    private AwsAccountRepository accountRepository;

    @Autowired
    private ScanOrchestrator scanOrchestrator;

    private ScheduledFuture<?> scheduledTask;

    @PostConstruct
    public void init() {
        // Load existing settings and start the scheduler if valid
        GlobalSettings settings = settingsRepository.findById("global").orElse(null);
        if (settings != null && settings.getCronExpression() != null && !settings.getCronExpression().isBlank()) {
            scheduleTask(settings.getCronExpression());
        } else {
            // Default to running once a day at midnight if no settings are configured
            scheduleTask("0 0 0 * * *");
        }
    }

    public synchronized void updateSchedule(String newCronExpression) {
        log.info("Updating dynamic scanner schedule to: {}", newCronExpression);
        if (scheduledTask != null) {
            scheduledTask.cancel(false);
        }
        scheduleTask(newCronExpression);
    }

    private void scheduleTask(String cronExpression) {
        try {
            scheduledTask = taskScheduler.schedule(this::runGlobalScan, new CronTrigger(cronExpression));
            log.info("Successfully scheduled daemon with cron: {}", cronExpression);
        } catch (IllegalArgumentException e) {
            log.error("Invalid cron expression provided: {}. Daemon is NOT scheduled.", cronExpression);
        }
    }

    private void runGlobalScan() {
        log.info("Executing scheduled global scan across all accounts...");
        List<AwsAccount> accounts = accountRepository.findAll();
        for (AwsAccount account : accounts) {
            try {
                scanOrchestrator.runFullScan(account.getId());
            } catch (Exception e) {
                log.error("Failed to run scheduled scan for account {}: {}", account.getId(), e.getMessage());
            }
        }
        log.info("Scheduled global scan completed.");
    }
}
