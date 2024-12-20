// src/services/board.service.ts
import { UserContext } from "../config/database";
import { Board } from "../models/types";
import { query, transaction } from "../utils/db";

export class BoardService {
  async getBoardById(
    boardId: string,
    userContext: UserContext,
  ): Promise<Board | null> {
    const result = await query<Board>(
      `
        SELECT 
          b.*,
          COALESCE(
            jsonb_agg(
              DISTINCT jsonb_build_object(
                'id', c.id,
                'title', c.title,
                'board_id', c.board_id,
                'cards', (
                  SELECT COALESCE(jsonb_agg(
                    jsonb_build_object(
                      'id', cards.id,
                      'title', cards.title,
                      'description', cards.description,
                      'category_id', cards.category_id
                    )
                  ), '[]'::jsonb)
                  FROM cards 
                  WHERE cards.category_id = c.id
                )
              )
            ) FILTER (WHERE c.id IS NOT NULL), 
            '[]'::jsonb
          ) AS categories
        FROM boards b
        LEFT JOIN categories c ON c.board_id = b.id
        WHERE b.id = $1
        GROUP BY b.id
      `,
      [boardId],
      userContext,
    );
    return result.rows[0] || null;
  }

  async createBoard(title: string, userContext: UserContext): Promise<Board> {
    const result = await query<Board>(
      "SELECT * FROM create_board($1)",
      [title],
      userContext,
    );
    return result.rows[0];
  }

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

  async getUserBoards(userContext: UserContext): Promise<Board[]> {
    const result = await query<Board>(
      "SELECT * FROM boards WHERE NOT archived ORDER BY created_at DESC",
      [],
      userContext,
    );
    return result.rows;
  }

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
