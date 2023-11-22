#!/bin/bash

# Define your ECR URI and image tag
ECR_URI="662315753219.dkr.ecr.us-east-2.amazonaws.com"
IMAGE_NAME="soutendijk-billboard"
IMAGE_TAG="latest"

# Login to ECR using Docker
echo "Logging into AWS ECR using Docker..."
docker run --rm -it -v $(pwd)/.aws:/root/.aws public.ecr.aws/aws-cli/aws-cli ecr get-login-password | docker login --username AWS --password-stdin $ECR_URI

# Check if login succeeded
if [ $? -ne 0 ]; then
    echo "ECR login failed. Exiting."
    exit 1
fi

# Pull the Docker image
echo "Pulling the Docker image..."
docker pull $ECR_URI/$IMAGE_NAME:$IMAGE_TAG

# Check if image pull succeeded
if [ $? -ne 0 ]; then
    echo "Failed to pull the Docker image. Exiting."
    exit 1
fi

# Run the Docker container
echo "Running the Docker container..."
docker run -d \
    --env-file .env \
    -p 8000:8000 \
    -v /var/lib/mongodb:/data/db \
    $ECR_URI/$IMAGE_NAME:$IMAGE_TAG


# End of script
echo "Script completed successfully."
