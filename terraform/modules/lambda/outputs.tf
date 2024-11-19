output "auth_lambda_invoke_arn" {
  value = aws_lambda_function.auth_lambda.invoke_arn
}

output "auth_lambda_name" {
  value = aws_lambda_function.auth_lambda.function_name
}

output "health_lambda_invoke_arn" {
  value = aws_lambda_function.health_lambda.invoke_arn
}

output "health_lambda_name" {
  value = aws_lambda_function.health_lambda.function_name
}
