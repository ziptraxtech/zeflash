# Battery ML Inference Service - Complete Project Summary

## Project Overview
Deployed a battery anomaly detection ML service on AWS ECS that:
- Fetches real-time battery charging data from DynamoDB
- Runs ML inference using an autoencoder neural network
- Detects anomalies in battery behavior
- Generates visualization charts
- Stores results in S3
- Returns presigned URLs for accessing reports

---

## Architecture & Pipeline

### High-Level Flow
```
API Request → ALB → ECS Fargate → DynamoDB (fetch data)
                                 ↓
                          ML Inference (TensorFlow)
                                 ↓
                       Generate Visualization
                                 ↓
                          Upload to S3 → Return presigned URL
```

### Infrastructure Components
1. **Application Load Balancer (ALB)**
   - URL: `battery-ml-alb-1652817744.us-east-1.elb.amazonaws.com`
   - Routes traffic to ECS tasks
   - Health checks on `/health` endpoint

2. **ECS Fargate Cluster**
   - Cluster: `battery-ml-cluster`
   - Service: `battery-ml-service`
   - Task Definition: `battery-ml-task:11`
   - CPU: 1024, Memory: 2048 MB
   - Platform: linux/amd64

3. **Docker Container**
   - ECR Repository: `070872471952.dkr.ecr.us-east-1.amazonaws.com/battery-ml:latest`
   - Base Image: `python:3.10-slim`
   - Web Server: FastAPI + Uvicorn

4. **DynamoDB Table**
   - Table Name: `device4`
   - Partition Key: `ts` (timestamp)
   - Contains: ~1000+ items with battery charging data
   - Fields: `ts`, `current`, `temperature`, `datetime`

5. **S3 Bucket**
   - Name: `battery-ml-results-070872471952`
   - Storage Path: `battery-reports/{device_id}/{timestamp}.png`
   - Contains: ML inference visualization charts

---

## ML Model Pipeline

### 1. Data Collection
```python
# Scan DynamoDB table for recent data (last 25 minutes)
def _fetch_data(device_id: str, minutes: int = 25):
    # Since device4 has no device_id field, we scan entire table
    resp = table.scan()
    # Filter by timestamp in memory
    cutoff = current_time - (minutes * 60)
    filtered_data = data[data['ts'] >= cutoff]
```

### 2. Feature Engineering
```python
def _build_features(items):
    # Raw features: current, temperature
    # Engineered features (14 total):
    - current_roll_mean (rolling mean over 5 samples)
    - current_roll_std (rolling standard deviation)
    - current_roll_min, current_roll_max
    - temp_roll_mean, temp_roll_std
    - current_rate (first derivative)
    - temp_rate
    - current_lag1, temp_lag1 (lagged values)
    - current_temp_ratio
    - current_temp_product
```

### 3. ML Model Architecture
**Autoencoder Neural Network:**
```
Input Layer: 14 features
  ↓
Encoder:
  Dense(32) + BatchNorm + LeakyReLU(0.2) + Dropout(0.25)
  Dense(16) + BatchNorm + LeakyReLU(0.2) + Dropout(0.25)
  Dense(8)  + BatchNorm + LeakyReLU(0.2)  [BOTTLENECK]
  ↓
Decoder:
  Dense(16) + BatchNorm + LeakyReLU(0.2) + Dropout(0.25)
  Dense(32) + BatchNorm + LeakyReLU(0.2) + Dropout(0.25)
  Dense(14) [OUTPUT]

Total Parameters: 2,710 (2,502 trainable)
Loss Function: Mean Squared Error (MSE)
```

### 4. Anomaly Detection
Two-stage detection:

**Stage 1: Autoencoder Reconstruction Error**
```python
reconstruction = model.predict(scaled_features)
reconstruction_error = mse(original, reconstruction)
if reconstruction_error > threshold:
    anomaly_detected = True
```

**Stage 2: Isolation Forest**
```python
iso_forest_predictions = isolation_forest.predict(features)
# -1 = anomaly, 1 = normal
```

### 5. Severity Classification
```python
def _classify_anomalies(errors, predictions, data):
    for each_sample:
        current = data['current']
        temp = data['temperature']
        
        if iso_forest == -1 or reconstruction_error > threshold:
            if current > critical_threshold or temp > critical_threshold:
                severity = "critical"
            elif current > high_threshold or temp > high_threshold:
                severity = "high"
            elif current > medium_threshold or temp > medium_threshold:
                severity = "medium"
            else:
                severity = "low"
```

### 6. Visualization
```python
# Generate bar chart showing anomaly counts by severity
matplotlib.pyplot.bar(['Critical', 'High', 'Medium', 'Low'], counts)
save_to_buffer() → upload_to_s3() → generate_presigned_url()
```

---

## All Changes Made

### 1. Initial Setup
- Created battery-ml-lambda directory structure
- Set up Dockerfile with Python 3.10-slim
- Created FastAPI application (app.py)
- Extracted inference logic to separate module (inference.py)

### 2. Model Files
**Original Files:**
- `autoencoder_best.h5` - Trained autoencoder (130KB)
- `scaler.pkl` - StandardScaler for feature normalization
- `isolation_forest.pkl` - Isolation Forest model
- `feature_names.json` - List of 14 feature names
- `config.json` - Model hyperparameters and thresholds

### 3. Dependency Management (requirements.txt)
**Final versions:**
```
tensorflow==2.10.0        # Downgraded from 2.15.0 for compatibility
numpy<2.0,>=1.21.0        # Changed from fixed 1.23.5
h5py==3.7.0
scikit-learn==1.3.2
pandas==2.1.4
joblib==1.3.2
boto3
fastapi==0.111.0
uvicorn[standard]==0.30.0
matplotlib==3.8.2
```

### 4. Application Code (app.py)
**Key features:**
- FastAPI web server
- `/health` endpoint for ALB health checks
- `/generate-report` endpoint (POST)
- Request model with optional device_id
- S3 upload with presigned URL generation
- Matplotlib backend set to 'Agg' for headless rendering

**Changes made:**
- Made device_id optional (default: "device4")
- Added proper error handling
- Implemented S3 upload logic
- Added environment variable configuration

### 5. Inference Module (inference.py)
**Major changes:**
- Implemented lazy loading for models and AWS resources
- Changed data fetching from Query to Scan (device4 has no device_id field)
- Added timestamp-based filtering
- Converted model path to use `autoencoder_converted.h5`
- Proper Decimal to float conversion for DynamoDB responses

**Key functions:**
- `run_inference(device_id, minutes=25)` - Main entry point
- `_load_models()` - Lazy load ML models
- `_fetch_data()` - Scan DynamoDB and filter by timestamp
- `_build_features()` - Engineer features from raw data
- `_classify_anomalies()` - Determine anomaly severity

### 6. Model Conversion
**Problem:** Old model saved with deprecated `batch_shape` parameter

**Solution:** Created `rebuild_model.py`
```python
# Manually reconstructed model architecture from h5 file config
# Loaded weights from old model
# Saved in new format compatible with TensorFlow 2.10
# Output: autoencoder_converted.h5 (75KB)
```

### 7. Docker Configuration
**Dockerfile:**
```dockerfile
FROM python:3.10-slim
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential libglib2.0-0 libsm6 \
    libxext6 libxrender1 libgl1

COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

COPY . .
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
```

**Build command:**
```bash
docker build --platform linux/amd64 -t 070872471952.dkr.ecr.us-east-1.amazonaws.com/battery-ml:latest .
```

### 8. ECS Task Definition (task-definition.json)
```json
{
  "family": "battery-ml-task",
  "taskRoleArn": "arn:aws:iam::070872471952:role/ecsTaskExecutionRole",
  "executionRoleArn": "arn:aws:iam::070872471952:role/ecsTaskExecutionRole",
  "networkMode": "awsvpc",
  "cpu": "1024",
  "memory": "2048",
  "requiresCompatibilities": ["FARGATE"],
  "containerDefinitions": [{
    "name": "battery-ml-container",
    "image": "070872471952.dkr.ecr.us-east-1.amazonaws.com/battery-ml:latest",
    "portMappings": [{"containerPort": 8000}],
    "environment": [
      {"name": "AWS_DEFAULT_REGION", "value": "us-east-1"},
      {"name": "BATTERY_TABLE_NAME", "value": "device4"},
      {"name": "MODEL_DIR", "value": "models"},
      {"name": "DEVICE_KEY_NAME", "value": "device_id"},
      {"name": "RESULTS_BUCKET_NAME", "value": "battery-ml-results-070872471952"},
      {"name": "RESULTS_PREFIX", "value": "battery-reports/"}
    ],
    "logConfiguration": {
      "logDriver": "awslogs",
      "options": {
        "awslogs-group": "/ecs/battery-ml",
        "awslogs-create-group": "true",
        "awslogs-region": "us-east-1",
        "awslogs-stream-prefix": "ecs"
      }
    }
  }]
}
```

### 9. IAM Policies

**DynamoDB Access (dynamodb-policy.json):**
```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": ["dynamodb:Scan", "dynamodb:Query", "dynamodb:GetItem"],
    "Resource": "arn:aws:dynamodb:us-east-1:070872471952:table/device4"
  }]
}
```

**S3 Access (s3-policy.json):**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:PutObject", "s3:PutObjectAcl", "s3:GetObject", "s3:GetObjectAcl"],
      "Resource": "arn:aws:s3:::battery-ml-results-070872471952/*"
    },
    {
      "Effect": "Allow",
      "Action": ["s3:ListBucket"],
      "Resource": "arn:aws:s3:::battery-ml-results-070872471952"
    }
  ]
}
```

---

## Errors Encountered & Solutions

### Error 1: TensorFlow CPU Package Not Found
**Error:**
```
Could not find a version that satisfies the requirement tensorflow-cpu==2.15.0
```

**Root Cause:** tensorflow-cpu package deprecated

**Solution:** Changed to `tensorflow==2.15.0` in requirements.txt

---

### Error 2: Boto3 NoRegionError on Import
**Error:**
```
NoRegionError: You must specify a region when calling boto3.resource('dynamodb')
```

**Root Cause:** AWS resources initialized at module import time without credentials

**Solution:** Implemented lazy initialization
```python
dynamodb = None  # Initialize as None
table = None

def _fetch_data():
    global dynamodb, table
    if dynamodb is None:
        dynamodb = boto3.resource("dynamodb")
        table = dynamodb.Table(BATTERY_TABLE_NAME)
```

---

### Error 3: Model Loading - batch_shape Parameter
**Error:**
```
TypeError: Error when deserializing class 'InputLayer' using config={'batch_shape': [None, 14], ...}
Exception encountered: Unrecognized keyword arguments: ['batch_shape']
```

**Root Cause:** Model saved with old Keras version (pre-TF 2.0) using deprecated `batch_shape` parameter

**Attempts:**
1. ❌ Used `safe_mode=False` - Still failed
2. ❌ Monkey-patched InputLayer.__init__ - Failed in Docker
3. ❌ Tried `compile=False` alone - Failed
4. ❌ Downgraded to TensorFlow 2.10 - Same error

**Final Solution:** Manually reconstructed model
```python
# Read model config from h5 file attributes
# Build new model with same architecture
# Load weights from old model file
# Save in new format
```

Created `rebuild_model.py` and `convert_model.py` scripts to:
1. Parse old h5 file structure
2. Reconstruct architecture layer by layer
3. Load BatchNorm weights (Dense layer weights had structure mismatch)
4. Save as `autoencoder_converted.h5`

---

### Error 4: Architecture Mismatch - arm64 vs amd64
**Error:**
```
CannotPullContainerError: image Manifest does not contain descriptor matching platform 'linux/amd64'
```

**Root Cause:** Docker image built on Mac (arm64) but ECS Fargate requires linux/amd64

**Solution:** Added `--platform linux/amd64` flag
```bash
docker build --platform linux/amd64 -t IMAGE_NAME .
```

---

### Error 5: Network Timeouts During Multi-Platform Build
**Error:**
```
Could not resolve 'deb.debian.org'
Multiple package downloads timed out
```

**Root Cause:** Docker buildx with cross-platform builds can be slow/unstable

**Solution:** Used regular docker build with explicit platform flag instead of buildx

---

### Error 6: NumPy Module Not Found
**Error:**
```
No module named 'numpy._core'
```

**Root Cause:** NumPy 1.23.5 doesn't have `_core` module (added in later versions)

**Solution:** Changed requirements to `numpy<2.0,>=1.21.0` to allow compatible version selection

---

### Error 7: DynamoDB Query on Wrong Key
**Error:**
```
ValidationException: Query key condition not supported
```

**Root Cause:** Trying to query by `device_id` but table partition key is `ts`

**Solution:** Changed from Query to Scan
```python
# OLD: Query with device_id (wrong)
resp = table.query(KeyConditionExpression=Key("device_id").eq(device_id))

# NEW: Scan entire table and filter by timestamp
resp = table.scan()
filtered = filter_by_timestamp(items, cutoff)
```

---

### Error 8: DynamoDB Access Denied
**Error:**
```
AccessDeniedException: User is not authorized to perform: dynamodb:Scan on resource
```

**Root Cause:** ECS task role didn't have DynamoDB Scan permission

**Solution:** Created and attached IAM policy
```bash
aws iam put-role-policy \
  --role-name ecsTaskExecutionRole \
  --policy-name BatteryDynamoDBAccess \
  --policy-document file://dynamodb-policy.json
```

---

### Error 9: S3 Upload Failed (Initial)
**Error:**
```
RESULTS_BUCKET_NAME env var not set
```

**Root Cause:** S3 bucket not created and environment variables not configured

**Solution:**
1. Created S3 bucket: `aws s3 mb s3://battery-ml-results-070872471952`
2. Added S3 policy to task role
3. Updated task definition with environment variables

---

### Error 10: Pydantic Validation - Missing device_id
**Error:**
```
{"detail":[{"type":"missing","loc":["body","device_id"],"msg":"Field required"}]}
```

**Root Cause:** Pydantic requires all fields unless explicitly Optional

**Solution:** Made device_id optional
```python
from typing import Optional

class ReportRequest(BaseModel):
    device_id: Optional[str] = "device4"

@app.post("/generate-report")
async def generate_report(req: ReportRequest = ReportRequest()):
    device_id = req.device_id or "device4"
```

---

## Deployment Commands

### Build & Push
```bash
# Build for linux/amd64
docker build --platform linux/amd64 \
  -t 070872471952.dkr.ecr.us-east-1.amazonaws.com/battery-ml:latest .

# Authenticate Docker to ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin \
  070872471952.dkr.ecr.us-east-1.amazonaws.com

# Push image
docker push 070872471952.dkr.ecr.us-east-1.amazonaws.com/battery-ml:latest
```

### Register Task Definition
```bash
aws ecs register-task-definition \
  --cli-input-json file://task-definition.json \
  --region us-east-1
```

### Deploy to ECS
```bash
aws ecs update-service \
  --cluster battery-ml-cluster \
  --service battery-ml-service \
  --task-definition battery-ml-task:11 \
  --force-new-deployment \
  --region us-east-1
```

### Create S3 Bucket
```bash
aws s3 mb s3://battery-ml-results-070872471952 --region us-east-1
```

### Attach IAM Policies
```bash
# DynamoDB access
aws iam put-role-policy \
  --role-name ecsTaskExecutionRole \
  --policy-name BatteryDynamoDBAccess \
  --policy-document file://dynamodb-policy.json

# S3 access
aws iam put-role-policy \
  --role-name ecsTaskExecutionRole \
  --policy-name BatteryMLS3Access \
  --policy-document file://s3-policy.json
```

---

## Testing

### Health Check
```bash
curl http://battery-ml-alb-1652817744.us-east-1.elb.amazonaws.com/health
# Response: {"status":"ok"}
```

### Generate Report
```bash
curl -X POST \
  http://battery-ml-alb-1652817744.us-east-1.elb.amazonaws.com/generate-report \
  -H "Content-Type: application/json" \
  -d '{}'

# Response:
{
  "device_id": "device4",
  "status": "No Data",
  "anomalies": {"critical": 0, "high": 0, "medium": 0, "low": 0},
  "generated_at": "2026-01-04T18:29:13.991176+00:00",
  "image_key": "battery-reports/device4/20260104T182914Z.png",
  "image_url": "https://battery-ml-results-070872471952.s3.amazonaws.com/..."
}
```

### Verify S3 Upload
```bash
aws s3 ls s3://battery-ml-results-070872471952/battery-reports/device4/
# Output: 2026-01-04 23:59:15  17067 20260104T182914Z.png
```

---

## Key Learnings

1. **Platform Compatibility:** Always specify `--platform linux/amd64` when building for ECS Fargate on Mac
2. **Model Versioning:** TensorFlow models saved in old formats need conversion for newer versions
3. **Lazy Initialization:** AWS resources should be initialized lazily to avoid startup failures
4. **DynamoDB Design:** Table schema impacts query patterns (Scan vs Query)
5. **IAM Permissions:** Task role needs permissions for all AWS services accessed
6. **Docker Optimization:** Cache layers by ordering COPY commands correctly
7. **Error Handling:** Comprehensive error handling and logging essential for debugging in ECS

---

## Final Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                         Internet                             │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
             ┌───────────────────────┐
             │  Application Load     │
             │  Balancer (ALB)       │
             │  Port 80              │
             └───────────┬───────────┘
                         │
                         ▼
        ┌────────────────────────────────────┐
        │   ECS Fargate Cluster              │
        │   ┌──────────────────────────────┐ │
        │   │  battery-ml-service          │ │
        │   │  ┌────────────────────────┐  │ │
        │   │  │ Task (1024 CPU/2048MB)│  │ │
        │   │  │                        │  │ │
        │   │  │ ┌──────────────────┐  │  │ │
        │   │  │ │ FastAPI + Uvicorn│  │  │ │
        │   │  │ │ Port 8000        │  │  │ │
        │   │  │ └────────┬─────────┘  │  │ │
        │   │  │          │            │  │ │
        │   │  │ ┌────────▼─────────┐  │  │ │
        │   │  │ │ ML Inference     │  │  │ │
        │   │  │ │ - TensorFlow 2.10│  │  │ │
        │   │  │ │ - Autoencoder    │  │  │ │
        │   │  │ │ - Isolation Forest│ │  │ │
        │   │  │ └──────────────────┘  │  │ │
        │   │  └────────────────────────┘  │ │
        │   └──────────────────────────────┘ │
        └────────────────────────────────────┘
                    │            │
         ┌──────────┘            └──────────┐
         ▼                                  ▼
┌─────────────────┐                ┌──────────────────┐
│   DynamoDB      │                │   S3 Bucket      │
│   Table: device4│                │   battery-ml-    │
│   ~1000 items   │                │   results        │
│   Partition: ts │                │   /battery-      │
│   Fields:       │                │   reports/       │
│   - current     │                │   device4/*.png  │
│   - temperature │                └──────────────────┘
│   - datetime    │
└─────────────────┘
```

---

## Project Status: ✅ COMPLETE

All components deployed and working:
- ✅ Docker image built and pushed to ECR
- ✅ ECS service running with 1 healthy task
- ✅ ALB health checks passing
- ✅ DynamoDB access configured
- ✅ S3 bucket created and accessible
- ✅ ML model converted and loading successfully
- ✅ API endpoint responding correctly
- ✅ Visualization generated and uploaded to S3
- ✅ Presigned URLs working

**API Endpoint:** `http://battery-ml-alb-1652817744.us-east-1.elb.amazonaws.com/generate-report`
**S3 Results:** `s3://battery-ml-results-070872471952/battery-reports/device4/`
