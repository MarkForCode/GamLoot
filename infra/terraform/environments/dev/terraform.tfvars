environment        = "dev"
aws_region         = "us-east-1"
vpc_cidr           = "10.30.0.0/16"
db_instance_class  = "db.t4g.micro"
db_multi_az        = false
redis_node_type    = "cache.t4g.micro"
container_cpu      = 512
container_memory   = 1024
desired_count      = 1
log_retention_days = 7
trace_sample_ratio = "0.01"

# inject via CI secret or -var
# db_password     = ""
# certificate_arn = "arn:aws:acm:us-east-1:123456789012:certificate/xxxx"
