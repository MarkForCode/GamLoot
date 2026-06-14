locals {
  name_prefix = "${var.project_name}-${var.environment}"
}

module "s3" {
  source = "../terraform/modules/s3"

  name_prefix  = local.name_prefix
  bucket_names = var.app_bucket_names
}

resource "aws_cloudwatch_log_group" "service" {
  name              = "/ecs/${local.name_prefix}/user-api"
  retention_in_days = var.log_retention_days
}

resource "aws_ssm_parameter" "database_url" {
  name  = "/${local.name_prefix}/DATABASE_URL"
  type  = "SecureString"
  value = "postgres://localstack:localstack@localhost:5432/localstack"
}

resource "aws_ecr_repository" "user_api" {
  name                 = "${local.name_prefix}/user-api"
  image_tag_mutability = "MUTABLE"
}

resource "aws_iam_role" "task_execution" {
  name = "${local.name_prefix}-ecs-execution"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })
}
