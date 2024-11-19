import { Pool } from 'pg';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

const pool = new Pool({
  connectionString: process.env.POSTGRES_URI
});

export interface User {
  id: string;
  email: string;
  permissions: string[];
  services: string[];
  hash: string;
  salt: string;
}

export class UserModel {
  static async findByEmail(email: string): Promise<User | null> {
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    return result.rows[0] || null;
  }

  static async findById(id: string): Promise<User | null> {
    const result = await pool.query(
      'SELECT * FROM users WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  }

  static async create(email: string, password: string): Promise<User> {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 10000, 512, 'sha512').toString('hex');
    
    const result = await pool.query(
      'INSERT INTO users (email, hash, salt, permissions, services) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [email, hash, salt, [], []]
    );
    
    return result.rows[0];
  }

  static validatePassword(user: User, password: string): boolean {
    const hash = crypto.pbkdf2Sync(password, user.salt, 10000, 512, 'sha512').toString('hex');
    return user.hash === hash;
  }

  static generateJWT(user: User): string {
    return jwt.sign({
      email: user.email,
      id: user.id,
    }, process.env.JWT_SECRET!, { expiresIn: '30d' });
  }

  static toJSON(user: User): any {
    return {
      id: user.id,
      email: user.email,
      permissions: user.permissions,
      services: user.services,
    };
  }
}
