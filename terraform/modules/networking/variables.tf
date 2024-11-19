variable "vpc_cidr" {
  type = string
  default = "10.0.0.0/16"
}

variable "public_subnet_cidr_1" {
  type = string
  default = "10.0.1.0/24"
}

variable "public_subnet_cidr_2" {
  type = string
  default = "10.0.4.0/24"
}

variable "private_subnet_cidr_1" {
  type = string
  default = "10.0.2.0/24"
}

variable "private_subnet_cidr_2" {
  type = string
  default = "10.0.3.0/24"
}

variable "primary_az" {
  type = string
  default = "us-east-2a"
}

variable "secondary_az" {
  type = string
  default = "us-east-2b"
}
