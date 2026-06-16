package com.cloudguard.controller;

import com.cloudguard.model.ScanResult;
import com.cloudguard.repository.ScanResultRepository;
import com.cloudguard.service.SseService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Sort;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.List;

@RestController
@RequestMapping("/api/scans")
@CrossOrigin(origins = "*")
public class ScanController {

    @Autowired
    private SseService sseService;

    @Autowired
    private ScanResultRepository scanResultRepository;

    @GetMapping
    public List<ScanResult> getAllScans() {
        return scanResultRepository.findAll(Sort.by(Sort.Direction.DESC, "startTime"));
    }

    @GetMapping(value = "/{scanId}/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter streamScanProgress(@PathVariable String scanId) {
        return sseService.subscribe(scanId);
    }
}
