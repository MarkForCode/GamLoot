locals {
  github_oidc_url = "https://token.actions.githubusercontent.com"
  github_oidc_subjects = [
    for branch in var.github_oidc_allowed_branches :
    "repo:${var.github_oidc_repository}:ref:refs/heads/${branch}"
  ]
  github_actions_role_name = "${local.name_prefix}-github-actions-terraform"
  app_bucket_arns = [
    for bucket in var.app_bucket_names :
    "arn:aws:s3:::${local.name_prefix}-${bucket}"
  ]
}

data "tls_certificate" "github_actions" {
  count = var.github_oidc_enabled ? 1 : 0

  url = local.github_oidc_url
}

resource "aws_iam_openid_connect_provider" "github_actions" {
  count = var.github_oidc_enabled ? 1 : 0

  url             = local.github_oidc_url
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = [data.tls_certificate.github_actions[0].certificates[0].sha1_fingerprint]
}

data "aws_iam_policy_document" "github_actions_assume_role" {
  count = var.github_oidc_enabled ? 1 : 0

  statement {
    actions = ["sts:AssumeRoleWithWebIdentity"]

    principals {
      type        = "Federated"
      identifiers = [aws_iam_openid_connect_provider.github_actions[0].arn]
    }

    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = ["sts.amazonaws.com"]
    }

    condition {
      test     = "StringLike"
      variable = "token.actions.githubusercontent.com:sub"
      values   = local.github_oidc_subjects
    }
  }
}

resource "aws_iam_role" "github_actions_terraform" {
  count = var.github_oidc_enabled ? 1 : 0

  name               = local.github_actions_role_name
  assume_role_policy = data.aws_iam_policy_document.github_actions_assume_role[0].json
}

data "aws_iam_policy_document" "github_actions_terraform_deploy" {
  count = var.github_oidc_enabled ? 1 : 0

  statement {
    sid = "TerraformStateBucket"
    actions = [
      "s3:GetBucketVersioning",
      "s3:GetBucketLocation",
      "s3:ListBucket",
    ]
    resources = ["arn:aws:s3:::${var.terraform_state_bucket}"]
  }

  statement {
    sid = "TerraformStateObjects"
    actions = [
      "s3:DeleteObject",
      "s3:GetObject",
      "s3:PutObject",
    ]
    resources = ["arn:aws:s3:::${var.terraform_state_bucket}/*"]
  }

  statement {
    sid = "RuntimeBuckets"
    actions = [
      "s3:CreateBucket",
      "s3:DeleteBucket",
      "s3:DeleteBucketPolicy",
      "s3:DeleteBucketPublicAccessBlock",
      "s3:DeleteObject",
      "s3:GetAccelerateConfiguration",
      "s3:GetBucketAcl",
      "s3:GetBucketCORS",
      "s3:GetBucketLocation",
      "s3:GetBucketLogging",
      "s3:GetBucketObjectLockConfiguration",
      "s3:GetBucketOwnershipControls",
      "s3:GetBucketPolicy",
      "s3:GetBucketPublicAccessBlock",
      "s3:GetBucketRequestPayment",
      "s3:GetBucketTagging",
      "s3:GetBucketVersioning",
      "s3:GetBucketWebsite",
      "s3:GetEncryptionConfiguration",
      "s3:GetLifecycleConfiguration",
      "s3:GetObject",
      "s3:ListBucket",
      "s3:PutBucketAcl",
      "s3:PutBucketOwnershipControls",
      "s3:PutBucketPolicy",
      "s3:PutBucketPublicAccessBlock",
      "s3:PutBucketTagging",
      "s3:PutBucketVersioning",
      "s3:PutEncryptionConfiguration",
      "s3:PutObject",
    ]
    resources = concat(local.app_bucket_arns, [for arn in local.app_bucket_arns : "${arn}/*"])
  }

  statement {
    sid = "CoreStackServices"
    actions = [
      "acm:DescribeCertificate",
      "acm:ListCertificates",
      "aps:*",
      "application-autoscaling:*",
      "cloudwatch:*",
      "ec2:*",
      "ecr:*",
      "ecs:*",
      "elasticache:*",
      "elasticloadbalancing:*",
      "grafana:*",
      "logs:*",
      "rds:*",
      "servicediscovery:*",
      "ssm:*",
      "xray:*",
    ]
    resources = ["*"]
  }

  statement {
    sid = "ManageStackIam"
    actions = [
      "iam:AttachRolePolicy",
      "iam:CreateOpenIDConnectProvider",
      "iam:CreatePolicy",
      "iam:CreatePolicyVersion",
      "iam:CreateRole",
      "iam:DeleteOpenIDConnectProvider",
      "iam:DeletePolicy",
      "iam:DeletePolicyVersion",
      "iam:DeleteRole",
      "iam:DeleteRolePolicy",
      "iam:DetachRolePolicy",
      "iam:GetOpenIDConnectProvider",
      "iam:GetPolicy",
      "iam:GetPolicyVersion",
      "iam:GetRole",
      "iam:GetRolePolicy",
      "iam:ListAttachedRolePolicies",
      "iam:ListInstanceProfilesForRole",
      "iam:ListOpenIDConnectProviderTags",
      "iam:ListPolicyVersions",
      "iam:ListRolePolicies",
      "iam:ListRoleTags",
      "iam:PutRolePolicy",
      "iam:TagOpenIDConnectProvider",
      "iam:TagPolicy",
      "iam:TagRole",
      "iam:UntagOpenIDConnectProvider",
      "iam:UntagPolicy",
      "iam:UntagRole",
      "iam:UpdateAssumeRolePolicy",
      "iam:UpdateOpenIDConnectProviderThumbprint",
    ]
    resources = [
      "arn:aws:iam::*:oidc-provider/token.actions.githubusercontent.com",
      "arn:aws:iam::*:policy/${local.name_prefix}-*",
      "arn:aws:iam::*:role/${local.name_prefix}-*",
    ]
  }

  statement {
    sid = "ListIamForTerraform"
    actions = [
      "iam:ListOpenIDConnectProviders",
      "iam:ListPolicies",
      "iam:ListRolePolicies",
      "iam:ListRoles",
    ]
    resources = ["*"]
  }

  statement {
    sid       = "PassEcsRoles"
    actions   = ["iam:PassRole"]
    resources = ["arn:aws:iam::*:role/${local.name_prefix}-*"]

    condition {
      test     = "StringEquals"
      variable = "iam:PassedToService"
      values   = ["ecs-tasks.amazonaws.com"]
    }
  }

  statement {
    sid = "CreateServiceLinkedRoles"
    actions = [
      "iam:CreateServiceLinkedRole",
    ]
    resources = ["arn:aws:iam::*:role/aws-service-role/*"]
  }
}

resource "aws_iam_policy" "github_actions_terraform_deploy" {
  count = var.github_oidc_enabled ? 1 : 0

  name   = "${local.github_actions_role_name}-deploy"
  policy = data.aws_iam_policy_document.github_actions_terraform_deploy[0].json
}

resource "aws_iam_role_policy_attachment" "github_actions_terraform_deploy" {
  count = var.github_oidc_enabled ? 1 : 0

  role       = aws_iam_role.github_actions_terraform[0].name
  policy_arn = aws_iam_policy.github_actions_terraform_deploy[0].arn
}
