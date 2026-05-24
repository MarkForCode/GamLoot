variable "name_prefix" {
  type = string
}

variable "vpc_id" {
  type = string
}

variable "public_subnet_ids" {
  type = list(string)
}

variable "certificate_arn" {
  type    = string
  default = null
}

variable "enable_https" {
  type    = bool
  default = false
}

variable "services" {
  type = map(object({
    port              = number
    health_check_path = string
    priority          = number
    path_patterns     = list(string)
  }))
}
