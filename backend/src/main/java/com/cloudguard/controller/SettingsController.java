package com.cloudguard.controller;

import com.cloudguard.model.GlobalSettings;
import com.cloudguard.repository.GlobalSettingsRepository;
import com.cloudguard.service.DynamicScannerScheduler;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/settings")
@CrossOrigin(origins = "*")
public class SettingsController {

    @Autowired
    private GlobalSettingsRepository settingsRepository;

    @Autowired
    private DynamicScannerScheduler dynamicScannerScheduler;

    @GetMapping
    public GlobalSettings getSettings() {
        return settingsRepository.findById("global").orElseGet(() -> {
            GlobalSettings defaultSettings = new GlobalSettings("global");
            defaultSettings.setCronExpression("0 0 0 * * *");
            defaultSettings.setJwtLifetime("24h");
            defaultSettings.setSymmetricAlgorithm("AES-256-GCM");
            return defaultSettings;
        });
    }

    @PostMapping
    public GlobalSettings saveSettings(@RequestBody GlobalSettings updatedSettings) {
        updatedSettings.setId("global"); // ensure singleton document
        GlobalSettings savedSettings = settingsRepository.save(updatedSettings);
        
        // Notify the scheduler to realign its cron trigger
        if (savedSettings.getCronExpression() != null && !savedSettings.getCronExpression().isBlank()) {
            dynamicScannerScheduler.updateSchedule(savedSettings.getCronExpression());
        }
        
        return savedSettings;
    }
}
