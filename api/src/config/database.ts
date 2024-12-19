import { Pool, PoolClient, PoolConfig } from "pg";
import { config } from "./env";

// Types for user context
export interface UserContext {
  userId: string;
  role: "app_user" | "app_admin";
}

const poolConfig: PoolConfig = {
  connectionString: config.DATABASE_URL,
  min: config.DATABASE_POOL_MIN,
  max: config.DATABASE_POOL_MAX,
  idleTimeoutMillis: config.DATABASE_TIMEOUT,
};

export const pool = new Pool(poolConfig);

pool.on("error", (err) => {
  console.error("Unexpected error on idle client", err);
  process.exit(-1);
});

// Utility to set user context on connection
export const setUserContext = async (
  client: PoolClient,
  context: UserContext,
): Promise<void> => {
  await client.query("BEGIN");
  await client.query(`SET LOCAL ROLE ${context.role}`);
  await client.query(`SET LOCAL jwt.claims.user_id TO '${context.userId}'`);
  await client.query(`SET LOCAL jwt.claims.role TO '${context.role}'`);
};

// Initialize database connection and verify it works
export const initializeDatabase = async (): Promise<void> => {
  try {
    const client = await pool.connect();
    await client.query("SELECT NOW()");
    client.release();
    console.log("Database connection successful");
  } catch (error) {
    console.error("Database connection failed:", error);
    throw error;
  }
};
