output "gateway_endpoint" {
  value = "http://${aws_service_discovery_service.gateway.name}.${var.service_discovery_namespace_name}:3100"
}

output "gateway_service_name" {
  value = aws_ecs_service.gateway.name
}

output "service_names" {
  value = merge(
    { for name, service in aws_ecs_service.loki : "loki-${name}" => service.name },
    { "loki-gateway" = aws_ecs_service.gateway.name }
  )
}

output "security_group_id" {
  value = aws_security_group.this.id
}

output "bucket_name" {
  value = aws_s3_bucket.this.bucket
}
