import crypto from "crypto";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import { config } from "../config/env";
import { ConflictError, ValidationError } from "../types/errors";
import { query } from "../utils/db";

interface RegisterInput {
  email: string;
  password: string;
  passwordConfirmation: string;
}

interface LoginInput {
  email: string;
  password: string;
}

interface AuthResponse {
  token: string;
  user: {
    id: string;
    email: string;
  };
}

const SYSTEM_CONTEXT = {
  userId: "system",
  role: "app_admin" as const,
};

export class AuthService {
  private readonly SALT_LENGTH = 16;
  private readonly KEY_LENGTH = 64;
  private readonly ITERATIONS = 1000;
  private readonly DIGEST = "sha512";

  private generateToken(userId: string, email: string): string {
    return jwt.sign(
      {
        sub: userId,
        email,
        role: "app_user",
      },
      config.JWT_SECRET,
      {
        expiresIn: "24h",
      },
    );
  }

  private async hashPassword(password: string): Promise<string> {
    const salt = crypto.randomBytes(this.SALT_LENGTH).toString("hex");
    const hash = await new Promise<string>((resolve, reject) => {
      crypto.pbkdf2(
        password,
        salt,
        this.ITERATIONS,
        this.KEY_LENGTH,
        this.DIGEST,
        (err, derivedKey) => {
          if (err) reject(err);
          resolve(salt + ":" + derivedKey.toString("hex"));
        },
      );
    });
    return hash;
  }

  private async verifyPassword(
    password: string,
    hash: string,
  ): Promise<boolean> {
    const [salt, key] = hash.split(":");
    const keyBuffer = Buffer.from(key, "hex");
    const derivedKey = await new Promise<Buffer>((resolve, reject) => {
      crypto.pbkdf2(
        password,
        salt,
        this.ITERATIONS,
        this.KEY_LENGTH,
        this.DIGEST,
        (err, derivedKey) => {
          if (err) reject(err);
          resolve(derivedKey);
        },
      );
    });
    return crypto.timingSafeEqual(keyBuffer, derivedKey);
  }

  async register(input: RegisterInput): Promise<AuthResponse> {
    const passwordHash = await this.hashPassword(input.password);
    const userId = uuidv4();

    try {
      const result = await query(
        `
        INSERT INTO users (id, email, password_hash)
        VALUES ($1, $2, $3)
        RETURNING id, email
        `,
        [userId, input.email.toLowerCase(), passwordHash],
        SYSTEM_CONTEXT,
      );

      const user = result.rows[0];
      const token = this.generateToken(user.id, user.email);

      return {
        token,
        user: {
          id: user.id,
          email: user.email,
        },
      };
    } catch (error: any) {
      if (error.code === "23505") {
        // unique_violation
        throw new ConflictError("Email already registered");
      }
      throw error;
    }
  }

  async login(input: LoginInput): Promise<AuthResponse> {
    const result = await query(
      `
      SELECT id, email, password_hash
      FROM users
      WHERE email = $1
      `,
      [input.email.toLowerCase()],
      SYSTEM_CONTEXT,
    );

    const user = result.rows[0];

    if (!user) {
      throw new ValidationError("Invalid email or password");
    }

    const validPassword = await this.verifyPassword(
      input.password,
      user.password_hash,
    );
    if (!validPassword) {
      throw new ValidationError("Invalid email or password");
    }

    const token = this.generateToken(user.id, user.email);

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
      },
    };
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const result = await query(
      "SELECT password_hash FROM users WHERE id = $1",
      [userId],
      SYSTEM_CONTEXT,
    );

    const user = result.rows[0];
    if (!user) {
      throw new ValidationError("User not found");
    }

    const validPassword = await this.verifyPassword(
      currentPassword,
      user.password_hash,
    );
    if (!validPassword) {
      throw new ValidationError("Current password is incorrect");
    }

    const newPasswordHash = await this.hashPassword(newPassword);

    await query(
      "UPDATE users SET password_hash = $2 WHERE id = $1",
      [userId, newPasswordHash],
      SYSTEM_CONTEXT,
    );
  }

  async getCurrentUser(userId: string) {
    const result = await query(
      `
      SELECT 
        id,
        email,
        created_at,
        updated_at
      FROM users
      WHERE id = $1
      `,
      [userId],
      SYSTEM_CONTEXT,
    );

    if (!result.rows[0]) {
      throw new ValidationError("User not found");
    }

    return {
      id: result.rows[0].id,
      email: result.rows[0].email,
      createdAt: result.rows[0].created_at,
      updatedAt: result.rows[0].updated_at,
    };
  }
}
