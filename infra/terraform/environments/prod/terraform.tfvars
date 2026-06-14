environment        = "prod"
aws_region         = "ap-northeast-3"
vpc_cidr           = "10.50.0.0/16"
db_instance_class  = "db.t4g.large"
db_multi_az        = true
redis_node_type    = "cache.t4g.medium"
container_cpu      = 1024
container_memory   = 2048
desired_count      = 2
log_retention_days = 30
trace_sample_ratio = "0.01"

# inject via CI secret or -var
# db_password     = ""
# enable_https = true
# certificate_arn = "arn:aws:acm:ap-northeast-3:123456789012:certificate/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
