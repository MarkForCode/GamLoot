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
  value = try(module.ecs_service[0].cluster_name, null)
}

output "ecs_service_names" {
  value = try(module.ecs_service[0].service_names, {})
}

output "ecr_repositories" {
  value = try(module.ecs_service[0].ecr_repositories, {})
}

output "rds_endpoint" {
  value = try(module.rds[0].endpoint, null)
}

output "database_url_parameter_name" {
  value = try(module.rds[0].database_url_parameter_name, null)
}

output "redis_endpoint" {
  value = try(module.redis[0].endpoint, null)
}

output "redis_url_parameter_name" {
  value = try(module.redis[0].redis_url_parameter_name, null)
}

output "app_bucket_names" {
  value = module.s3.bucket_names
}

output "cloudwatch_log_group_names" {
  value = try(module.cloudwatch[0].log_group_names, {})
}

output "cloudwatch_dashboard_name" {
  value = try(module.cloudwatch[0].dashboard_name, null)
}

output "grafana_endpoint" {
  value = try(module.grafana[0].grafana_endpoint, null)
}

output "grafana_workspace_id" {
  value = try(module.grafana[0].grafana_workspace_id, null)
}

output "prometheus_workspace_id" {
  value = try(module.grafana[0].prometheus_workspace_id, null)
}

output "prometheus_remote_write_endpoint" {
  value = try(module.grafana[0].prometheus_remote_write_endpoint, null)
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
  value = try(module.grafana[0].xray_datasource_enabled, false)
}

output "github_actions_role_arn" {
  value       = try(aws_iam_role.github_actions_terraform[0].arn, null)
  description = "IAM role ARN for GitHub Actions Terraform jobs to assume via OIDC"
}

output "github_oidc_provider_arn" {
  value       = try(aws_iam_openid_connect_provider.github_actions[0].arn, null)
  description = "IAM OIDC provider ARN for GitHub Actions"
}
