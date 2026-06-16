package com.cloudguard.service;

import com.cloudguard.model.Finding;
import com.cloudguard.repository.FindingRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class FindingService {

    @Autowired
    private FindingRepository findingRepository;

    public List<Finding> getFindingsForAccount(String accountId) {
        return findingRepository.findByAccountId(accountId);
    }

    public List<Finding> getAllFindings() {
        return findingRepository.findAll();
    }

    public Finding updateFindingStatus(String findingId, Finding.Status status) {
        Finding finding = findingRepository.findById(findingId)
                .orElseThrow(() -> new RuntimeException("Finding not found"));
        finding.setStatus(status);
        return findingRepository.save(finding);
    }
}
