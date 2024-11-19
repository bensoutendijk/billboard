terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.16"
    }
  }

  required_version = ">= 1.2.0"

  backend "s3" {
    bucket         = "billboard-terraform-state"
    key            = "terraform.tfstate"
    region         = "us-east-2"
    shared_credentials_file = "~/.aws/credentials"
  }
}

provider "aws" {
  region = "us-east-2"

  default_tags {
    tags = {
      Environment = terraform.workspace
      Project     = "billboard"
      ManagedBy   = "terraform"
    }
  }
}

module "networking" {
  source = "./modules/networking"
}

# module "database" {
#   source = "./modules/database"
  
#   vpc_id     = module.networking.vpc_id
#   vpc_cidr   = "10.0.0.0/16"
#   subnet_ids = [module.networking.private_subnet_1_id, module.networking.private_subnet_2_id]
#   environment = terraform.workspace
#   db_password = var.db_password
# }

module "lambda" {
  source = "./modules/lambda"
  
  environment = terraform.workspace
  vpc_id     = module.networking.vpc_id
  subnet_ids = [module.networking.private_subnet_1_id, module.networking.private_subnet_2_id]
}

resource "aws_apigatewayv2_api" "main" {
  name          = "billboard-api-${terraform.workspace}"
  protocol_type = "HTTP"
}

resource "aws_apigatewayv2_stage" "main" {
  api_id = aws_apigatewayv2_api.main.id
  name   = "v1"
  auto_deploy = true
}

resource "aws_apigatewayv2_integration" "auth" {
  api_id           = aws_apigatewayv2_api.main.id
  integration_type = "AWS_PROXY"
  
  integration_uri    = module.lambda.auth_lambda_invoke_arn
  integration_method = "POST"
}

resource "aws_apigatewayv2_route" "auth" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "ANY /api/auth/{proxy+}"
  target    = "integrations/${aws_apigatewayv2_integration.auth.id}"
}

resource "aws_lambda_permission" "apigw_auth" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = module.lambda.auth_lambda_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.main.execution_arn}/*/*"
}

resource "aws_apigatewayv2_integration" "health" {
  api_id           = aws_apigatewayv2_api.main.id
  integration_type = "AWS_PROXY"
  
  integration_uri    = module.lambda.health_lambda_invoke_arn
  integration_method = "POST"
}

resource "aws_apigatewayv2_route" "health" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "GET /health"
  target    = "integrations/${aws_apigatewayv2_integration.health.id}"
}

resource "aws_lambda_permission" "apigw_health" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = module.lambda.health_lambda_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.main.execution_arn}/*/*"
}
