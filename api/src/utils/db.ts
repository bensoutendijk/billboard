import { PoolClient, QueryResult, QueryResultRow } from "pg";
import { pool, setUserContext, UserContext } from "../config/database";

export type QueryParams = Array<string | number | boolean | Date | null>;

export class DatabaseError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly detail?: string,
  ) {
    super(message);
    this.name = "DatabaseError";
  }
}

// Execute query with user context
export const query = async <T extends QueryResultRow>(
  text: string,
  params: QueryParams = [],
  userContext: UserContext,
): Promise<QueryResult<T>> => {
  const client = await pool.connect();

  try {
    await setUserContext(client, userContext);
    const result = await client.query<T>(text, params);
    await client.query("COMMIT");
    return result;
  } catch (error: any) {
    await client.query("ROLLBACK");
    throw new DatabaseError(error.message, error.code, error.detail);
  } finally {
    client.release();
  }
};

// Transaction with user context
export const transaction = async <T>(
  callback: (client: PoolClient) => Promise<T>,
  userContext: UserContext,
): Promise<T> => {
  const client = await pool.connect();

  try {
    await setUserContext(client, userContext);
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};
