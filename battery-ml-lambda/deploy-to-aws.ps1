# AWS ECS Deployment Script for Battery ML Backend
# This script will deploy your FastAPI backend to AWS ECS Fargate

Write-Host "===============================================" -ForegroundColor Cyan
Write-Host "  AWS ECS Deployment - Battery ML Backend" -ForegroundColor Cyan
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host ""

# Configuration
$AWS_REGION = "us-east-1"
$AWS_ACCOUNT_ID = "070872471952"
$ECR_REPOSITORY = "battery-ml"
$IMAGE_TAG = "latest"
$CLUSTER_NAME = "battery-ml-cluster"
$SERVICE_NAME = "battery-ml-service"
$TASK_FAMILY = "battery-ml-task"

# Full image name
$ECR_URI = "$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPOSITORY"
$FULL_IMAGE = "${ECR_URI}:${IMAGE_TAG}"

Write-Host "Step 1: Checking AWS credentials..." -ForegroundColor Yellow
aws sts get-caller-identity
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: AWS credentials not configured. Run 'aws configure'" -ForegroundColor Red
    exit 1
}
Write-Host "✓ AWS credentials verified" -ForegroundColor Green
Write-Host ""

Write-Host "Step 2: Creating ECR repository (if not exists)..." -ForegroundColor Yellow
$ecrCheck = aws ecr describe-repositories --repository-names $ECR_REPOSITORY --region $AWS_REGION 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "Creating ECR repository..." -ForegroundColor Cyan
    aws ecr create-repository --repository-name $ECR_REPOSITORY --region $AWS_REGION
    Write-Host "✓ ECR repository created" -ForegroundColor Green
}
else {
    Write-Host "✓ ECR repository already exists" -ForegroundColor Green
}
Write-Host ""

Write-Host "Step 3: Logging into ECR..." -ForegroundColor Yellow
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $ECR_URI
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to login to ECR" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Logged into ECR" -ForegroundColor Green
Write-Host ""

Write-Host "Step 4: Building Docker image..." -ForegroundColor Yellow
docker build -t $ECR_REPOSITORY .
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Docker build failed" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Docker image built" -ForegroundColor Green
Write-Host ""

Write-Host "Step 5: Tagging Docker image..." -ForegroundColor Yellow
docker tag ${ECR_REPOSITORY}:latest $FULL_IMAGE
Write-Host "✓ Image tagged as $FULL_IMAGE" -ForegroundColor Green
Write-Host ""

Write-Host "Step 6: Pushing Docker image to ECR..." -ForegroundColor Yellow
Write-Host "This may take a few minutes depending on image size..." -ForegroundColor Cyan
docker push $FULL_IMAGE
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to push image to ECR" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Image pushed to ECR" -ForegroundColor Green
Write-Host ""

Write-Host "Step 7: Creating ECS cluster (if not exists)..." -ForegroundColor Yellow
$clusterCheck = aws ecs describe-clusters --clusters $CLUSTER_NAME --region $AWS_REGION --query "clusters[0].status" --output text 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "Creating ECS cluster..." -ForegroundColor Cyan
    aws ecs create-cluster --cluster-name $CLUSTER_NAME --region $AWS_REGION
    Write-Host "✓ ECS cluster created" -ForegroundColor Green
}
else {
    Write-Host "✓ ECS cluster already exists" -ForegroundColor Green
}
Write-Host ""

Write-Host "Step 8: Registering task definition..." -ForegroundColor Yellow
aws ecs register-task-definition --cli-input-json file://task-definition.json --region $AWS_REGION
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to register task definition" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Task definition registered" -ForegroundColor Green
Write-Host ""

Write-Host "Step 9: Checking if service exists..." -ForegroundColor Yellow
$serviceExists = aws ecs describe-services --cluster $CLUSTER_NAME --services $SERVICE_NAME --region $AWS_REGION --query "services[0].status" --output text 2>&1

if ($serviceExists -eq "ACTIVE") {
    Write-Host "Updating existing service..." -ForegroundColor Cyan
    aws ecs update-service `
        --cluster $CLUSTER_NAME `
        --service $SERVICE_NAME `
        --task-definition $TASK_FAMILY `
        --force-new-deployment `
        --region $AWS_REGION
    Write-Host "✓ Service updated" -ForegroundColor Green
}
else {
    Write-Host "Creating new service..." -ForegroundColor Cyan
    Write-Host ""
    Write-Host "IMPORTANT: You need to provide:" -ForegroundColor Yellow
    Write-Host "  1. VPC Subnet IDs (at least 2 in different AZs)" -ForegroundColor Yellow
    Write-Host "  2. Security Group ID (must allow port 8000)" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "To create the service, run this command manually:" -ForegroundColor Cyan
    Write-Host ""
    Write-Host 'aws ecs create-service \' -ForegroundColor White
    Write-Host "  --cluster $CLUSTER_NAME \" -ForegroundColor White
    Write-Host "  --service-name $SERVICE_NAME \" -ForegroundColor White
    Write-Host "  --task-definition $TASK_FAMILY \" -ForegroundColor White
    Write-Host '  --desired-count 1 \' -ForegroundColor White
    Write-Host '  --launch-type FARGATE \' -ForegroundColor White
    Write-Host '  --network-configuration \"awsvpcConfiguration={subnets=[YOUR-SUBNET-1,YOUR-SUBNET-2],securityGroups=[YOUR-SG],assignPublicIp=ENABLED}\" \' -ForegroundColor White
    Write-Host "  --region $AWS_REGION" -ForegroundColor White
    Write-Host ""
    Write-Host "Or create via AWS Console in ECS" -ForegroundColor Cyan
}
Write-Host ""

Write-Host "===============================================" -ForegroundColor Cyan
Write-Host "  Deployment Complete!" -ForegroundColor Green
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. If service does not exist, create it using the command above" -ForegroundColor White
Write-Host "2. Create Application Load Balancer (ALB) to get a public URL" -ForegroundColor White
Write-Host "3. Point your frontend to the ALB URL" -ForegroundColor White
Write-Host "4. Update VITE_ML_API_URL in your frontend deployment" -ForegroundColor White
Write-Host ""
Write-Host "Useful Commands:" -ForegroundColor Yellow
Write-Host "  View services: aws ecs list-services --cluster $CLUSTER_NAME --region $AWS_REGION" -ForegroundColor White
Write-Host "  View tasks: aws ecs list-tasks --cluster $CLUSTER_NAME --region $AWS_REGION" -ForegroundColor White
Write-Host "  View logs: Go to CloudWatch > Log groups > /ecs/battery-ml" -ForegroundColor White
Write-Host ""
