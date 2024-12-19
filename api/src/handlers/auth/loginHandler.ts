import { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { AuthService } from "../../services/auth.service";
import { ValidationError } from "../../types/errors";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export const createLoginHandler = (authService: AuthService) => {
  return async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const input = loginSchema.parse(req.body);
      const result = await authService.login(input);
      res.json(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        next(new ValidationError("Invalid login data", error.issues));
      } else {
        next(error);
      }
    }
  };
};
