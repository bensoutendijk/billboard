export const config = {
  ENV: process.env.NODE_ENV || "development",
  LOG_LEVEL: process.env.LOG_LEVEL || "info",
  PORT: process.env.PORT || 8080,
  DATABASE_URL:
    process.env.DATABASE_URL ||
    "postgresql://postgres:postgres@postgres:5432/kanban",
  DATABASE_POOL_MIN: parseInt(process.env.DATABASE_POOL_MIN || "2", 10),
  DATABASE_POOL_MAX: parseInt(process.env.DATABASE_POOL_MAX || "10", 10),
  DATABASE_TIMEOUT: parseInt(process.env.DATABASE_TIMEOUT || "30000", 10),
  JWT_SECRET: process.env.JWT_SECRET || "secret",
} as const;
