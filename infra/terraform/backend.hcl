bucket       = "gamloot-terraform-state"
key          = "platform/terraform.tfstate"
region       = "us-east-1"
encrypt      = true
use_lockfile = true

# Non-default workspaces are stored as:
# gamloot/<workspace>/platform/terraform.tfstate
workspace_key_prefix = "gamloot"
