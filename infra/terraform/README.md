# TechGraph Terraform

This Terraform configuration creates the AWS infrastructure needed for the first TechGraph deployment:

- EC2 instance
- Security group
- EC2 key pair

Application setup is done after SSH login with Docker Compose.

## 1. Prepare SSH Key

```bash
ssh-keygen -t ed25519 -f ~/.ssh/tech-graph-aws -C "tech-graph-aws"
```

## 2. Configure Variables

```bash
cd infra/terraform
cp terraform.tfvars.example terraform.tfvars
```

Find your current public IP:

```bash
curl https://checkip.amazonaws.com
```

Set `ssh_allowed_cidr` in `terraform.tfvars`:

```hcl
ssh_allowed_cidr = "YOUR_PUBLIC_IP/32"
```

Do not commit `terraform.tfvars`.

## 3. Initialize and Plan

```bash
terraform init
terraform fmt
terraform validate
terraform plan
```

## 4. Apply

```bash
terraform apply
```

After apply, Terraform prints an SSH command and the public URL.

## 5. Destroy When Finished

To avoid unnecessary AWS costs:

```bash
terraform destroy
```
