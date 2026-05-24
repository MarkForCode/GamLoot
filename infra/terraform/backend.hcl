bucket       = "markhuang-test-bucket"
key          = "platform/terraform.tfstate"
region       = "ap-southeast-1"
encrypt      = true
use_lockfile = true

# Non-default workspaces are stored as:
# gamloot/<workspace>/platform/terraform.tfstate
workspace_key_prefix = "gamloot"
