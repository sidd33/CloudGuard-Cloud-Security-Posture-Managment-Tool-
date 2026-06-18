package cloudguard.custom.s3_encryption

import rego.v1

violation contains msg if {
  bucket := input.buckets[_]
  bucket.encrypted == false
  msg := {
    "resource_arn": bucket.arn,
    "title": "S3 Bucket is not encrypted",
    "description": sprintf("The bucket '%v' is missing server-side encryption.", [bucket.name]),
    "severity": "HIGH"
  }
}
