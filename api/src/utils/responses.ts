const DEFAULT_HEADERS = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
};

const HttpStatus = {
  OK: { code: 200, message: "OK" },
  CREATED: { code: 201, message: "Resource created successfully" },
  ACCEPTED: { code: 202, message: "Request accepted for processing" },
  NO_CONTENT: { code: 204, message: "No content" },
  BAD_REQUEST: { code: 400, message: "Bad request" },
  UNAUTHORIZED: { code: 401, message: "Unauthorized" },
  FORBIDDEN: { code: 403, message: "Forbidden" },
  NOT_FOUND: { code: 404, message: "Resource not found" },
  CONFLICT: { code: 409, message: "Resource conflict" },
  UNPROCESSABLE: { code: 422, message: "Unprocessable entity" },
  TOO_MANY_REQUESTS: { code: 429, message: "Too many requests" },
  INTERNAL_ERROR: { code: 500, message: "Internal server error" },
  SERVICE_UNAVAILABLE: { code: 503, message: "Service unavailable" },
};

export function createError(statusCode, message, details = null, code = null) {
  const response = {
    statusCode,
    headers: DEFAULT_HEADERS,
    body: {
      success: false,
      error: {
        message: message || HttpStatus[statusCode]?.message || "Unknown error",
      },
    },
  };

  if (details) {
    response.body.error.details = details;
  }

  if (code) {
    response.body.error.code = code;
  }

  // Add request ID if available in development
  if (process.env.NODE_ENV === "development" && global.requestId) {
    response.body.error.requestId = global.requestId;
  }

  return response;
}

export function createResponse(statusCode, data, message = null, meta = null) {
  const response = {
    statusCode,
    headers: DEFAULT_HEADERS,
    body: {
      success: statusCode < 400,
      data,
    },
  };

  if (message) {
    response.body.message = message;
  }

  if (meta) {
    response.body.meta = meta;
  }

  // Add pagination metadata if present
  if (meta?.pagination) {
    response.headers["X-Total-Count"] = meta.pagination.total;
    response.headers["X-Page"] = meta.pagination.page;
    response.headers["X-Per-Page"] = meta.pagination.perPage;
  }

  return response;
}
