# Wren's Village — Migration Plan for AWS
## Static HTML on AWS S3

## Prerequisites
See @../CONTRIBUTING.md for prerequistes needed to build, test, and deploy this site

## 1. AWS Infrastructure via Terraform

### 1a. Repository Structure

The Terraform configuration lives alongside the website source in a single git repo. This keeps infrastructure and content versioned together and simplifies CI/CD later.

```
wrensvillage.com/
├── site/                        # Static website source (future: Jekyll source root)
│   ├── index.html
│   ├── our-impact.html
│   ├── give/
│   │   ├── index.html
│   │   └── wallet.html
│   ├── privacy.html
│   ├── 404.html
│   ├── assets/
│   │   └── images/
│   └── css/
│       └── custom.css
├── infra/                       # Terraform root module
│   ├── main.tf                  # Provider config, S3, CloudFront, ACM, Route 53
│   ├── variables.tf             # Parameterized inputs
│   ├── outputs.tf               # CloudFront domain, S3 bucket name, etc.
│   ├── terraform.tfvars         # Environment-specific values (gitignored)
│   └── backend.tf               # Remote state config (S3 + DynamoDB)
├── scripts/
│   └── deploy.sh                # S3 sync + CloudFront invalidation
├── .gitignore
└── README.md
```

When you migrate to **Jekyll**, the `site/` directory becomes the Jekyll project root (with `_config.yml`, `_layouts/`, `_includes/`, `_posts/`, etc.) and Jekyll builds to `_site/`. The deploy script changes one path: sync `_site/` instead of `site/`. The Terraform infrastructure doesn't change at all.

### 2b. Security Architecture & Multi-Domain Design

The following design follows AWS best practices for static site hosting with least-privilege access and supports multiple domain variants.

**S3 bucket is NOT configured as a public website endpoint.** Instead, CloudFront uses an Origin Access Control (OAC) to access the bucket via the S3 REST API. This means:

- The S3 bucket stays **fully private** — no public bucket policy, no public ACLs
- Only CloudFront can read from the bucket, enforced by a bucket policy scoped to the CloudFront distribution's OAC
- There is no publicly accessible S3 website URL to bypass HTTPS

**HTTPS is enforced at every layer:**

- CloudFront viewer protocol policy: `redirect-to-https` (HTTP requests are 301-redirected to HTTPS)
- CloudFront minimum TLS version: `TLSv1.2_2021` (enforces modern ciphers, disables TLS 1.0/1.1)
- ACM certificate provides the SSL/TLS cert (free, auto-renewing)
- Both the primary and redirect distributions enforce identical TLS policies

**Multi-domain architecture (two CloudFront distributions):**

```
┌─────────────────────────────────────────────────────────────┐
│  Primary Distribution                                       │
│  Domains: wrensvillage.com, www.wrensvillage.com            │
│  Behavior: Serve site content from S3 via OAC               │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  Redirect Distribution                                      │
│  Domains: wrensvillage.org, www.wrensvillage.org,           │
│           (+ any future alternate domains)                  │
│  Behavior: CloudFront Function returns 301 redirect         │
│            → https://www.wrensvillage.com (preserving path) │
│  Origin: dummy — never reached, function intercepts all     │
└─────────────────────────────────────────────────────────────┘
```

The redirect is handled entirely at the CloudFront edge via a CloudFront Function — no HTML, no JavaScript, no S3 involvement. The function preserves the request path and query string, so `https://wrensvillage.org/give/wallet` redirects to `https://www.wrensvillage.com/give/wallet`.

**Adding a new alternate domain** is a two-step change: (1) add it to the `alternate_domains` list in `terraform.tfvars`, (2) run `terraform apply`. Terraform handles the Route 53 zone, DNS records, and ACM certificate SANs automatically.

**Single ACM certificate** covers all domains (primary + alternates + all `www.` variants) using Subject Alternative Names. ACM supports up to 10 SANs by default, which is plenty for domain variants.

### 1c. Terraform Configuration

#### `infra/variables.tf`
```hcl
variable "primary_domain" {
  description = "Primary domain name — the canonical URL the site is served from"
  type        = string
  default     = "wrensvillage.com"
}

variable "alternate_domains" {
  description = "Alternate domain variants that 301-redirect to the primary domain"
  type        = list(string)
  default     = ["wrensvillage.org"]
}

variable "site_source_dir" {
  description = "Path to the static site build output directory"
  type        = string
  default     = "../site"
}

variable "aws_region" {
  description = "AWS region for S3 bucket"
  type        = string
  default     = "us-east-1"
}
```

#### `infra/terraform.tfvars`
```hcl
# To add a new alternate domain, add it to this list and run terraform apply.
primary_domain    = "wrensvillage.com"
alternate_domains = ["wrensvillage.org"]
```

#### `infra/main.tf`
```hcl
terraform {
  required_version = ">= 1.5"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# ACM must be in us-east-1 for CloudFront
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"
}

locals {
  s3_bucket_name = var.primary_domain
  fqdn_www       = "www.${var.primary_domain}"

  # Build the full list of alternate domain SANs (apex + www for each)
  alternate_domain_sans = flatten([
    for d in var.alternate_domains : [d, "www.${d}"]
  ])

  # All domains that should appear on the ACM certificate
  all_certificate_sans = concat([local.fqdn_www], local.alternate_domain_sans)

  # All aliases for the redirect distribution
  redirect_aliases = local.alternate_domain_sans
}

# ===========================================================================
# S3 — Private bucket, no public access
# ===========================================================================

resource "aws_s3_bucket" "site" {
  bucket = local.s3_bucket_name
}

resource "aws_s3_bucket_versioning" "site" {
  bucket = aws_s3_bucket.site.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "site" {
  bucket = aws_s3_bucket.site.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "site" {
  bucket                  = aws_s3_bucket.site.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Bucket policy: only the primary CloudFront distribution OAC can read objects
resource "aws_s3_bucket_policy" "site" {
  bucket = aws_s3_bucket.site.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "AllowCloudFrontOAC"
        Effect    = "Allow"
        Principal = { Service = "cloudfront.amazonaws.com" }
        Action    = "s3:GetObject"
        Resource  = "${aws_s3_bucket.site.arn}/*"
        Condition = {
          StringEquals = {
            "AWS:SourceArn" = aws_cloudfront_distribution.site.arn
          }
        }
      }
    ]
  })
}

# ===========================================================================
# ACM — Single TLS certificate covering all domains (must be us-east-1)
# ===========================================================================

resource "aws_acm_certificate" "site" {
  provider                  = aws.us_east_1
  domain_name               = var.primary_domain
  subject_alternative_names = local.all_certificate_sans
  validation_method         = "DNS"

  lifecycle {
    create_before_destroy = true
  }
}

# Collect all unique validation records across all domains.
# ACM often deduplicates validation records for domains in the same zone,
# so we key by record name to avoid duplicate Route 53 records.
locals {
  cert_validation_records = {
    for dvo in aws_acm_certificate.site.domain_validation_options :
    dvo.resource_record_name => {
      name   = dvo.resource_record_name
      type   = dvo.resource_record_type
      record = dvo.resource_record_value
      domain = dvo.domain_name
    }
  }
}

# Validation records for the primary domain zone
resource "aws_route53_record" "cert_validation_primary" {
  for_each = {
    for k, v in local.cert_validation_records : k => v
    if endswith(v.domain, var.primary_domain)
  }

  zone_id = aws_route53_zone.primary.zone_id
  name    = each.value.name
  type    = each.value.type
  ttl     = 300
  records = [each.value.record]
}

# Validation records for alternate domain zones
resource "aws_route53_record" "cert_validation_alternate" {
  for_each = {
    for k, v in local.cert_validation_records : k => v
    if !endswith(v.domain, var.primary_domain)
  }

  zone_id = aws_route53_zone.alternate[
    [for d in var.alternate_domains : d if endswith(each.value.domain, d)][0]
  ].zone_id
  name    = each.value.name
  type    = each.value.type
  ttl     = 300
  records = [each.value.record]
}

resource "aws_acm_certificate_validation" "site" {
  provider        = aws.us_east_1
  certificate_arn = aws_acm_certificate.site.arn
  validation_record_fqdns = concat(
    [for r in aws_route53_record.cert_validation_primary : r.fqdn],
    [for r in aws_route53_record.cert_validation_alternate : r.fqdn]
  )
}

# ===========================================================================
# CloudFront — Primary distribution (serves site content)
# ===========================================================================

# CloudFront Function: extensionless URL rewriting
# Rewrites /our-impact → /our-impact.html, /give → /give/index.html, etc.
# Passes through requests for static assets (/assets/*, /css/*, files with extensions)
# CloudFront Function: extensionless URL rewriting
# Rewrites /our-impact → /our-impact.html, /give/wallet → /give/wallet.html, etc.
# For directory-style paths like /give (where the file is give/index.html),
# the deploy script creates a give.html copy so this simple rule works universally.
# Also handles trailing-slash requests (/give/ → /give/index.html).
resource "aws_cloudfront_function" "url_rewrite" {
  name    = "url-rewrite-html-extension"
  runtime = "cloudfront-js-2.0"
  comment = "Rewrite extensionless page requests to .html for vanity URLs"
  publish = true
  code    = <<-EOF
    function handler(event) {
      var request = event.request;
      var uri = request.uri;

      // Root path — CloudFront default_root_object handles /
      if (uri === "/") {
        return request;
      }

      // Has a file extension — static asset, pass through
      if (uri.includes(".")) {
        return request;
      }

      // Trailing slash — serve directory index
      if (uri.endsWith("/")) {
        request.uri = uri + "index.html";
        return request;
      }

      // Extensionless path — append .html
      request.uri = uri + ".html";
      return request;
    }
  EOF
}

resource "aws_cloudfront_origin_access_control" "site" {
  name                              = "${var.primary_domain}-oac"
  description                       = "OAC for ${var.primary_domain} S3 bucket"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

resource "aws_cloudfront_distribution" "site" {
  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"
  aliases             = [var.primary_domain, local.fqdn_www]
  price_class         = "PriceClass_100"
  comment             = "${var.primary_domain} — primary site"

  origin {
    domain_name              = aws_s3_bucket.site.bucket_regional_domain_name
    origin_id                = "s3-${local.s3_bucket_name}"
    origin_access_control_id = aws_cloudfront_origin_access_control.site.id
  }

  # -----------------------------------------------------------------------
  # Cache behavior: HTML pages (default)
  # Short CDN TTL + ETag revalidation. Browsers cache briefly, then
  # revalidate with If-None-Match → 304 Not Modified when content hasn't
  # changed. CloudFront invalidation on deploy forces CDN-level refresh.
  # -----------------------------------------------------------------------
  default_cache_behavior {
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "s3-${local.s3_bucket_name}"
    viewer_protocol_policy = "redirect-to-https"
    compress               = true

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    # Extensionless URL rewriting: /our-impact → /our-impact.html
    function_association {
      event_type   = "viewer-request"
      function_arn = aws_cloudfront_function.url_rewrite.arn
    }

    min_ttl     = 0
    default_ttl = 300      # 5 minutes — CDN refreshes frequently
    max_ttl     = 300
  }

  # -----------------------------------------------------------------------
  # Cache behavior: static assets (/assets/*)
  # Long CDN + browser TTL. Cache busting is handled by content-hashed
  # filenames (e.g., style.a1b2c3.css), so these can be cached aggressively.
  # -----------------------------------------------------------------------
  ordered_cache_behavior {
    path_pattern           = "/assets/*"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "s3-${local.s3_bucket_name}"
    viewer_protocol_policy = "redirect-to-https"
    compress               = true

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    min_ttl     = 0
    default_ttl = 31536000  # 1 year
    max_ttl     = 31536000
  }

  # Cache behavior: CSS files (/css/*)
  ordered_cache_behavior {
    path_pattern           = "/css/*"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "s3-${local.s3_bucket_name}"
    viewer_protocol_policy = "redirect-to-https"
    compress               = true

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    min_ttl     = 0
    default_ttl = 31536000  # 1 year
    max_ttl     = 31536000
  }

  # S3 returns 403 for missing objects via OAC — map to 404
  custom_error_response {
    error_code            = 403
    response_code         = 404
    response_page_path    = "/404.html"
    error_caching_min_ttl = 60
  }

  custom_error_response {
    error_code            = 404
    response_code         = 404
    response_page_path    = "/404.html"
    error_caching_min_ttl = 60
  }

  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate_validation.site.certificate_arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }
}

# ===========================================================================
# CloudFront — Redirect distribution (alternate domains → primary)
# ===========================================================================

# CloudFront Function: 301 redirect preserving path and query string
resource "aws_cloudfront_function" "redirect" {
  name    = "redirect-to-primary-domain"
  runtime = "cloudfront-js-2.0"
  comment = "301 redirect alternate domains to https://www.${var.primary_domain}"
  publish = true
  code    = <<-EOF
    function handler(event) {
      var request = event.request;
      var host = "www.${var.primary_domain}";
      var path = request.uri;
      var qs = Object.keys(request.querystring).length > 0
        ? "?" + Object.keys(request.querystring).map(function(k) {
            var v = request.querystring[k];
            return v.multiValue
              ? v.multiValue.map(function(mv) { return k + "=" + mv.value; }).join("&")
              : k + "=" + v.value;
          }).join("&")
        : "";
      return {
        statusCode: 301,
        statusDescription: "Moved Permanently",
        headers: {
          location: { value: "https://" + host + path + qs },
          "cache-control": { value: "max-age=86400" }
        }
      };
    }
  EOF
}

# The redirect distribution needs an origin even though the CloudFront Function
# intercepts all requests before they reach it. We use the S3 bucket as a
# dummy origin — it will never receive traffic.
resource "aws_cloudfront_distribution" "redirect" {
  count = length(var.alternate_domains) > 0 ? 1 : 0

  enabled         = true
  is_ipv6_enabled = true
  aliases         = local.redirect_aliases
  price_class     = "PriceClass_100"
  comment         = "${var.primary_domain} — alternate domain redirects"

  origin {
    domain_name              = aws_s3_bucket.site.bucket_regional_domain_name
    origin_id                = "dummy-origin"
    origin_access_control_id = aws_cloudfront_origin_access_control.site.id
  }

  default_cache_behavior {
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "dummy-origin"
    viewer_protocol_policy = "redirect-to-https"
    compress               = false

    forwarded_values {
      query_string = true
      cookies {
        forward = "none"
      }
    }

    function_association {
      event_type   = "viewer-request"
      function_arn = aws_cloudfront_function.redirect.arn
    }

    min_ttl     = 0
    default_ttl = 86400
    max_ttl     = 86400
  }

  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate_validation.site.certificate_arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }
}

# ===========================================================================
# Route 53 — Primary domain zone
# ===========================================================================

resource "aws_route53_zone" "primary" {
  name = var.primary_domain
}

# Apex → primary CloudFront
resource "aws_route53_record" "primary_apex" {
  zone_id = aws_route53_zone.primary.zone_id
  name    = var.primary_domain
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.site.domain_name
    zone_id                = aws_cloudfront_distribution.site.hosted_zone_id
    evaluate_target_health = false
  }
}

# www → primary CloudFront
resource "aws_route53_record" "primary_www" {
  zone_id = aws_route53_zone.primary.zone_id
  name    = local.fqdn_www
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.site.domain_name
    zone_id                = aws_cloudfront_distribution.site.hosted_zone_id
    evaluate_target_health = false
  }
}

# ===========================================================================
# Route 53 — Alternate domain zones (one per alternate domain)
# ===========================================================================

resource "aws_route53_zone" "alternate" {
  for_each = toset(var.alternate_domains)
  name     = each.value
}

# Apex of each alternate domain → redirect CloudFront
resource "aws_route53_record" "alternate_apex" {
  for_each = toset(var.alternate_domains)

  zone_id = aws_route53_zone.alternate[each.key].zone_id
  name    = each.value
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.redirect[0].domain_name
    zone_id                = aws_cloudfront_distribution.redirect[0].hosted_zone_id
    evaluate_target_health = false
  }
}

# www of each alternate domain → redirect CloudFront
resource "aws_route53_record" "alternate_www" {
  for_each = toset(var.alternate_domains)

  zone_id = aws_route53_zone.alternate[each.key].zone_id
  name    = "www.${each.value}"
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.redirect[0].domain_name
    zone_id                = aws_cloudfront_distribution.redirect[0].hosted_zone_id
    evaluate_target_health = false
  }
}
```

#### `infra/outputs.tf`
```hcl
output "cloudfront_distribution_id" {
  description = "Primary CloudFront distribution ID (needed for cache invalidation)"
  value       = aws_cloudfront_distribution.site.id
}

output "cloudfront_domain_name" {
  description = "Primary CloudFront domain name for testing before DNS cutover"
  value       = aws_cloudfront_distribution.site.domain_name
}

output "redirect_distribution_id" {
  description = "Redirect CloudFront distribution ID"
  value       = length(var.alternate_domains) > 0 ? aws_cloudfront_distribution.redirect[0].id : null
}

output "s3_bucket_name" {
  description = "S3 bucket name for deployment"
  value       = aws_s3_bucket.site.id
}

output "primary_nameservers" {
  description = "Route 53 nameservers for the primary domain"
  value       = aws_route53_zone.primary.name_servers
}

output "alternate_nameservers" {
  description = "Route 53 nameservers for each alternate domain"
  value = {
    for d in var.alternate_domains : d => aws_route53_zone.alternate[d].name_servers
  }
}
```

#### `infra/backend.tf`
```hcl
terraform {
  backend "s3" {
    bucket  = "wrensvillage-terraform-state"
    key     = "website/terraform.tfstate"
    region  = "us-east-1"
    encrypt = true
  }
}
```

#### Terraform State Management

**State is stored in a dedicated S3 bucket, not in git.** Terraform state files should never be committed to a git repository for several reasons: state can inadvertently capture sensitive resource attributes, it changes on every `apply` (creating noisy diffs), and once committed, sensitive data lives in git history permanently.

**One-time setup — create the state bucket manually before `terraform init`:**

```bash
# Create the state bucket
aws s3api create-bucket \
  --bucket wrensvillage-terraform-state \
  --region us-east-1

# Enable versioning — this is your backup/rollback mechanism
aws s3api put-bucket-versioning \
  --bucket wrensvillage-terraform-state \
  --versioning-configuration Status=Enabled

# Enable server-side encryption by default
aws s3api put-bucket-encryption \
  --bucket wrensvillage-terraform-state \
  --server-side-encryption-configuration '{
    "Rules": [{"ApplyServerSideEncryptionByDefault": {"SSEAlgorithm": "AES256"}}]
  }'

# Block all public access
aws s3api put-public-access-block \
  --bucket wrensvillage-terraform-state \
  --public-access-block-configuration \
    BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true
```

**DynamoDB locking is omitted.** State locking prevents concurrent `terraform apply` runs from corrupting state. Since you're the sole operator, this is unnecessary overhead. If you add collaborators in the future, add a `dynamodb_table` parameter to the backend config.

**S3 versioning provides backup across devices.** Every `terraform apply` writes a new state version to S3. You can work from any device with AWS CLI credentials configured. To recover a previous state, use S3 version history:

```bash
# List state file versions
aws s3api list-object-versions \
  --bucket wrensvillage-terraform-state \
  --prefix website/terraform.tfstate

# Restore a previous version (by version ID)
aws s3api get-object \
  --bucket wrensvillage-terraform-state \
  --key website/terraform.tfstate \
  --version-id YOUR_VERSION_ID \
  restored-state.tfstate
```

**Keeping secrets out of state.** None of the resources in this plan store credential-type secrets in state — S3 buckets, CloudFront distributions, Route 53 records, and ACM certificates only produce ARNs, IDs, and configuration values. To keep it this way:

- Never create IAM access keys or credential resources via Terraform for this project
- Authenticate to AWS using your CLI credentials (`aws configure` or environment variables), not via Terraform-managed resources
- The `encrypt = true` backend setting ensures state is encrypted at rest in S3 via AES-256
- The state bucket's public access block prevents accidental exposure

**Add to `.gitignore`:**
```
# Terraform
infra/.terraform/
infra/*.tfstate
infra/*.tfstate.backup
infra/.terraform.lock.hcl
infra/terraform.tfvars
```

Note: `terraform.tfvars` is gitignored because it may contain environment-specific values. The defaults in `variables.tf` serve as documentation. If your tfvars contains no secrets (just domain names), you may choose to commit it — use your judgment.

### 9d. Deployment Script

`scripts/deploy.sh` syncs the site content to S3 with differentiated cache headers and invalidates only HTML pages in CloudFront. This works identically for hand-authored HTML now and Jekyll `_site/` output later.

```bash
#!/usr/bin/env bash
set -euo pipefail

# Source directory: override with SITE_DIR env var for Jekyll builds
SITE_DIR="${SITE_DIR:-../site}"

# Read Terraform outputs
cd "$(dirname "$0")/../infra"
BUCKET=$(terraform output -raw s3_bucket_name)
DIST_ID=$(terraform output -raw cloudfront_distribution_id)
cd - > /dev/null

# Create .html aliases for directory-style index.html pages.
# The CloudFront Function rewrites /give → /give.html, so we need
# a give.html object in S3 that serves the same content as give/index.html.
echo "Creating .html aliases for directory index pages..."
find "${SITE_DIR}" -name "index.html" -not -path "${SITE_DIR}/index.html" | while read -r f; do
  dir=$(dirname "$f")
  parent=$(dirname "$dir")
  base=$(basename "$dir")
  alias="${parent}/${base}.html"
  cp "$f" "$alias"
  echo "  ${f} → ${alias}"
done

# --- Sync static assets first (long cache, hashed filenames for busting) ---
echo "Syncing static assets → s3://${BUCKET}"
aws s3 sync "${SITE_DIR}/assets" "s3://${BUCKET}/assets" \
  --delete \
  --cache-control "public, max-age=31536000, immutable"

aws s3 sync "${SITE_DIR}/css" "s3://${BUCKET}/css" \
  --delete \
  --cache-control "public, max-age=31536000, immutable"

# --- Sync HTML, XML, and other root files (short cache, ETag revalidation) ---
echo "Syncing HTML content → s3://${BUCKET}"
aws s3 sync "${SITE_DIR}" "s3://${BUCKET}" \
  --delete \
  --cache-control "public, max-age=300, must-revalidate" \
  --exclude "assets/*" \
  --exclude "css/*" \
  --exclude ".git/*" \
  --exclude ".jekyll-cache/*" \
  --exclude "_config.yml"

# --- Invalidate only HTML pages in CloudFront ---
# Static assets use content-hashed filenames, so they don't need invalidation.
# HTML files have short TTLs (5 min) but we invalidate to ensure immediate
# propagation on deploy rather than waiting up to 5 minutes.
echo "Invalidating HTML content in CloudFront (${DIST_ID})"
aws cloudfront create-invalidation \
  --distribution-id "${DIST_ID}" \
  --paths "/" "/*.html" "/give/*" "/sitemap.xml" "/robots.txt" \
  --query 'Invalidation.Id' \
  --output text

echo "Deploy complete."
```

Usage:
```bash
# Deploy static HTML (current project)
./scripts/deploy.sh

# Deploy Jekyll build output (future project)
SITE_DIR=../site/_site ./scripts/deploy.sh
```

### 9e. Infrastructure Deployment Workflow

```bash
# First-time setup
cd infra
terraform init
terraform plan
terraform apply

# Note the primary_nameservers and alternate_nameservers outputs
# Verify each domain's registrar nameservers match the Route 53 zone outputs
# Wait for DNS propagation and ACM certificate validation

# Test via CloudFront URL before DNS cutover
curl -I https://$(terraform output -raw cloudfront_domain_name)

# Deploy site content
cd ../scripts
chmod +x deploy.sh
./deploy.sh
```

### 9f. Jekyll Compatibility

When you migrate to Jekyll, the infrastructure layer requires **zero changes**. The only difference is what gets synced to S3:

| Phase | Source dir | Deploy command |
|---|---|---|
| Now (static HTML) | `site/` | `./deploy.sh` |
| Future (Jekyll) | `site/_site/` | `SITE_DIR=../site/_site ./deploy.sh` |

Jekyll builds semantic HTML from Markdown. Pico CSS styles it. Terraform manages the hosting. The deploy script bridges them. Each layer is independent and replaceable.

### 9g. DNS Cutover Checklist

Since you already use Route 53, the cutover is straightforward. After `terraform apply` completes and the ACM certificate is validated:

**If Terraform is creating new Route 53 hosted zones** (i.e., the zones don't exist yet):
1. Note the `primary_nameservers` and `alternate_nameservers` outputs
2. At your domain registrar, verify each domain's nameservers match the Route 53 zone nameservers
3. Wait for propagation if any NS records changed (typically < 1 hour, up to 48 hours)

**If you have existing Route 53 hosted zones** you want Terraform to manage:
1. Import them into Terraform state before running `apply` to avoid creating duplicate zones:
   ```bash
   terraform import aws_route53_zone.primary Z0123456789ABCDEF
   terraform import 'aws_route53_zone.alternate["wrensvillage.org"]' Z9876543210FEDCBA
   ```
2. Run `terraform plan` to verify no destructive changes
3. Run `terraform apply`

**Verification for all domains:**
```bash
# Primary domain
curl -I https://wrensvillage.com          # Should serve site (200)
curl -I https://www.wrensvillage.com      # Should serve site (200)
curl -I http://wrensvillage.com           # Should 301 → https://

# Alternate domains — all should 301 redirect
curl -I https://wrensvillage.org          # Should 301 → https://www.wrensvillage.com
curl -I https://www.wrensvillage.org      # Should 301 → https://www.wrensvillage.com
curl -I http://wrensvillage.org           # Should 301 → https:// then 301 → primary
```

---

## 2. Caching Strategy

The caching design optimizes for two goals: fast page loads for returning visitors, and immediate content updates on deploy.

### How It Works

| Content type | CDN TTL | Browser behavior | Cache busting method |
|---|---|---|---|
| HTML pages (`.html`, `sitemap.xml`) | 5 minutes | Caches briefly, then revalidates via ETag (`If-None-Match` → 304) | CloudFront invalidation on deploy |
| Static assets (`/assets/*`, `/css/*`) | 1 year | Caches indefinitely | Content-hashed filenames (e.g., `style.a1b2c3.css`) |

### ETags (HTML Pages)

S3 automatically generates an `ETag` header on every object — it's the MD5 hash of the object content. CloudFront forwards this to browsers. The flow on a return visit:

1. Browser requests `/our-impact` (rewritten to `/our-impact.html`)
2. If the browser has a cached copy, it sends `If-None-Match: "abc123..."` (the ETag from the last response)
3. CloudFront (or S3 if CDN cache has expired) compares the ETag
4. If content hasn't changed: **304 Not Modified** — no body transferred, page loads instantly from browser cache
5. If content has changed: **200 OK** with the new content and a new ETag

The `Cache-Control: public, max-age=300, must-revalidate` header on HTML tells browsers to cache for up to 5 minutes before revalidating. After 5 minutes, the browser revalidates with an ETag conditional request rather than re-downloading. The `must-revalidate` directive ensures stale content is never served without checking.

On deploy, the deploy script invalidates HTML paths in CloudFront so the CDN fetches fresh content from S3 immediately — visitors don't wait the full 5 minutes for the CDN TTL to expire.

### Content-Hashed Filenames (Static Assets)

Static assets use `Cache-Control: public, max-age=31536000, immutable` — browsers and the CDN cache them for 1 year and never revalidate. The `immutable` directive tells browsers the content at this URL will never change.

Cache busting happens via the filename, not cache invalidation:

| Old filename | New filename (after edit) |
|---|---|
| `custom.css` | `custom.a1b2c3.css` |
| `hero.jpg` | `hero.d4e5f6.jpg` |

When the content changes, the filename changes, the HTML references the new filename, and browsers fetch it as a new resource. The old version remains cached harmlessly until it expires.

**Current phase (static HTML):** content-hashed filenames are a manual process — rename the file and update the `<link>` or `<img>` reference. For a small site with infrequent asset changes, this is manageable. Even without hashing, a full CloudFront invalidation (`/*`) will clear asset caches if needed.

**Future phase (Jekyll):** Jekyll's `jekyll-assets` plugin or a simple Liquid filter can automate content hashing at build time:

```liquid
<!-- In _layouts/default.html -->
<link rel="stylesheet" href="/css/custom.css?v={{ site.time | date: '%s' }}">
```

For a simple site, a build-timestamp query string (`?v=1709136000`) is sufficient and avoids the complexity of true content hashing. For more control, the `jekyll-assets` gem provides full fingerprinted filenames.

### Terraform Implementation

The CloudFront distribution uses separate cache behaviors (Section 9c):

- **Default behavior** (HTML): `default_ttl = 300` (5 min), `max_ttl = 300`
- **`/assets/*` behavior**: `default_ttl = 31536000` (1 year), `max_ttl = 31536000`
- **`/css/*` behavior**: `default_ttl = 31536000` (1 year), `max_ttl = 31536000`

S3 generates ETags automatically. CloudFront forwards them via the default origin response behavior — no additional configuration needed. The `forwarded_values` block doesn't need changes because ETags are origin response headers, not request headers.

### Deploy Script Implementation

The deploy script (Section 9d) syncs with per-directory `Cache-Control` headers:

```bash
# Assets: aggressive caching, immutable
aws s3 sync .../assets s3://bucket/assets --cache-control "public, max-age=31536000, immutable"

# HTML: short cache, ETag revalidation
aws s3 sync ... s3://bucket --cache-control "public, max-age=300, must-revalidate" --exclude "assets/*"
```

Invalidation is targeted to HTML paths only — assets don't need invalidation because their filenames change.

---

## 3. Estimated Monthly Costs

| Service | Est. Cost |
|---|---|
| S3 storage (< 100 MB) | ~$0.01 |
| S3 requests (low traffic non-profit) | ~$0.01 |
| CloudFront — primary distribution (low traffic) | ~$0.00 – $1.00 |
| CloudFront — redirect distribution (minimal) | ~$0.00 |
| Route 53 hosted zones ($0.50/zone × N zones) | ~$1.00 |
| ACM SSL certificate | Free |
| CloudFront Function invocations (redirect) | ~$0.00 |
| **Total** | **< $3/month** |

Compare this to a Square Online subscription at $12–$72/month.

---

## 4. Migration Checklist

### Phase 1: AWS Infrastructure (Terraform)
- [ ] Create Terraform state S3 bucket with versioning and encryption (manual one-time setup)
- [ ] Import existing Route 53 hosted zones into Terraform state (if applicable)
- [ ] Inventory all domain variants to include in `alternate_domains`
- [ ] Run `terraform init` and `terraform plan` — review the resource plan
- [ ] Run `terraform apply` — provisions S3, CloudFront (primary + redirect), ACM, Route 53
- [ ] Wait for ACM certificate DNS validation to complete
- [ ] Note the `primary_nameservers` and `alternate_nameservers` outputs
- [ ] Deploy site files with `./scripts/deploy.sh`
- [ ] Test via CloudFront domain URL before DNS cutover

### Phase 2: DNS Cutover & Go-Live
- [ ] Verify domain registrar nameservers match Route 53 outputs for all domains
- [ ] Wait for DNS propagation (up to 48 hours, usually < 1 hour)
- [ ] Verify `https://www.wrensvillage.com` serves the site correctly
- [ ] Verify `https://wrensvillage.com` serves the site correctly
- [ ] Verify HTTP → HTTPS redirect works on all domains
- [ ] Verify alternate domains 301-redirect to `https://www.wrensvillage.com`
- [ ] Verify alternate domains preserve path on redirect (e.g., `/give/wallet`)
- [ ] Test all pages and payment flows on the live domain
- [ ] Run axe DevTools or WAVE accessibility scan on every page — fix any errors
- [ ] Keyboard-only navigation test (Tab through every page, verify focus indicators)
- [ ] Screen reader spot-check (VoiceOver or NVDA on at least the home and donate pages)
- [ ] Verify color contrast meets WCAG AA (4.5:1 body text, 3:1 large text)
- [ ] Set up basic monitoring (CloudWatch or UptimeRobot free tier)

### Phase 3: Cleanup
- [ ] Commit all Terraform config and deploy script to git
- [ ] Document the setup in README.md for other volunteers
- [ ] Verify `terraform plan` shows no drift

---
