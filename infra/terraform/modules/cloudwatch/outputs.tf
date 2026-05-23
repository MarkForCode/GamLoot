output "log_group_names" {
  value = { for name, log_group in aws_cloudwatch_log_group.service : name => log_group.name }
}

output "dashboard_name" {
  value = aws_cloudwatch_dashboard.this.dashboard_name
}
