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

module "database" {
  source = "./modules/database"
  
  vpc_id     = module.networking.vpc_id
  vpc_cidr   = "10.0.0.0/16"
  subnet_ids = [module.networking.private_subnet_1_id, module.networking.private_subnet_2_id]
  environment = terraform.workspace
  db_password = var.db_password
}
