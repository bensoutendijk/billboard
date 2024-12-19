// src/services/board.service.ts
import { UserContext } from "../config/database";
import { Board } from "../models/types";
import { query, transaction } from "../utils/db";

export class BoardService {
  // Simple query by ID - using direct SQL
  async getBoard(
    boardId: string,
    userContext: UserContext,
  ): Promise<Board | null> {
    const result = await query<Board>(
      "SELECT * FROM boards WHERE id = $1",
      [boardId],
      userContext,
    );
    return result.rows[0] || null;
  }

  // Complex operation - using stored procedure
  async createBoard(title: string, userContext: UserContext): Promise<Board> {
    const result = await query<Board>(
      "SELECT * FROM create_board($1)",
      [title],
      userContext,
    );
    return result.rows[0];
  }

  // Simple update - using direct SQL
  async updateBoard(
    boardId: string,
    title: string,
    userContext: UserContext,
  ): Promise<Board> {
    const result = await query<Board>(
      "UPDATE boards SET title = $2 WHERE id = $1 RETURNING *",
      [boardId, title],
      userContext,
    );
    return result.rows[0];
  }

  // Get all boards for current user - using direct SQL
  async getUserBoards(userContext: UserContext): Promise<Board[]> {
    const result = await query<Board>(
      "SELECT * FROM boards WHERE NOT archived ORDER BY created_at DESC",
      [],
      userContext,
    );
    return result.rows;
  }

  // Complex operation with multiple steps - using transaction
  async archiveBoardWithCategories(
    boardId: string,
    userContext: UserContext,
  ): Promise<void> {
    await transaction(async (client) => {
      await client.query("UPDATE boards SET archived = true WHERE id = $1", [
        boardId,
      ]);
      await client.query(
        "UPDATE categories SET archived = true WHERE board_id = $1",
        [boardId],
      );
      await client.query(
        "UPDATE cards SET archived = true WHERE board_id = $1",
        [boardId],
      );
    }, userContext);
  }
}
