package com.cloudguard.repository;

import com.cloudguard.model.AwsAccount;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface AwsAccountRepository extends MongoRepository<AwsAccount, String> {
}
