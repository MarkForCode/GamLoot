output "service_name" {
  value = aws_ecs_service.this.name
}

output "security_group_id" {
  value = aws_security_group.this.id
}

output "log_group_name" {
  value = aws_cloudwatch_log_group.this.name
}

output "otlp_grpc_endpoint" {
  value = "http://${aws_service_discovery_service.this.name}.${var.service_discovery_namespace_name}:4317"
}

output "otlp_http_endpoint" {
  value = "http://${aws_service_discovery_service.this.name}.${var.service_discovery_namespace_name}:4318"
}
