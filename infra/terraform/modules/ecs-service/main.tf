locals {
  service_ports = {
    for name, service in var.services : name => try(service.port, null)
  }

  discoverable_services = {
    for name, service in var.services : name => service
    if try(service.port, null) != null && var.service_discovery_namespace_id != null
  }
}

resource "aws_ecs_cluster" "this" {
  name = "${var.name_prefix}-cluster"
}

resource "aws_ecr_repository" "repos" {
  for_each = var.services

  name                 = replace("${var.name_prefix}/${each.key}", "_", "-")
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }
}

resource "aws_iam_role" "task_execution" {
  name = "${var.name_prefix}-ecs-execution"

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

resource "aws_iam_role_policy" "task_execution_ssm" {
  name = "${var.name_prefix}-ecs-execution-ssm"
  role = aws_iam_role.task_execution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "ssm:GetParameter",
          "ssm:GetParameters"
        ]
        Effect = "Allow"
        Resource = [
          "arn:aws:ssm:${var.aws_region}:*:parameter${var.database_url_parameter_name}",
          "arn:aws:ssm:${var.aws_region}:*:parameter${var.redis_url_parameter_name}"
        ]
      },
      {
        Action   = "kms:Decrypt"
        Effect   = "Allow"
        Resource = "*"
      }
    ]
  })
}

resource "aws_iam_role" "task" {
  name = "${var.name_prefix}-ecs-task"

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

resource "aws_security_group" "service" {
  for_each = var.services

  name   = "${var.name_prefix}-${each.key}-svc-sg"
  vpc_id = var.vpc_id

  dynamic "ingress" {
    for_each = each.value.public ? [each.value] : []

    content {
      from_port       = ingress.value.port
      to_port         = ingress.value.port
      protocol        = "tcp"
      security_groups = [var.alb_security_group_id]
    }
  }

  dynamic "ingress" {
    for_each = try(each.value.port, null) != null && var.collector_security_group_id != null ? [each.value] : []

    content {
      from_port       = ingress.value.port
      to_port         = ingress.value.port
      protocol        = "tcp"
      security_groups = [var.collector_security_group_id]
    }
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_ecs_task_definition" "service" {
  for_each = var.services

  family                   = "${var.name_prefix}-${each.key}"
  cpu                      = var.container_cpu
  memory                   = var.container_memory
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  execution_role_arn       = aws_iam_role.task_execution.arn
  task_role_arn            = aws_iam_role.task.arn

  container_definitions = jsonencode([
    {
      name      = each.key
      image     = "${aws_ecr_repository.repos[each.key].repository_url}:latest"
      essential = true

      portMappings = local.service_ports[each.key] == null ? [] : [
        {
          containerPort = local.service_ports[each.key]
          hostPort      = local.service_ports[each.key]
          protocol      = "tcp"
        }
      ]

      environment = [
        {
          name  = "APP_ENV"
          value = var.environment
        },
        {
          name  = "DEPLOYMENT_ENVIRONMENT"
          value = var.environment
        },
        {
          name  = "OTEL_SERVICE_NAME"
          value = each.key
        },
        {
          name  = "OTEL_EXPORTER_OTLP_ENDPOINT"
          value = var.otlp_endpoint
        },
        {
          name  = "OTEL_TRACES_SAMPLER"
          value = "parentbased_traceidratio"
        },
        {
          name  = "OTEL_TRACES_SAMPLER_ARG"
          value = var.trace_sample_ratio
        },
        {
          name  = "RUST_LOG"
          value = "info"
        }
      ]

      secrets = [
        {
          name      = "DATABASE_URL"
          valueFrom = var.database_url_parameter_name
        },
        {
          name      = "REDIS_URL"
          valueFrom = var.redis_url_parameter_name
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = var.log_group_names[each.key]
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = each.key
        }
      }
    }
  ])
}

resource "aws_ecs_service" "service" {
  for_each = var.services

  name            = "${var.name_prefix}-${each.key}"
  cluster         = aws_ecs_cluster.this.id
  task_definition = aws_ecs_task_definition.service[each.key].arn
  desired_count   = var.desired_count
  launch_type     = "FARGATE"

  network_configuration {
    assign_public_ip = false
    security_groups  = [aws_security_group.service[each.key].id]
    subnets          = var.private_subnet_ids
  }

  dynamic "load_balancer" {
    for_each = each.value.public ? [each.value] : []

    content {
      container_name   = each.key
      container_port   = load_balancer.value.port
      target_group_arn = var.target_group_arns[each.key]
    }
  }

  dynamic "service_registries" {
    for_each = contains(keys(local.discoverable_services), each.key) ? [each.value] : []

    content {
      registry_arn = aws_service_discovery_service.service[each.key].arn
    }
  }
}

resource "aws_service_discovery_service" "service" {
  for_each = local.discoverable_services

  name = each.key

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
