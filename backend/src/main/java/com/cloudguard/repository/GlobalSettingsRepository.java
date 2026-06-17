package com.cloudguard.repository;

import com.cloudguard.model.GlobalSettings;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface GlobalSettingsRepository extends MongoRepository<GlobalSettings, String> {
}
