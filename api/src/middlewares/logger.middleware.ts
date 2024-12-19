import { NextFunction, Request, Response } from "express";
import onFinished from "on-finished";
import { v4 as uuidv4 } from "uuid";
import { createRequestLogger } from "../utils/logger";

// Sensitive headers that should be redacted
const SENSITIVE_HEADERS = new Set(["authorization", "cookie", "x-api-key"]);

// Headers we want to log
const HEADERS_TO_LOG = new Set([
  "user-agent",
  "accept",
  "content-type",
  "origin",
  "referer",
]);

const redactHeaders = (
  headers: Record<string, string | string[] | undefined>,
) => {
  const redactedHeaders: Record<string, string | string[] | undefined> = {};

  Object.entries(headers).forEach(([key, value]) => {
    const lowerKey = key.toLowerCase();
    if (HEADERS_TO_LOG.has(lowerKey)) {
      redactedHeaders[key] = value;
    } else if (SENSITIVE_HEADERS.has(lowerKey)) {
      redactedHeaders[key] = "[REDACTED]";
    }
  });

  return redactedHeaders;
};

export const requestLogger = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const requestId = uuidv4();
  const startTime = process.hrtime();

  // Create request context
  const requestContext = {
    requestId,
    method: req.method,
    url: req.url,
    ip: req.ip,
    userId: req.user?.id,
  };

  // Create request-specific logger
  const requestLogger = createRequestLogger(requestContext);

  // Log request
  requestLogger.info({
    type: "request",
    headers: redactHeaders(req.headers),
    query: req.query,
    body: req.body,
  });

  // Attach logger to request for use in handlers
  req.log = requestLogger;

  // Handle response
  onFinished(res, (err, res) => {
    const diffTime = process.hrtime(startTime);
    const responseTime = (diffTime[0] * 1e9 + diffTime[1]) / 1e6; // Convert to milliseconds

    const logData = {
      type: "response",
      statusCode: res.statusCode,
      responseTime,
    };

    if (err) {
      requestLogger.error({
        ...logData,
        error: {
          message: err.message,
          stack: err.stack,
        },
      });
    } else {
      requestLogger.info(logData);
    }
  });

  next();
};

// Error logging middleware
export const errorLogger = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const logger =
    req.log ||
    createRequestLogger({
      requestId: uuidv4(),
      method: req.method,
      url: req.url,
      ip: req.ip,
      userId: req.user?.id,
    });

  logger.error({
    type: "error",
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
    },
  });

  next(error);
};
