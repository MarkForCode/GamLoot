variable "project_name" {
  type        = string
  description = "Project identifier"
  default     = "gamloot"
}

variable "environment" {
  type        = string
  description = "LocalStack test environment name"
  default     = "localstack"
}

variable "aws_region" {
  type        = string
  description = "AWS region used by LocalStack"
  default     = "us-east-1"
}

variable "localstack_endpoint" {
  type        = string
  description = "LocalStack edge endpoint"
  default     = "http://localhost:4566"
}

variable "app_bucket_names" {
  type        = set(string)
  description = "Runtime S3 bucket suffixes to validate in LocalStack"
  default     = ["runtime"]
}

variable "log_retention_days" {
  type        = number
  description = "CloudWatch log retention for LocalStack smoke logs"
  default     = 7
}
