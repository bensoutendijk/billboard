#!/bin/bash
ECR_URI="662315753219.dkr.ecr.us-east-1.amazonaws.com"
ECS_CLUSTER_NAME="billboard"
ECS_TASK_NAME="BillboardTask"
ECS_SERVICE_NAME="BillboardService"

# Login to ECR using Docker
# echo "Logging into AWS ECR using Docker..."
docker run --rm -it -v "$(pwd)"/.aws:/root/.aws public.ecr.aws/aws-cli/aws-cli ecr get-login-password \
    | docker login --username AWS --password-stdin $ECR_URI \
    > /dev/null

# Check if login succeeded
if [ $? -ne 0 ]; then
    echo "ECR login failed. Exiting."
    exit 1
fi

# Check if the task definition exists in AWS
if [ -z "$(aws ecs describe-task-definition --task-definition $ECS_TASK_NAME)" ]; then
    echo "Task definition $ECS_TASK_NAME does not exist. Exiting."
    exit 1
fi

# Check if the service exists in AWS
if [ -z "$(aws ecs describe-services --cluster $ECS_CLUSTER_NAME --services $ECS_SERVICE_NAME)" ]; then
    echo "Service $ECS_SERVICE_NAME does not exist. Exiting."
    exit 1
fi

# Update the task definition
# echo "Updating task definition $ECS_TASK_NAME..."
aws ecs register-task-definition \
    --cli-input-json file://ops/task.json \
    > /dev/null

TASK_REVISION=$(aws ecs describe-task-definition --task-definition $ECS_TASK_NAME | jq -r '.taskDefinition.revision')

# Update the service to use the new task definition
# echo "Updating service $ECS_SERVICE_NAME..."
aws ecs update-service \
    --cluster $ECS_CLUSTER_NAME \
    --service $ECS_SERVICE_NAME \
    --task-definition $ECS_TASK_NAME:"$TASK_REVISION" \
    > /dev/null