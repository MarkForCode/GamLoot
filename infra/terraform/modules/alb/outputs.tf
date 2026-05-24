output "dns_name" {
  value = aws_lb.this.dns_name
}

output "listener_arn" {
  value = aws_lb_listener.primary.arn
}

output "security_group_id" {
  value = aws_security_group.this.id
}

output "target_group_arns" {
  value = { for name, target_group in aws_lb_target_group.service : name => target_group.arn }
}

output "target_group_arn_suffixes" {
  value = { for name, target_group in aws_lb_target_group.service : name => target_group.arn_suffix }
}

output "load_balancer_arn_suffix" {
  value = aws_lb.this.arn_suffix
}
