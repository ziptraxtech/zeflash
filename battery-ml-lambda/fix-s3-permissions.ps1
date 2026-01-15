# Script to fix S3 bucket permissions for battery-ml-results

$BUCKET_NAME = "battery-ml-results-070872471952"

Write-Host "Configuring S3 bucket: $BUCKET_NAME" -ForegroundColor Cyan
Write-Host ""

# Step 1: Remove public access block
Write-Host "Step 1: Removing public access block..." -ForegroundColor Yellow
aws s3api delete-public-access-block --bucket $BUCKET_NAME 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Public access block removed" -ForegroundColor Green
} else {
    Write-Host "⚠ Warning: Could not remove public access block (may already be removed)" -ForegroundColor Yellow
}
Write-Host ""

# Step 2: Set bucket policy for public read
Write-Host "Step 2: Setting bucket policy for public read access..." -ForegroundColor Yellow
$bucketPolicy = @"
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::$BUCKET_NAME/battery-reports/*"
    }
  ]
}
"@

$bucketPolicy | Out-File -FilePath "bucket-policy.json" -Encoding utf8
aws s3api put-bucket-policy --bucket $BUCKET_NAME --policy file://bucket-policy.json 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Bucket policy applied" -ForegroundColor Green
} else {
    Write-Host "✗ Failed to apply bucket policy" -ForegroundColor Red
}
Write-Host ""

# Step 3: Set CORS configuration
Write-Host "Step 3: Setting CORS configuration..." -ForegroundColor Yellow
$corsConfig = @"
{
  "CORSRules": [
    {
      "AllowedOrigins": ["*"],
      "AllowedMethods": ["GET", "HEAD"],
      "AllowedHeaders": ["*"],
      "ExposeHeaders": ["ETag"],
      "MaxAgeSeconds": 3600
    }
  ]
}
"@

$corsConfig | Out-File -FilePath "cors-config.json" -Encoding utf8
aws s3api put-bucket-cors --bucket $BUCKET_NAME --cors-configuration file://cors-config.json 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ CORS configuration applied" -ForegroundColor Green
} else {
    Write-Host "✗ Failed to apply CORS configuration" -ForegroundColor Red
}
Write-Host ""

# Clean up temporary files
Remove-Item "bucket-policy.json" -ErrorAction SilentlyContinue
Remove-Item "cors-config.json" -ErrorAction SilentlyContinue

Write-Host "Configuration complete!" -ForegroundColor Cyan
Write-Host ""
Write-Host "Test URL: https://$BUCKET_NAME.s3.amazonaws.com/battery-reports/test.png" -ForegroundColor White
Write-Host ""
Write-Host "If you still get AccessDenied, make sure:" -ForegroundColor Yellow
Write-Host "1. AWS credentials have s3:PutBucketPolicy permission" -ForegroundColor White
Write-Host "2. Your organization allows public S3 buckets" -ForegroundColor White
Write-Host "3. Try setting permissions via AWS Console instead" -ForegroundColor White
