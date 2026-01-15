# PowerShell script to configure S3 bucket policies
# Make sure AWS CLI is installed and configured with your credentials

$BUCKET_NAME = "battery-ml-results-070872471952"

Write-Host "Configuring S3 bucket: $BUCKET_NAME" -ForegroundColor Cyan

# 1. Configure CORS
Write-Host "`n1. Setting up CORS policy..." -ForegroundColor Yellow
$corsConfig = @'
{
  "CORSRules": [
    {
      "AllowedHeaders": ["*"],
      "AllowedMethods": ["GET", "HEAD", "PUT", "POST"],
      "AllowedOrigins": [
        "http://localhost:5173",
        "http://localhost:3000",
        "https://zeflash.com",
        "https://*.zeflash.com"
      ],
      "ExposeHeaders": ["ETag", "Content-Type"],
      "MaxAgeSeconds": 3600
    }
  ]
}
'@

$corsConfig | Out-File -FilePath "cors.json" -Encoding utf8
aws s3api put-bucket-cors --bucket $BUCKET_NAME --cors-configuration file://cors.json
Remove-Item "cors.json"
Write-Host "✓ CORS configuration applied" -ForegroundColor Green

# 2. Configure Bucket Policy for public read access
Write-Host "`n2. Setting up bucket policy for public read..." -ForegroundColor Yellow
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

$bucketPolicy | Out-File -FilePath "policy.json" -Encoding utf8
aws s3api put-bucket-policy --bucket $BUCKET_NAME --policy file://policy.json
Remove-Item "policy.json"
Write-Host "✓ Bucket policy applied" -ForegroundColor Green

# 3. Disable Block Public Access (if needed)
Write-Host "`n3. Checking Block Public Access settings..." -ForegroundColor Yellow
aws s3api put-public-access-block --bucket $BUCKET_NAME --public-access-block-configuration "BlockPublicAcls=false,IgnorePublicAcls=false,BlockPublicPolicy=false,RestrictPublicBuckets=false"
Write-Host "✓ Public access enabled" -ForegroundColor Green

Write-Host "`n✓ All S3 policies configured successfully!" -ForegroundColor Green
Write-Host "`nBucket URL: https://$BUCKET_NAME.s3.amazonaws.com/battery-reports/" -ForegroundColor Cyan
