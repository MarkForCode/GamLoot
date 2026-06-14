locals {
  service_name = "observability-collector"

  collector_config = yamlencode({
    receivers = {
      otlp = {
        protocols = {
          grpc = {
            endpoint = "0.0.0.0:4317"
          }
          http = {
            endpoint = "0.0.0.0:4318"
          }
        }
      }
      prometheus = {
        config = {
          global = {
            scrape_interval = "15s"
          }
          scrape_configs = [
            for name, target in var.scrape_targets : {
              job_name     = name
              metrics_path = target.path
              static_configs = [
                {
                  targets = ["${target.host}:${target.port}"]
                }
              ]
            }
          ]
        }
      }
    }
    processors = {
      batch = {}
    }
    exporters = {
      awsxray = {
        region = var.aws_region
      }
      prometheusremotewrite = {
        endpoint = var.prometheus_remote_write_endpoint
        auth = {
          authenticator = "sigv4auth"
        }
      }
    }
    extensions = {
      sigv4auth = {
        region  = var.aws_region
        service = "aps"
      }
    }
    service = {
      extensions = ["sigv4auth"]
      pipelines = {
        traces = {
          receivers  = ["otlp"]
          processors = ["batch"]
          exporters  = ["awsxray"]
        }
        metrics = {
          receivers  = ["prometheus"]
          processors = ["batch"]
          exporters  = ["prometheusremotewrite"]
        }
      }
    }
  })
}

resource "aws_cloudwatch_log_group" "this" {
  name              = "/ecs/${var.name_prefix}/${local.service_name}"
  retention_in_days = var.log_retention_days
}

resource "aws_security_group" "this" {
  name   = "${var.name_prefix}-${local.service_name}-sg"
  vpc_id = var.vpc_id

  ingress {
    from_port       = 4317
    to_port         = 4317
    protocol        = "tcp"
    security_groups = values(var.app_security_group_ids)
  }

  ingress {
    from_port       = 4318
    to_port         = 4318
    protocol        = "tcp"
    security_groups = values(var.app_security_group_ids)
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_security_group_rule" "app_metrics_ingress" {
  for_each = var.scrape_targets

  type                     = "ingress"
  from_port                = each.value.port
  to_port                  = each.value.port
  protocol                 = "tcp"
  security_group_id        = var.app_security_group_ids[each.key]
  source_security_group_id = aws_security_group.this.id
}

resource "aws_iam_role" "task_execution" {
  name = "${var.name_prefix}-adot-execution"

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

resource "aws_iam_role_policy_attachment" "task_execution" {
  role       = aws_iam_role.task_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

resource "aws_iam_role" "task" {
  name = "${var.name_prefix}-adot-task"

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

resource "aws_iam_role_policy_attachment" "amp_remote_write" {
  role       = aws_iam_role.task.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonPrometheusRemoteWriteAccess"
}

resource "aws_iam_role_policy_attachment" "xray_write" {
  role       = aws_iam_role.task.name
  policy_arn = "arn:aws:iam::aws:policy/AWSXRayDaemonWriteAccess"
}

resource "aws_ecs_task_definition" "this" {
  family                   = "${var.name_prefix}-${local.service_name}"
  cpu                      = var.cpu
  memory                   = var.memory
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  execution_role_arn       = aws_iam_role.task_execution.arn
  task_role_arn            = aws_iam_role.task.arn

  container_definitions = jsonencode([
    {
      name      = local.service_name
      image     = "public.ecr.aws/aws-observability/aws-otel-collector:latest"
      essential = true
      command   = ["--config=env:AOT_CONFIG_CONTENT"]

      portMappings = [
        {
          containerPort = 4317
          hostPort      = 4317
          protocol      = "tcp"
        },
        {
          containerPort = 4318
          hostPort      = 4318
          protocol      = "tcp"
        }
      ]

      environment = [
        {
          name  = "AOT_CONFIG_CONTENT"
          value = local.collector_config
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.this.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = local.service_name
        }
      }
    }
  ])
}

resource "aws_service_discovery_service" "this" {
  name = local.service_name

  dns_config {
    namespace_id   = var.service_discovery_namespace_id
    routing_policy = "MULTIVALUE"

    dns_records {
      ttl  = 10
      type = "A"
    }
  }

  health_check_custom_config {
    failure_threshold = 1
  }
}

resource "aws_ecs_service" "this" {
  name            = "${var.name_prefix}-${local.service_name}"
  cluster         = var.ecs_cluster_id
  task_definition = aws_ecs_task_definition.this.arn
  desired_count   = var.desired_count
  launch_type     = "FARGATE"

  network_configuration {
    assign_public_ip = false
    security_groups  = [aws_security_group.this.id]
    subnets          = var.private_subnet_ids
  }

  service_registries {
    registry_arn = aws_service_discovery_service.this.arn
  }
}
