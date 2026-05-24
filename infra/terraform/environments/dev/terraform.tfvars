environment                    = "dev"
aws_region                     = "ap-southeast-1"
vpc_cidr                       = "10.30.0.0/16"
db_instance_class              = "db.t4g.micro"
db_multi_az                    = false
redis_node_type                = "cache.t3.micro"
container_cpu                  = 512
container_memory               = 1024
desired_count                  = 1
log_retention_days             = 7
trace_sample_ratio             = "0.01"
enable_ecs_services            = false
enable_cloudwatch              = false
enable_grafana                 = false
enable_observability_collector = false
enable_rds                     = false
enable_redis                   = false

# inject via CI secret or -var
# db_password     = ""
# enable_https = true
# certificate_arn = "arn:aws:acm:ap-southeast-1:123456789012:certificate/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
