resource "aws_vpc" "main" {
  cidr_block = var.vpc_cidr

  tags = {
    Name = "main-vpc"
  }
}

resource "aws_subnet" "public_1" {
  vpc_id     = aws_vpc.main.id
  cidr_block = var.public_subnet_cidr_1
  availability_zone = var.primary_az

  tags = {
    Name = "public-subnet-1"
  }
}

resource "aws_subnet" "public_2" {
  vpc_id     = aws_vpc.main.id
  cidr_block = var.public_subnet_cidr_2
  availability_zone = var.secondary_az

  tags = {
    Name = "public-subnet-2"
  }
}

resource "aws_subnet" "private_1" {
  vpc_id     = aws_vpc.main.id
  cidr_block = var.private_subnet_cidr_1
  availability_zone = var.secondary_az

  tags = {
    Name = "private-subnet-1"
  }
}

resource "aws_subnet" "private_2" {
  vpc_id     = aws_vpc.main.id
  cidr_block = var.private_subnet_cidr_2
  availability_zone = var.primary_az

  tags = {
    Name = "private-subnet-2"
  }
}

resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "main-igw"
  }
}

resource "aws_route_table" "main" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = {
    Name = "main-route-table"
  }
}

resource "aws_route_table_association" "public_1" {
  subnet_id      = aws_subnet.public_1.id
  route_table_id = aws_route_table.main.id
}

resource "aws_route_table_association" "public_2" {
  subnet_id      = aws_subnet.public_2.id
  route_table_id = aws_route_table.main.id
}
