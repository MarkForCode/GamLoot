variable "project_name" {
  type        = string
  description = "Project identifier"
  default     = "gamloot"
}

variable "environment" {
  type        = string
  description = "Environment name (staging/prod/etc.)"
}

variable "aws_region" {
  type        = string
  description = "AWS region"
  default     = "us-east-1"
}

variable "vpc_cidr" {
  type    = string
  default = "10.40.0.0/16"
}

variable "az_count" {
  type    = number
  default = 2
}

variable "db_name" {
  type    = string
  default = "gamloot"
}

variable "db_username" {
  type    = string
  default = "gamloot"
}

variable "db_password" {
  type      = string
  sensitive = true
}

variable "db_instance_class" {
  type    = string
  default = "db.t4g.medium"
}

variable "db_multi_az" {
  type    = bool
  default = false
}

variable "redis_node_type" {
  type    = string
  default = "cache.t4g.small"
}

variable "certificate_arn" {
  type        = string
  description = "ACM certificate ARN for ALB HTTPS listener"
}

variable "container_cpu" {
  type    = number
  default = 512
}

variable "container_memory" {
  type    = number
  default = 1024
}

variable "desired_count" {
  type    = number
  default = 1
}

variable "log_retention_days" {
  type        = number
  description = "CloudWatch log retention in days"
  default     = 30
}

variable "grafana_authentication_providers" {
  type        = list(string)
  description = "Amazon Managed Grafana authentication providers"
  default     = ["AWS_SSO"]
}

variable "app_bucket_names" {
  type        = set(string)
  description = "Runtime S3 bucket suffixes managed by the platform stack"
  default     = ["runtime"]
}

variable "enable_observability_collector" {
  type        = bool
  description = "Whether to run the ADOT collector that maps the local compose observability flow to AWS managed services"
  default     = true
}

variable "collector_cpu" {
  type        = number
  description = "ADOT collector task CPU"
  default     = 256
}

variable "collector_memory" {
  type        = number
  description = "ADOT collector task memory"
  default     = 512
}

variable "collector_desired_count" {
  type        = number
  description = "ADOT collector ECS service desired count"
  default     = 1
}

variable "trace_sample_ratio" {
  type        = string
  description = "OpenTelemetry parentbased_traceidratio sampler argument"
  default     = "0.01"
}
