import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.POSTGRES_URI,
});

export interface Board {
  title: string;
  createdOn: Date;
  updatedOn: Date;
  archived: boolean;
}

export class BoardModel {
  static async findById(id: string): Promise<Board> {
    const result = await pool.query(
      /* SQL */ `
      SELECT * FROM boards WHERE id = $1
    `,
      [id],
    );

    return result.rows[0] || null;
  }

  static async create(title: string): Promise<Board> {
    const now = new Date();
    const result = await pool.query(
      /* SQL */ `
      SELECT 
        title, 
        created_at, 
        updated_at, 
        is_archived 
      FROM create_board($1, $2)
    `,
      [title, now],
    );

    return result.rows[0];
  }

  static async findByUserId(userId: string): Promise<Board[]> {
    const result = await pool.query(
      /* SQL */ `
      SELECT
        title,
        created_at,
        updated_at,
        is_archived
      FROM boards
      WHERE author_id = $1
    `,
      [userId],
    );

    return result.rows;
  }

  static async updateById(id: string, title: string): Promise<Board> {
    const result = await pool.query(
      /* SQL */ `
      UPDATE boards
      SET title = $2
      WHERE id = $1
      RETURNING
        title,
        created_at,
        updated_at,
        is_archived
    `,
      [id, title],
    );

    return result.rows[0];
  }

  static async deleteById(id: string): Promise<Board> {
    const result = await pool.query(/* SQL */ `
      
    `);
  }
}
