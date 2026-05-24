output "alb_dns_name" {
  value = module.alb.dns_name
}

output "alb_listener_arn" {
  value = module.alb.listener_arn
}

output "alb_target_group_arns" {
  value = module.alb.target_group_arns
}

output "ecs_cluster_name" {
  value = module.ecs_service.cluster_name
}

output "ecs_service_names" {
  value = module.ecs_service.service_names
}

output "ecr_repositories" {
  value = module.ecs_service.ecr_repositories
}

output "rds_endpoint" {
  value = module.rds.endpoint
}

output "database_url_parameter_name" {
  value = module.rds.database_url_parameter_name
}

output "redis_endpoint" {
  value = module.redis.endpoint
}

output "redis_url_parameter_name" {
  value = module.redis.redis_url_parameter_name
}

output "app_bucket_names" {
  value = module.s3.bucket_names
}

output "cloudwatch_log_group_names" {
  value = module.cloudwatch.log_group_names
}

output "cloudwatch_dashboard_name" {
  value = module.cloudwatch.dashboard_name
}

output "grafana_endpoint" {
  value = module.grafana.grafana_endpoint
}

output "grafana_workspace_id" {
  value = module.grafana.grafana_workspace_id
}

output "prometheus_workspace_id" {
  value = module.grafana.prometheus_workspace_id
}

output "prometheus_remote_write_endpoint" {
  value = module.grafana.prometheus_remote_write_endpoint
}

output "observability_collector_service_name" {
  value = try(module.observability_collector[0].service_name, null)
}

output "observability_collector_otlp_grpc_endpoint" {
  value = try(module.observability_collector[0].otlp_grpc_endpoint, null)
}

output "observability_collector_otlp_http_endpoint" {
  value = try(module.observability_collector[0].otlp_http_endpoint, null)
}

output "xray_datasource_enabled" {
  value = module.grafana.xray_datasource_enabled
}

output "github_actions_role_arn" {
  value       = try(aws_iam_role.github_actions_terraform[0].arn, null)
  description = "IAM role ARN for GitHub Actions Terraform jobs to assume via OIDC"
}

output "github_oidc_provider_arn" {
  value       = try(aws_iam_openid_connect_provider.github_actions[0].arn, null)
  description = "IAM OIDC provider ARN for GitHub Actions"
}
