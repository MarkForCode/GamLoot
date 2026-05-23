variable "name_prefix" {
  type = string
}

variable "environment" {
  type = string
}

variable "aws_region" {
  type = string
}

variable "vpc_id" {
  type = string
}

variable "private_subnet_ids" {
  type = list(string)
}

variable "alb_security_group_id" {
  type = string
}

variable "target_group_arns" {
  type = map(string)
}

variable "database_url_parameter_name" {
  type = string
}

variable "redis_url_parameter_name" {
  type = string
}

variable "log_group_names" {
  type = map(string)
}

variable "container_cpu" {
  type = number
}

variable "container_memory" {
  type = number
}

variable "desired_count" {
  type = number
}

variable "services" {
  type = map(object({
    port   = optional(number)
    public = bool
  }))
}

variable "otlp_endpoint" {
  type    = string
  default = ""
}

variable "trace_sample_ratio" {
  type    = string
  default = "0.01"
}

variable "service_discovery_namespace_id" {
  type    = string
  default = null
}

variable "collector_security_group_id" {
  type    = string
  default = null
}
