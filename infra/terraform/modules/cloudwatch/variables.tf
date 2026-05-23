variable "name_prefix" {
  type = string
}

variable "services" {
  type = set(string)
}

variable "log_retention_days" {
  type = number
}

variable "ecs_cluster_name" {
  type = string
}

variable "ecs_service_names" {
  type = map(string)
}

variable "alb_arn_suffix" {
  type = string
}

variable "target_group_arn_suffixes" {
  type = map(string)
}

variable "rds_identifier" {
  type = string
}

variable "redis_cluster_id" {
  type = string
}
