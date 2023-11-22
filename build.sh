#!/bin/bash

# Define your ECR URI and image tag
ECR_URI="662315753219.dkr.ecr.us-east-2.amazonaws.com"
IMAGE_NAME="soutendijk-billboard"
IMAGE_TAG="latest"

# Authenticate with AWS Container Registry
docker run --rm -it -v ./.aws:/root/.aws public.ecr.aws/aws-cli/aws-cli ecr get-login-password | docker login --username AWS --password-stdin 662315753219.dkr.ecr.us-east-2.amazonaws.com

# Build the Docker image
docker build --no-cache -t 662315753219.dkr.ecr.us-east-2.amazonaws.com/soutendijk-billboard:latest --file web.dockerfile .
