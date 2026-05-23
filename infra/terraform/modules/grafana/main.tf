resource "aws_prometheus_workspace" "this" {
  alias = "${var.name_prefix}-metrics"
}

resource "aws_grafana_workspace" "this" {
  name                     = "${var.name_prefix}-grafana"
  account_access_type      = "CURRENT_ACCOUNT"
  authentication_providers = var.authentication_providers
  data_sources             = ["CLOUDWATCH", "PROMETHEUS", "XRAY"]
  permission_type          = "SERVICE_MANAGED"
}
