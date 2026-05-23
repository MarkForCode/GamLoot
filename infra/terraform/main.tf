data "aws_availability_zones" "available" {
  state = "available"
}

locals {
  name_prefix = "${var.project_name}-${var.environment}"
  azs         = slice(data.aws_availability_zones.available.names, 0, var.az_count)

  services = {
    "user-api" = {
      port   = 8080
      public = true
    }
    "cms-api" = {
      port   = 8081
      public = true
    }
    "worker-order" = {
      public = false
    }
    "worker-payment" = {
      public = false
    }
    "worker-notification" = {
      public = false
    }
  }

  public_services = {
    "user-api" = {
      port              = 8080
      health_check_path = "/health"
      priority          = 100
      path_patterns     = ["/api/user/*", "/user/*", "/health"]
    }
    "cms-api" = {
      port              = 8081
      health_check_path = "/health"
      priority          = 110
      path_patterns     = ["/api/cms/*", "/cms/*"]
    }
  }

  ecs_service_names = {
    for name in keys(local.services) : name => "${local.name_prefix}-${name}"
  }

  service_discovery_namespace_name = "${local.name_prefix}.local"
  collector_service_name           = "observability-collector"
  collector_otlp_grpc_endpoint     = var.enable_observability_collector ? "http://${local.collector_service_name}.${local.service_discovery_namespace_name}:4317" : ""

  metrics_scrape_targets = {
    "user-api" = {
      host = "user-api.${local.service_discovery_namespace_name}"
      port = 8080
      path = "/metrics"
    }
    "cms-api" = {
      host = "cms-api.${local.service_discovery_namespace_name}"
      port = 8081
      path = "/metrics"
    }
  }

  observed_ecs_service_names = merge(
    local.ecs_service_names,
    var.enable_observability_collector ? {
      (local.collector_service_name) = "${local.name_prefix}-${local.collector_service_name}"
    } : {}
  )
}

module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.0"

  name = local.name_prefix
  cidr = var.vpc_cidr
  azs  = local.azs

  private_subnets = [for i, _ in local.azs : cidrsubnet(var.vpc_cidr, 4, i)]
  public_subnets  = [for i, _ in local.azs : cidrsubnet(var.vpc_cidr, 4, i + 8)]

  enable_nat_gateway = true
  single_nat_gateway = var.environment != "prod"
}

resource "aws_service_discovery_private_dns_namespace" "this" {
  name = local.service_discovery_namespace_name
  vpc  = module.vpc.vpc_id
}

module "alb" {
  source = "./modules/alb"

  name_prefix       = local.name_prefix
  vpc_id            = module.vpc.vpc_id
  public_subnet_ids = module.vpc.public_subnets
  certificate_arn   = var.certificate_arn
  services          = local.public_services
}

module "rds" {
  source = "./modules/rds"

  name_prefix        = local.name_prefix
  environment        = var.environment
  vpc_id             = module.vpc.vpc_id
  vpc_cidr           = var.vpc_cidr
  private_subnet_ids = module.vpc.private_subnets
  db_name            = var.db_name
  db_username        = var.db_username
  db_password        = var.db_password
  db_instance_class  = var.db_instance_class
  db_multi_az        = var.db_multi_az
}

module "redis" {
  source = "./modules/redis"

  name_prefix        = local.name_prefix
  vpc_id             = module.vpc.vpc_id
  vpc_cidr           = var.vpc_cidr
  private_subnet_ids = module.vpc.private_subnets
  redis_node_type    = var.redis_node_type
}

module "cloudwatch" {
  source = "./modules/cloudwatch"

  name_prefix               = local.name_prefix
  services                  = toset(keys(local.services))
  log_retention_days        = var.log_retention_days
  ecs_cluster_name          = "${local.name_prefix}-cluster"
  ecs_service_names         = local.observed_ecs_service_names
  alb_arn_suffix            = module.alb.load_balancer_arn_suffix
  target_group_arn_suffixes = module.alb.target_group_arn_suffixes
  rds_identifier            = module.rds.identifier
  redis_cluster_id          = module.redis.cluster_id
}

module "ecs_service" {
  source = "./modules/ecs-service"

  name_prefix                 = local.name_prefix
  environment                 = var.environment
  aws_region                  = var.aws_region
  vpc_id                      = module.vpc.vpc_id
  private_subnet_ids          = module.vpc.private_subnets
  alb_security_group_id       = module.alb.security_group_id
  target_group_arns           = module.alb.target_group_arns
  database_url_parameter_name = module.rds.database_url_parameter_name
  redis_url_parameter_name    = module.redis.redis_url_parameter_name
  log_group_names             = module.cloudwatch.log_group_names
  container_cpu               = var.container_cpu
  container_memory            = var.container_memory
  desired_count               = var.desired_count
  services                    = local.services
  otlp_endpoint               = local.collector_otlp_grpc_endpoint
  trace_sample_ratio          = var.trace_sample_ratio
  service_discovery_namespace_id = aws_service_discovery_private_dns_namespace.this.id

  depends_on = [module.alb]
}

module "observability_collector" {
  count  = var.enable_observability_collector ? 1 : 0
  source = "./modules/observability-collector"

  name_prefix                       = local.name_prefix
  aws_region                        = var.aws_region
  vpc_id                            = module.vpc.vpc_id
  private_subnet_ids                = module.vpc.private_subnets
  ecs_cluster_id                    = module.ecs_service.cluster_id
  service_discovery_namespace_id    = aws_service_discovery_private_dns_namespace.this.id
  service_discovery_namespace_name  = aws_service_discovery_private_dns_namespace.this.name
  app_security_group_ids            = module.ecs_service.security_group_ids
  prometheus_remote_write_endpoint  = module.grafana.prometheus_remote_write_endpoint
  cpu                               = var.collector_cpu
  memory                            = var.collector_memory
  desired_count                     = var.collector_desired_count
  log_retention_days                = var.log_retention_days
  scrape_targets                    = local.metrics_scrape_targets
}

module "s3" {
  source = "./modules/s3"

  name_prefix  = local.name_prefix
  bucket_names = var.app_bucket_names
}

module "grafana" {
  source = "./modules/grafana"

  name_prefix              = local.name_prefix
  authentication_providers = var.grafana_authentication_providers
}
