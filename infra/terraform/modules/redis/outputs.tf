output "endpoint" {
  value = aws_elasticache_cluster.redis.cache_nodes[0].address
}

output "cluster_id" {
  value = aws_elasticache_cluster.redis.cluster_id
}

output "security_group_id" {
  value = aws_security_group.this.id
}

output "redis_url_parameter_name" {
  value = aws_ssm_parameter.redis_url.name
}
