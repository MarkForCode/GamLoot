output "cluster_name" {
  value = aws_ecs_cluster.this.name
}

output "cluster_id" {
  value = aws_ecs_cluster.this.id
}

output "service_names" {
  value = { for name, service in aws_ecs_service.service : name => service.name }
}

output "ecr_repositories" {
  value = { for name, repo in aws_ecr_repository.repos : name => repo.repository_url }
}

output "task_execution_role_arn" {
  value = aws_iam_role.task_execution.arn
}

output "security_group_ids" {
  value = { for name, security_group in aws_security_group.service : name => security_group.id }
}

output "service_discovery_names" {
  value = { for name, service in aws_service_discovery_service.service : name => service.name }
}
