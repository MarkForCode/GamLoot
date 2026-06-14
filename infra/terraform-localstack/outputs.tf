output "bucket_names" {
  value = module.s3.bucket_names
}

output "log_group_name" {
  value = aws_cloudwatch_log_group.service.name
}

output "ssm_parameter_name" {
  value = aws_ssm_parameter.database_url.name
}

output "ecr_repository_name" {
  value = aws_ecr_repository.user_api.name
}

output "iam_role_name" {
  value = aws_iam_role.task_execution.name
}
