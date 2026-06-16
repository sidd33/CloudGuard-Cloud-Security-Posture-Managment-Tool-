package com.cloudguard.service;

import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class SseService {

    private final Map<String, SseEmitter> emitters = new ConcurrentHashMap<>();

    public SseEmitter subscribe(String scanId) {
        SseEmitter emitter = new SseEmitter(10 * 60 * 1000L); // 10 minutes timeout
        emitters.put(scanId, emitter);

        emitter.onCompletion(() -> emitters.remove(scanId));
        emitter.onTimeout(() -> emitters.remove(scanId));
        emitter.onError(e -> emitters.remove(scanId));

        return emitter;
    }

    public void sendEvent(String scanId, Object eventData) {
        SseEmitter emitter = emitters.get(scanId);
        if (emitter != null) {
            try {
                emitter.send(eventData);
            } catch (IOException e) {
                emitter.completeWithError(e);
                emitters.remove(scanId);
            }
        }
    }

    public void complete(String scanId) {
        SseEmitter emitter = emitters.get(scanId);
        if (emitter != null) {
            emitter.complete();
            emitters.remove(scanId);
        }
    }
}
