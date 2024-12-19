import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config/env";
import { JWTPayload } from "../types/auth";

export class AuthError extends Error {
  constructor(
    message: string,
    public statusCode: number = 401,
  ) {
    super(message);
    this.name = "AuthError";
  }
}

export const validateAuthToken = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      throw new AuthError("No authorization header");
    }

    const [bearer, token] = authHeader.split(" ");

    if (bearer !== "Bearer" || !token) {
      throw new AuthError("Invalid authorization header format");
    }

    const decoded = jwt.verify(token, config.JWT_SECRET) as JWTPayload;

    // Validate role
    if (decoded.role !== "app_user" && decoded.role !== "app_admin") {
      throw new AuthError("Invalid user role");
    }

    // Set user information on request
    req.user = {
      id: decoded.sub,
      email: decoded.email,
      role: decoded.role,
    };

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(new AuthError("Invalid token"));
    } else {
      next(error);
    }
  }
};

// Optional auth middleware that doesn't throw on missing token
export const optionalAuth = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return next();
    }

    const [bearer, token] = authHeader.split(" ");

    if (bearer !== "Bearer" || !token) {
      return next();
    }

    const decoded = jwt.verify(token, config.JWT_SECRET) as JWTPayload;

    if (decoded.role === "app_user" || decoded.role === "app_admin") {
      req.user = {
        id: decoded.sub,
        email: decoded.email,
        role: decoded.role,
      };
    }

    next();
  } catch (error) {
    // On any error, proceed without user context
    next();
  }
};

// Middleware to require admin role
export const requireAdmin = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  if (req.user?.role !== "app_admin") {
    throw new AuthError("Admin access required", 403);
  }
  next();
};

// Helper to create user context from authenticated request
export const getUserContext = (req: Request) => {
  if (!req.user) {
    throw new AuthError("User context required");
  }

  return {
    userId: req.user.id,
    role: req.user.role,
  };
};
