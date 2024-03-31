#!/bin/bash
ECR_URI="662315753219.dkr.ecr.us-east-1.amazonaws.com"

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

# API image
IMAGE_NAME="billboard-express"
IMAGE_TAG="latest"

docker build --no-cache -t $ECR_URI/$IMAGE_NAME:$IMAGE_TAG api
docker push $ECR_URI/$IMAGE_NAME:$IMAGE_TAG

# Caddy image
IMAGE_NAME="billboard-web"
IMAGE_TAG="latest"

docker build --no-cache -t $ECR_URI/$IMAGE_NAME:$IMAGE_TAG client
docker push $ECR_URI/$IMAGE_NAME:$IMAGE_TAG