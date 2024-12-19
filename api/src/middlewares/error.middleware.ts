import { ErrorRequestHandler, Request, Response } from "express";
import { config } from "../config/env";
import { AppError, ErrorResponse } from "../types/errors";
import { DatabaseError } from "../utils/db";
import { AuthError } from "./auth.middleware";

export const errorHandler: ErrorRequestHandler = (
  error: Error,
  req: Request,
  res: Response<ErrorResponse>,
): void => {
  // Log error
  console.error("Error:", {
    name: error.name,
    message: error.message,
    stack: config.ENV === "development" ? error.stack : undefined,
    details: error instanceof AppError ? error.details : undefined,
  });

  // Handle specific error types
  if (error instanceof AppError || error instanceof AuthError) {
    res.status(error.statusCode).json({
      error: {
        message: error.message,
        code: error.statusCode.toString(),
        details: error.name,
      },
    });
    return;
  }

  // Handle database errors
  if (error instanceof DatabaseError) {
    // Map common Postgres error codes to appropriate responses
    switch (error.code) {
      case "23505": // unique_violation
        res.status(409).json({
          error: {
            message: "A resource with these details already exists",
            code: "UNIQUE_VIOLATION",
            details: error.detail,
          },
        });
        break;
      case "23503": // foreign_key_violation
        res.status(404).json({
          error: {
            message: "Referenced resource not found",
            code: "FOREIGN_KEY_VIOLATION",
            details: error.detail,
          },
        });
        break;
      case "42P01": // undefined_table
      case "42703": // undefined_column
        res.status(500).json({
          error: {
            message: "Database schema error",
            code: "SCHEMA_ERROR",
            details: config.ENV === "development" ? error.detail : undefined,
          },
        });
        break;
      default:
        res.status(500).json({
          error: {
            message: "An unexpected database error occurred",
            code: "DATABASE_ERROR",
            details: config.ENV === "development" ? error.detail : undefined,
          },
        });
    }
    return;
  }

  // Handle JWT errors
  if (error.name === "JsonWebTokenError") {
    res.status(401).json({
      error: {
        message: "Invalid authentication token",
        code: "INVALID_TOKEN",
      },
    });
    return;
  }

  if (error.name === "TokenExpiredError") {
    res.status(401).json({
      error: {
        message: "Authentication token has expired",
        code: "TOKEN_EXPIRED",
      },
    });
    return;
  }

  // Handle validation library errors (e.g., zod, joi, etc.)
  if (error.name === "ZodError" || error.name === "ValidationError") {
    res.status(400).json({
      error: {
        message: "Invalid request data",
        code: "VALIDATION_ERROR",
        details: error,
      },
    });
    return;
  }

  // Handle all other errors
  console.log(res);
  res.status(500).json({
    error: {
      message: "An unexpected error occurred",
      code: "INTERNAL_ERROR",
      details: config.ENV === "development" ? error.message : undefined,
    },
  });
};
