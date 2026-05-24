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
  default     = "ap-southeast-1"
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
  default     = null
  description = "ACM certificate ARN for ALB HTTPS listener"

  validation {
    condition = var.enable_https ? (
      var.certificate_arn != null
      && can(regex("^arn:aws(-[a-z]+)?:acm:[a-z0-9-]+:[0-9]{12}:certificate\\/[0-9a-fA-F-]+$", var.certificate_arn))
      && !contains(["<value>", ""], trimspace(var.certificate_arn))
    ) : true
    error_message = "When enable_https=true, certificate_arn must be a valid ACM certificate ARN (for example: arn:aws:acm:ap-southeast-1:123456789012:certificate/uuid) and cannot be a placeholder like <value>."
  }
}

variable "enable_https" {
  type        = bool
  description = "Whether ALB listener uses HTTPS (443) with ACM certificate"
  default     = false
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
  default     = false
}

variable "enable_ecs_services" {
  type        = bool
  description = "Whether to provision ECS services and related IAM roles"
  default     = false
}

variable "enable_cloudwatch" {
  type        = bool
  description = "Whether to provision CloudWatch log groups, alarms, and dashboard"
  default     = false
}

variable "enable_grafana" {
  type        = bool
  description = "Whether to provision Amazon Managed Grafana and AMP workspace"
  default     = false
}

variable "enable_rds" {
  type        = bool
  description = "Whether to provision RDS and DATABASE_URL parameter"
  default     = false
}

variable "enable_redis" {
  type        = bool
  description = "Whether to provision ElastiCache Redis and REDIS_URL parameter"
  default     = false
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

variable "github_oidc_enabled" {
  type        = bool
  description = "Whether to create the GitHub Actions OIDC provider and Terraform deploy role"
  default     = true
}

variable "github_oidc_repository" {
  type        = string
  description = "GitHub repository allowed to assume the Terraform deploy role, in owner/name form"
  default     = "MarkForCode/GamLoot"
}

variable "github_oidc_allowed_branches" {
  type        = list(string)
  description = "Branch names allowed to assume the Terraform deploy role through GitHub Actions OIDC"
  default     = ["main", "develop"]
}

variable "terraform_state_bucket" {
  type        = string
  description = "S3 bucket that stores Terraform remote state for this stack"
  default     = "gamloot-terraform-state"
}
