variable "vpc_id" {
  type = string
}

variable "vpc_cidr" {
  type = string
}

variable "subnet_ids" {
  type = list(string)
}

variable "environment" {
  type = string
}

variable "db_username" {
  type = string
  default = "billboard_admin"
}

variable "db_password" {
  type = string
  sensitive = true
}
