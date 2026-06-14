output "grafana_endpoint" {
  value = "http://${aws_service_discovery_service.this.name}.${var.service_discovery_namespace_name}:3000"
}

output "grafana_service_name" {
  value = aws_ecs_service.this.name
}

output "security_group_id" {
  value = aws_security_group.this.id
}

output "service_discovery_name" {
  value = aws_service_discovery_service.this.name
}
