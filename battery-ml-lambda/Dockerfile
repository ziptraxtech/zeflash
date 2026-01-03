FROM public.ecr.aws/lambda/python:3.11-arm64

# Install build tools for native deps if needed
RUN yum update -y && \
    yum groupinstall -y "Development Tools" && \
    yum install -y mesa-libGL && \
    yum clean all

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy Lambda code and models
COPY lambda_function.py ${LAMBDA_TASK_ROOT}
COPY models/ ${LAMBDA_TASK_ROOT}/models/

# Lambda handler
CMD ["lambda_function.lambda_handler"]
