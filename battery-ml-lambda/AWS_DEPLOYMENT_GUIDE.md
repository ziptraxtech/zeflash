# AWS Deployment Guide for Battery ML Backend

## Overview
Deploy your FastAPI backend to AWS ECS Fargate for 24/7 availability.

## Prerequisites ✓
- [✓] AWS CLI installed (v2.32.31)
- [✓] Docker installed (v27.4.0)
- [✓] AWS credentials configured
- [✓] Dockerfile ready
- [✓] task-definition.json configured

## Cost Estimate
- **ECS Fargate**: ~$15-25/month (1 vCPU, 2GB RAM, running 24/7)
- **ECR Storage**: ~$1/month
- **Data Transfer**: Minimal for API calls
- **Total**: ~$20-30/month

## Deployment Methods

### **Option 1: Automated Script (Recommended)**

Run the deployment script:
```powershell
cd "d:\zeflash copy\Zipbolt\zeflash-new\battery-ml-lambda"
.\deploy-to-aws.ps1
```

This script will:
1. Verify AWS credentials
2. Create ECR repository
3. Build Docker image
4. Push to AWS
5. Register task definition
6. Update/create ECS service

### **Option 2: Manual Step-by-Step**

#### Step 1: Configure AWS
```powershell
aws configure
# Enter your credentials when prompted
```

#### Step 2: Create ECR Repository
```powershell
aws ecr create-repository --repository-name battery-ml --region us-east-1
```

#### Step 3: Login to ECR
```powershell
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 070872471952.dkr.ecr.us-east-1.amazonaws.com
```

#### Step 4: Build & Push Docker Image
```powershell
# Build
docker build -t battery-ml .

# Tag
docker tag battery-ml:latest 070872471952.dkr.ecr.us-east-1.amazonaws.com/battery-ml:latest

# Push
docker push 070872471952.dkr.ecr.us-east-1.amazonaws.com/battery-ml:latest
```

#### Step 5: Create ECS Cluster
```powershell
aws ecs create-cluster --cluster-name battery-ml-cluster --region us-east-1
```

#### Step 6: Register Task Definition
```powershell
aws ecs register-task-definition --cli-input-json file://task-definition.json --region us-east-1
```

#### Step 7: Create ECS Service (via AWS Console - EASIER)

1. Go to AWS Console: https://console.aws.amazon.com/ecs
2. Select `battery-ml-cluster`
3. Click "Create Service"
4. Configure:
   - **Launch type**: Fargate
   - **Task Definition**: battery-ml-task
   - **Service name**: battery-ml-service
   - **Number of tasks**: 1
   - **VPC**: Select your default VPC
   - **Subnets**: Select at least 2 subnets
   - **Security group**: Create new or use existing
     - **IMPORTANT**: Add inbound rule for port 8000 (TCP)
   - **Public IP**: ENABLED (required for internet access)
5. Click "Create"

## Step 8: Set Up Load Balancer (Get Public URL)

### Option A: Using AWS Console (Easier)

1. Go to EC2 > Load Balancers > Create Load Balancer
2. Choose **Application Load Balancer**
3. Configure:
   - **Name**: battery-ml-alb
   - **Scheme**: Internet-facing
   - **IP address type**: IPv4
   - **VPC**: Same as ECS service
   - **Subnets**: Select at least 2 (same AZs as ECS)
4. Security Groups:
   - Allow HTTP (port 80) or HTTPS (port 443) from anywhere
5. Target Group:
   - **Target type**: IP
   - **Protocol**: HTTP
   - **Port**: 8000
   - **Health check path**: /health
6. Register ECS service with ALB:
   - Go back to ECS service
   - Update service > Load balancing
   - Select the ALB and target group

### Option B: Using CLI
```powershell
# Get VPC ID
$VPC_ID = aws ec2 describe-vpcs --filters "Name=isDefault,Values=true" --query "Vpcs[0].VpcId" --output text

# Get Subnet IDs
$SUBNETS = aws ec2 describe-subnets --filters "Name=vpc-id,Values=$VPC_ID" --query "Subnets[0:2].SubnetId" --output text

# Create Security Group
aws ec2 create-security-group --group-name battery-ml-sg --description "Battery ML API" --vpc-id $VPC_ID
```

## Step 9: Update Frontend

Once deployed, you'll get a URL like:
```
http://battery-ml-alb-123456789.us-east-1.elb.amazonaws.com
```

Update your frontend environment variables:
```env
VITE_ML_API_URL=http://battery-ml-alb-123456789.us-east-1.elb.amazonaws.com
```

## Verify Deployment

1. **Check Service Status**:
   ```powershell
   aws ecs describe-services --cluster battery-ml-cluster --services battery-ml-service --region us-east-1
   ```

2. **Check Task is Running**:
   ```powershell
   aws ecs list-tasks --cluster battery-ml-cluster --region us-east-1
   ```

3. **View Logs**:
   - Go to CloudWatch > Log groups > /ecs/battery-ml
   - Or: https://console.aws.amazon.com/cloudwatch

4. **Test API**:
   ```powershell
   curl http://YOUR-ALB-URL/health
   ```

## Environment Variables

Your .env variables are already configured in task-definition.json:
- ✓ AWS_DEFAULT_REGION
- ✓ S3_BUCKET
- ✓ API endpoints

**IMPORTANT**: Secrets like AWS credentials should use **AWS Secrets Manager** in production:
1. Store credentials in Secrets Manager
2. Reference them in task-definition.json using `secrets` instead of `environment`

## Troubleshooting

### Service won't start
- Check CloudWatch logs for errors
- Verify security group allows port 8000
- Ensure subnets have internet access (NAT Gateway or public subnets with Public IP enabled)

### Can't access from frontend
- Check ALB security group allows HTTP/HTTPS
- Verify target group health checks are passing
- Ensure CORS is configured in server.py (already done)

### High costs
- Reduce CPU/Memory in task-definition.json
- Use SPOT instances (not recommended for production)
- Consider AWS Lambda if traffic is low

## Useful Commands

```powershell
# View running tasks
aws ecs list-tasks --cluster battery-ml-cluster

# Stop service
aws ecs update-service --cluster battery-ml-cluster --service battery-ml-service --desired-count 0

# Start service
aws ecs update-service --cluster battery-ml-cluster --service battery-ml-service --desired-count 1

# Delete service (must scale to 0 first)
aws ecs delete-service --cluster battery-ml-cluster --service battery-ml-service

# Delete cluster
aws ecs delete-cluster --cluster battery-ml-cluster

# View logs
aws logs tail /ecs/battery-ml --follow
```

## Monitoring

1. **CloudWatch Metrics**: ECS > Clusters > battery-ml-cluster > Metrics
2. **Alarms**: Set up alarms for CPU/Memory usage
3. **Cost Explorer**: Track your AWS spending

## Next Steps After Deployment

1. [ ] Set up custom domain (Route 53)
2. [ ] Enable HTTPS (ACM certificate + ALB HTTPS listener)
3. [ ] Set up CI/CD (GitHub Actions for auto-deploy)
4. [ ] Enable auto-scaling (scale based on CPU/memory)
5. [ ] Move credentials to AWS Secrets Manager
6. [ ] Set up monitoring alerts

## Alternative: AWS App Runner (Simpler)

If ECS is too complex, try AWS App Runner:
```powershell
aws apprunner create-service \
  --service-name battery-ml \
  --source-configuration "ImageRepository={ImageIdentifier=070872471952.dkr.ecr.us-east-1.amazonaws.com/battery-ml:latest,ImageRepositoryType=ECR}"
```

App Runner is simpler but costs slightly more (~$25-35/month).

---

**Ready to deploy?** Run the script:
```powershell
cd "d:\zeflash copy\Zipbolt\zeflash-new\battery-ml-lambda"
.\deploy-to-aws.ps1
```
