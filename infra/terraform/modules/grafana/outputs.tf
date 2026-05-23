output "grafana_endpoint" {
  value = aws_grafana_workspace.this.endpoint
}

output "grafana_workspace_id" {
  value = aws_grafana_workspace.this.id
}

output "prometheus_workspace_id" {
  value = aws_prometheus_workspace.this.id
}

output "prometheus_remote_write_endpoint" {
  value = "${trimsuffix(aws_prometheus_workspace.this.prometheus_endpoint, "/")}/api/v1/remote_write"
}

output "xray_datasource_enabled" {
  value = contains(aws_grafana_workspace.this.data_sources, "XRAY")
}
