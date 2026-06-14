run "core_subset_shape" {
  command = plan

  assert {
    condition     = module.s3.bucket_names["runtime"] == "gamloot-localstack-runtime"
    error_message = "runtime bucket name should follow the localstack name prefix"
  }

  assert {
    condition     = aws_cloudwatch_log_group.service.name == "/ecs/gamloot-localstack/user-api"
    error_message = "CloudWatch log group should match ECS service log naming"
  }

  assert {
    condition     = aws_ssm_parameter.database_url.name == "/gamloot-localstack/DATABASE_URL"
    error_message = "DATABASE_URL SSM parameter should match runtime parameter naming"
  }

  assert {
    condition     = aws_ecr_repository.user_api.name == "gamloot-localstack/user-api"
    error_message = "ECR repository should match service repository naming"
  }

  assert {
    condition     = aws_iam_role.task_execution.name == "gamloot-localstack-ecs-execution"
    error_message = "IAM execution role should match ECS execution role naming"
  }
}
