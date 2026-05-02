variable "aws_region" {
  description = "AWS region to deploy TechGraph into."
  type        = string
  default     = "ap-northeast-1"
}

variable "aws_profile" {
  description = "AWS CLI profile used by Terraform."
  type        = string
  default     = "techgraph"
}

variable "project_name" {
  description = "Name prefix for AWS resources."
  type        = string
  default     = "tech-graph"
}

variable "instance_type" {
  description = "EC2 instance type."
  type        = string
  default     = "t3.micro"
}

variable "root_volume_size" {
  description = "Root EBS volume size in GiB."
  type        = number
  default     = 20
}

variable "public_key_path" {
  description = "Path to the SSH public key used for EC2 login."
  type        = string
  default     = "~/.ssh/tech-graph-aws.pub"
}

variable "ssh_allowed_cidr" {
  description = "CIDR allowed to SSH into the EC2 instance. Use your current public IP with /32."
  type        = string
}

variable "http_allowed_cidrs" {
  description = "CIDR blocks allowed to access HTTP/HTTPS."
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

variable "tags" {
  description = "Common tags."
  type        = map(string)
  default = {
    Project = "TechGraph"
    Managed = "Terraform"
  }
}
