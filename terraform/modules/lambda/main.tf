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
    }
  }
}

data "archive_file" "auth_lambda" {
  type        = "zip"
  source_dir  = "${path.module}/functions/auth"
  output_path = "${path.module}/files/auth.zip"
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
