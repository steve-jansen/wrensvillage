# Contribution Guide for WrensVillage.com
---

## Prerequisites

### Required Tools

Install via Homebrew on macOS:

```bash
# Terraform — infrastructure as code
brew install terraform

# AWS CLI — S3 deployment, CloudFront invalidation, state bucket setup
brew install awscli

# Node.js — provides npx for local dev server (npx serve)
brew install node

# Git
brew install git
```

Verify installations:
```bash
terraform --version    # >= 1.5
aws --version          # >= 2.x
node --version         # >= 18.x
npx --version
git --version
```

### Future Phase (Jekyll)

When you migrate to Jekyll, add:
```bash
brew install ruby
gem install jekyll bundler
```

### AWS Configuration

Configure the AWS CLI with credentials that have sufficient permissions for S3, CloudFront, ACM, and Route 53:

```bash
aws configure
# AWS Access Key ID: [your key]
# AWS Secret Access Key: [your secret]
# Default region name: us-east-1
# Default output format: json
```

Verify access:
```bash
aws sts get-caller-identity
```

The IAM user or role needs the following permissions at minimum: `s3:*`, `cloudfront:*`, `acm:*`, `route53:*`, `route53domains:*`. For a solo project, the `AdministratorAccess` managed policy works, but if you prefer least-privilege, create a scoped IAM policy for these services.

### Accounts and Access

- [ ] AWS account with billing enabled
- [ ] AWS IAM user or role with CLI credentials configured
- [ ] Domain registrar access for `wrensvillage.com` and all alternate domains
- [ ] Square Dashboard access (for creating Payment Links)
- [ ] GitHub account (or other git host for the repository)

---
