output "endpoint" {
  value = aws_db_instance.postgres.address
}

output "identifier" {
  value = aws_db_instance.postgres.identifier
}

output "security_group_id" {
  value = aws_security_group.this.id
}

output "database_url_parameter_name" {
  value = aws_ssm_parameter.database_url.name
}
