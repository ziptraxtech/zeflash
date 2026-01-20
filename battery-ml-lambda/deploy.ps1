# AWS ECS Deployment Script
$ErrorActionPreference = "Continue"

$AWS_REGION = "us-east-1"
$AWS_ACCOUNT_ID = "070872471952"
$ECR_REPOSITORY = "battery-ml"
$IMAGE_TAG = "latest"
$CLUSTER_NAME = "battery-ml-cluster"
$SERVICE_NAME = "battery-ml-service"
$TASK_FAMILY = "battery-ml-task"

$ECR_URI = "$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPOSITORY"
$FULL_IMAGE = "${ECR_URI}:${IMAGE_TAG}"

Write-Host "===============================================" -ForegroundColor Cyan
Write-Host "  AWS ECS Deployment - Battery ML Backend" -ForegroundColor Cyan
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Step 1: Checking AWS credentials..." -ForegroundColor Yellow
aws sts get-caller-identity
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: AWS credentials not configured" -ForegroundColor Red
    exit 1
}
Write-Host "Success: AWS credentials verified" -ForegroundColor Green
Write-Host ""

Write-Host "Step 2: Creating ECR repository..." -ForegroundColor Yellow
aws ecr describe-repositories --repository-names $ECR_REPOSITORY --region $AWS_REGION 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    aws ecr create-repository --repository-name $ECR_REPOSITORY --region $AWS_REGION
}
Write-Host "Success: ECR repository ready" -ForegroundColor Green
Write-Host ""

Write-Host "Step 3: Logging into ECR..." -ForegroundColor Yellow
$loginCommand = aws ecr get-login-password --region $AWS_REGION
$loginCommand | docker login --username AWS --password-stdin $ECR_URI
Write-Host "Success: Logged into ECR" -ForegroundColor Green
Write-Host ""

Write-Host "Step 4: Building Docker image..." -ForegroundColor Yellow
Write-Host "This may take several minutes..." -ForegroundColor Cyan
docker build -t $ECR_REPOSITORY .
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Docker build failed" -ForegroundColor Red
    exit 1
}
Write-Host "Success: Docker image built" -ForegroundColor Green
Write-Host ""

Write-Host "Step 5: Tagging Docker image..." -ForegroundColor Yellow
docker tag ${ECR_REPOSITORY}:latest $FULL_IMAGE
Write-Host "Success: Image tagged" -ForegroundColor Green
Write-Host ""

Write-Host "Step 6: Pushing to ECR (this may take a while)..." -ForegroundColor Yellow
docker push $FULL_IMAGE
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to push image" -ForegroundColor Red
    exit 1
}
Write-Host "Success: Image pushed to ECR" -ForegroundColor Green
Write-Host ""

Write-Host "Step 7: Creating ECS cluster..." -ForegroundColor Yellow
aws ecs describe-clusters --clusters $CLUSTER_NAME --region $AWS_REGION 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    aws ecs create-cluster --cluster-name $CLUSTER_NAME --region $AWS_REGION
}
Write-Host "Success: ECS cluster ready" -ForegroundColor Green
Write-Host ""

Write-Host "Step 8: Registering task definition..." -ForegroundColor Yellow
aws ecs register-task-definition --cli-input-json file://task-definition.json --region $AWS_REGION
Write-Host "Success: Task definition registered" -ForegroundColor Green
Write-Host ""

Write-Host "Step 9: Checking service status..." -ForegroundColor Yellow
$serviceStatus = aws ecs describe-services --cluster $CLUSTER_NAME --services $SERVICE_NAME --region $AWS_REGION --query "services[0].status" --output text 2>&1

if ($serviceStatus -eq "ACTIVE") {
    Write-Host "Updating existing service..." -ForegroundColor Cyan
    aws ecs update-service --cluster $CLUSTER_NAME --service $SERVICE_NAME --task-definition $TASK_FAMILY --force-new-deployment --region $AWS_REGION
    Write-Host "Success: Service updated" -ForegroundColor Green
}
else {
    Write-Host "Service does not exist yet" -ForegroundColor Yellow
    Write-Host "You need to create it via AWS Console or CLI" -ForegroundColor Cyan
}
Write-Host ""

Write-Host "===============================================" -ForegroundColor Cyan
Write-Host "  Deployment Complete!" -ForegroundColor Green
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Image URI: $FULL_IMAGE" -ForegroundColor White
Write-Host ""
Write-Host "Next: Create ECS service via AWS Console" -ForegroundColor Yellow
Write-Host "https://console.aws.amazon.com/ecs" -ForegroundColor Cyan
Write-Host ""
