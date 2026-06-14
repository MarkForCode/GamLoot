locals {
  service_name = "grafana"

  datasource_config = yamlencode({
    apiVersion = 1
    datasources = [
      {
        name      = "Loki"
        uid       = "loki"
        type      = "loki"
        access    = "proxy"
        url       = var.loki_endpoint
        isDefault = true
      }
    ]
  })
}

resource "aws_security_group" "this" {
  name   = "${var.name_prefix}-${local.service_name}-sg"
  vpc_id = var.vpc_id

  ingress {
    from_port   = 3000
    to_port     = 3000
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_iam_role" "task_execution" {
  name = "${var.name_prefix}-grafana-execution"

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
  count = var.admin_password_parameter_name == "" ? 0 : 1

  name = "${var.name_prefix}-grafana-execution-ssm"
  role = aws_iam_role.task_execution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "ssm:GetParameter",
          "ssm:GetParameters"
        ]
        Effect   = "Allow"
        Resource = "arn:aws:ssm:*:*:parameter${var.admin_password_parameter_name}"
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
  name = "${var.name_prefix}-grafana-task"

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
      image     = "grafana/grafana:latest"
      essential = true

      portMappings = [
        {
          containerPort = 3000
          hostPort      = 3000
          protocol      = "tcp"
        }
      ]

      entryPoint = ["sh", "-c"]
      command    = ["mkdir -p /etc/grafana/provisioning/datasources && printf '%s' \"$GRAFANA_DATASOURCES\" > /etc/grafana/provisioning/datasources/datasources.yaml && /run.sh"]

      environment = [
        {
          name  = "GF_SECURITY_ADMIN_USER"
          value = "admin"
        },
        {
          name  = "GF_SERVER_ROOT_URL"
          value = "http://grafana.${var.service_discovery_namespace_name}:3000"
        },
        {
          name  = "GRAFANA_DATASOURCES"
          value = local.datasource_config
        }
      ]

      secrets = var.admin_password_parameter_name == "" ? [] : [
        {
          name      = "GF_SECURITY_ADMIN_PASSWORD"
          valueFrom = var.admin_password_parameter_name
        }
      ]
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
  desired_count   = 1
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
