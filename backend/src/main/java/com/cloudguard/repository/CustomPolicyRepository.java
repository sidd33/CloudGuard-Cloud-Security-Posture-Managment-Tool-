package com.cloudguard.repository;

import com.cloudguard.model.CustomPolicy;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;

public interface CustomPolicyRepository extends MongoRepository<CustomPolicy, String> {
    List<CustomPolicy> findByEnabledTrue();
}
