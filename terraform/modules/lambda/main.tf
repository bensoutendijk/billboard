resource "aws_iam_role" "lambda_role" {
  name = "billboard_lambda_role_${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_basic" {
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
  role       = aws_iam_role.lambda_role.name
}

resource "aws_lambda_function" "auth_lambda" {
  filename         = data.archive_file.auth_lambda.output_path
  function_name    = "billboard_auth_${var.environment}"
  role            = aws_iam_role.lambda_role.arn
  handler         = "index.handler"
  runtime         = "nodejs18.x"
  
  environment {
    variables = {
      ENVIRONMENT = var.environment
      JWT_SECRET = var.jwt_secret
      POSTGRES_URI = var.postgres_uri
    }
  }
}

resource "aws_lambda_function" "health_lambda" {
  filename         = data.archive_file.health_lambda.output_path
  function_name    = "billboard_health_${var.environment}"
  role            = aws_iam_role.lambda_role.arn
  handler         = "index.handler"
  runtime         = "nodejs18.x"
  
  environment {
    variables = {
      ENVIRONMENT = var.environment
    }
  }
}

data "archive_file" "health_lambda" {
  type        = "zip"
  source_dir  = "${path.module}/functions/health"
  output_path = "${path.module}/files/health.zip"
}

data "archive_file" "auth_lambda" {
  type        = "zip"
  source_dir  = "${path.module}/functions/auth"
  output_path = "${path.module}/files/auth.zip"
}

resource "aws_apigatewayv2_api" "main" {
  name          = "billboard-api-${var.environment}"
  protocol_type = "HTTP"
}

resource "aws_apigatewayv2_stage" "main" {
  api_id = aws_apigatewayv2_api.main.id
  name   = var.api_version
  auto_deploy = true
}

resource "aws_apigatewayv2_integration" "health" {
  api_id           = aws_apigatewayv2_api.main.id
  integration_type = "AWS_PROXY"
  
  integration_uri    = aws_lambda_function.health_lambda.invoke_arn
  integration_method = "POST"
}

resource "aws_apigatewayv2_integration" "auth" {
  api_id           = aws_apigatewayv2_api.main.id
  integration_type = "AWS_PROXY"
  
  integration_uri    = aws_lambda_function.auth_lambda.invoke_arn
  integration_method = "POST"
}

resource "aws_apigatewayv2_route" "health" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "GET /health"
  target    = "integrations/${aws_apigatewayv2_integration.health.id}"
}

resource "aws_apigatewayv2_route" "auth_local" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "POST /auth/local"
  target    = "integrations/${aws_apigatewayv2_integration.auth.id}"
}

resource "aws_apigatewayv2_route" "auth_login" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "POST /auth/login"
  target    = "integrations/${aws_apigatewayv2_integration.auth.id}"
}

resource "aws_apigatewayv2_route" "auth_current" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "GET /auth/current"
  target    = "integrations/${aws_apigatewayv2_integration.auth.id}"
}

resource "aws_lambda_permission" "apigw_health" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.health_lambda.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.main.execution_arn}/*/*"
}

resource "aws_lambda_permission" "apigw_auth" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.auth_lambda.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.main.execution_arn}/*/*"
}
