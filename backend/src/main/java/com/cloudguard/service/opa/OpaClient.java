package com.cloudguard.service.opa;

import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.Collections;
import java.util.Map;

@Service
public class OpaClient {

    private final RestTemplate restTemplate;
    private final String opaUrl;

    public OpaClient(@Value("${opa.url:https://cloudguard-opa.onrender.com}") String opaUrl) {
        this.restTemplate = new RestTemplate();
        this.opaUrl = opaUrl;
    }

    public void uploadPolicy(String policyId, String regoContent) {
        String url = opaUrl + "/v1/policies/" + policyId;
        HttpHeaders headers = new HttpHeaders();
        headers.set("Content-Type", "text/plain");
        HttpEntity<String> request = new HttpEntity<>(regoContent, headers);
        restTemplate.exchange(url, HttpMethod.PUT, request, String.class);
    }

    public void deletePolicy(String policyId) {
        String url = opaUrl + "/v1/policies/" + policyId;
        restTemplate.exchange(url, HttpMethod.DELETE, null, String.class);
    }

    public JsonNode evaluatePolicy(String policyPath, Object resourceInput) {
        String url = opaUrl + "/v1/data/" + policyPath;
        Map<String, Object> requestBody = Collections.singletonMap("input", resourceInput);
        ResponseEntity<JsonNode> response = restTemplate.postForEntity(url, requestBody, JsonNode.class);
        return response.getBody();
    }
}
