output "instance_id" {
  description = "EC2 instance ID."
  value       = aws_instance.app.id
}

output "public_ip" {
  description = "EC2 public IPv4 address."
  value       = aws_instance.app.public_ip
}

output "public_dns" {
  description = "EC2 public DNS name."
  value       = aws_instance.app.public_dns
}

output "app_url" {
  description = "TechGraph URL."
  value       = "http://${aws_instance.app.public_ip}"
}

output "api_health_url" {
  description = "TechGraph API health URL through Nginx."
  value       = "http://${aws_instance.app.public_ip}/backend/"
}

output "ssh_command" {
  description = "SSH command for the EC2 instance."
  value       = "ssh -i ${trimsuffix(var.public_key_path, ".pub")} ubuntu@${aws_instance.app.public_ip}"
}

output "ssm_session_command" {
  description = "AWS CLI command to connect through Session Manager."
  value       = "aws ssm start-session --target ${aws_instance.app.id} --profile ${var.aws_profile} --region ${var.aws_region}"
}
