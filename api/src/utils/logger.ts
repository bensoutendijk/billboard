import pino from "pino";
import { config } from "../config/env";

// Define log levels type for better type safety
type LogLevel = "fatal" | "error" | "warn" | "info" | "debug" | "trace";

// Create base logger instance
export const logger = pino({
  level: config.ENV === "production" ? "info" : "debug",
  formatters: {
    level: (label: string) => ({ level: label }),
  },
  timestamp: () => `,"timestamp":"${new Date().toISOString()}"`,
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "body.password",
      "body.passwordConfirmation",
      "body.currentPassword",
      "body.newPassword",
    ],
    remove: true,
  },
});

// Request logging context
export interface RequestContext {
  requestId: string;
  method: string;
  url: string;
  ip: string | undefined;
  userId: string | undefined;
}

// Create a child logger with request context
export const createRequestLogger = (context: RequestContext) => {
  return logger.child(context);
};
