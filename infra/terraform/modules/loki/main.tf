locals {
  service_name = "loki"

  loki_targets = {
    write = {
      target = "write"
      port   = 3100
    }
    read = {
      target = "read"
      port   = 3100
    }
    backend = {
      target = "backend"
      port   = 3100
    }
  }

  loki_config = yamlencode({
    auth_enabled = false
    server = {
      http_listen_port = 3100
      grpc_listen_port = 9095
    }
    common = {
      path_prefix        = "/tmp/loki"
      replication_factor = 1
      ring = {
        kvstore = {
          store = "memberlist"
        }
      }
    }
    memberlist = {
      join_members = [
        "loki-write.${var.service_discovery_namespace_name}:7946",
        "loki-read.${var.service_discovery_namespace_name}:7946",
        "loki-backend.${var.service_discovery_namespace_name}:7946"
      ]
    }
    schema_config = {
      configs = [
        {
          from         = "2024-01-01"
          store        = "tsdb"
          object_store = "s3"
          schema       = "v13"
          index = {
            prefix = "index_"
            period = "24h"
          }
        }
      ]
    }
    storage_config = {
      aws = {
        region           = var.aws_region
        bucketnames      = aws_s3_bucket.this.bucket
        s3forcepathstyle = false
      }
      tsdb_shipper = {
        active_index_directory = "/tmp/loki/tsdb-index"
        cache_location         = "/tmp/loki/tsdb-cache"
      }
    }
    compactor = {
      working_directory    = "/tmp/loki/compactor"
      retention_enabled    = true
      delete_request_store = "s3"
    }
    limits_config = {
      allow_structured_metadata = true
      retention_period          = "168h"
    }
  })

  nginx_config = <<-EOT
    events {}

    http {
      upstream loki_write {
        server loki-write.${var.service_discovery_namespace_name}:3100;
      }

      upstream loki_read {
        server loki-read.${var.service_discovery_namespace_name}:3100;
      }

      server {
        listen 3100;

        location = /ready {
          proxy_pass http://loki_read$request_uri;
        }

        location = /loki/api/v1/push {
          proxy_pass http://loki_write$request_uri;
        }

        location ~ /loki/api/v1/(tail|query|query_range|labels|label|series) {
          proxy_pass http://loki_read$request_uri;
        }

        location / {
          proxy_pass http://loki_read$request_uri;
        }
      }
    }
  EOT
}

resource "aws_s3_bucket" "this" {
  bucket = lower(replace("${var.name_prefix}-loki", "_", "-"))
}

resource "aws_s3_bucket_public_access_block" "this" {
  bucket                  = aws_s3_bucket.this.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "this" {
  bucket = aws_s3_bucket.this.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_versioning" "this" {
  bucket = aws_s3_bucket.this.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_security_group" "this" {
  name   = "${var.name_prefix}-${local.service_name}-sg"
  vpc_id = var.vpc_id

  ingress {
    from_port   = 3100
    to_port     = 3100
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
  }

  ingress {
    from_port       = 3100
    to_port         = 3100
    protocol        = "tcp"
    security_groups = values(var.app_security_group_ids)
  }

  ingress {
    from_port = 3100
    to_port   = 3100
    protocol  = "tcp"
    self      = true
  }

  ingress {
    from_port = 7946
    to_port   = 7946
    protocol  = "tcp"
    self      = true
  }

  ingress {
    from_port = 9095
    to_port   = 9095
    protocol  = "tcp"
    self      = true
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_iam_role" "task_execution" {
  name = "${var.name_prefix}-loki-execution"

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
  name = "${var.name_prefix}-loki-task"

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

resource "aws_iam_role_policy" "s3" {
  name = "${var.name_prefix}-loki-s3"
  role = aws_iam_role.task.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "s3:ListBucket"
        ]
        Effect   = "Allow"
        Resource = aws_s3_bucket.this.arn
      },
      {
        Action = [
          "s3:DeleteObject",
          "s3:GetObject",
          "s3:PutObject"
        ]
        Effect   = "Allow"
        Resource = "${aws_s3_bucket.this.arn}/*"
      }
    ]
  })
}

resource "aws_ecs_task_definition" "loki" {
  for_each = local.loki_targets

  family                   = "${var.name_prefix}-loki-${each.key}"
  cpu                      = var.cpu
  memory                   = var.memory
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  execution_role_arn       = aws_iam_role.task_execution.arn
  task_role_arn            = aws_iam_role.task.arn

  container_definitions = jsonencode([
    {
      name       = "loki-${each.key}"
      image      = "grafana/loki:latest"
      essential  = true
      entryPoint = ["sh", "-c"]
      command = [
        "printf '%s' \"$LOKI_CONFIG\" > /tmp/loki-config.yaml && /usr/bin/loki -config.expand-env=true -config.file=/tmp/loki-config.yaml -target=${each.value.target}"
      ]

      portMappings = [
        {
          containerPort = 3100
          hostPort      = 3100
          protocol      = "tcp"
        },
        {
          containerPort = 9095
          hostPort      = 9095
          protocol      = "tcp"
        },
        {
          containerPort = 7946
          hostPort      = 7946
          protocol      = "tcp"
        }
      ]

      environment = [
        {
          name  = "LOKI_CONFIG"
          value = local.loki_config
        }
      ]

    }
  ])
}

resource "aws_service_discovery_service" "loki" {
  for_each = local.loki_targets

  name = "loki-${each.key}"

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

resource "aws_ecs_service" "loki" {
  for_each = local.loki_targets

  name            = "${var.name_prefix}-loki-${each.key}"
  cluster         = var.ecs_cluster_id
  task_definition = aws_ecs_task_definition.loki[each.key].arn
  desired_count   = var.desired_count
  launch_type     = "FARGATE"

  network_configuration {
    assign_public_ip = false
    security_groups  = [aws_security_group.this.id]
    subnets          = var.private_subnet_ids
  }

  service_registries {
    registry_arn = aws_service_discovery_service.loki[each.key].arn
  }
}

resource "aws_ecs_task_definition" "gateway" {
  family                   = "${var.name_prefix}-loki-gateway"
  cpu                      = 256
  memory                   = 512
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  execution_role_arn       = aws_iam_role.task_execution.arn

  container_definitions = jsonencode([
    {
      name      = "loki-gateway"
      image     = "nginx:1.27-alpine"
      essential = true

      portMappings = [
        {
          containerPort = 3100
          hostPort      = 3100
          protocol      = "tcp"
        }
      ]

      entryPoint = ["sh", "-c"]
      command    = ["printf '%s' \"$NGINX_CONFIG\" > /etc/nginx/nginx.conf && nginx -g 'daemon off;'"]

      environment = [
        {
          name  = "NGINX_CONFIG"
          value = local.nginx_config
        }
      ]
    }
  ])
}

resource "aws_service_discovery_service" "gateway" {
  name = "loki"

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

resource "aws_ecs_service" "gateway" {
  name            = "${var.name_prefix}-loki-gateway"
  cluster         = var.ecs_cluster_id
  task_definition = aws_ecs_task_definition.gateway.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  network_configuration {
    assign_public_ip = false
    security_groups  = [aws_security_group.this.id]
    subnets          = var.private_subnet_ids
  }

  service_registries {
    registry_arn = aws_service_discovery_service.gateway.arn
  }

  depends_on = [aws_ecs_service.loki]
}
