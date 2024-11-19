resource "aws_security_group" "rds" {
  name        = "billboard-database"
  description = "Security group for billboard RDS instance"
  vpc_id      = var.vpc_id

  ingress {
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
  }
}

resource "aws_db_subnet_group" "billboard" {
  name       = "billboard"
  subnet_ids = var.subnet_ids

  tags = {
    Name = "Billboard DB subnet group"
  }
}

resource "aws_db_instance" "billboard" {
  identifier           = "billboard-${var.environment}"
  allocated_storage    = 20
  storage_type         = "gp2"
  engine              = "postgres"
  engine_version      = "16.3"
  instance_class      = "db.t3.micro"
  db_name             = "billboard"
  username            = var.db_username
  password            = var.db_password
  skip_final_snapshot = true

  vpc_security_group_ids = [aws_security_group.rds.id]
  db_subnet_group_name   = aws_db_subnet_group.billboard.name

  tags = {
    Name = "billboard-database"
  }
}
