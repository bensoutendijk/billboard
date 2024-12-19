import { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { AuthService } from "../../services/auth.service";
import { ValidationError } from "../../types/errors";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  passwordConfirmation: z.string().min(2),
});

export const createRegisterHandler = (authService: AuthService) => {
  return async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const input = registerSchema.parse(req.body);
      const result = await authService.register(input);
      res.status(201).json(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        next(new ValidationError("Invalid registration data", error.issues));
      } else {
        next(error);
      }
    }
  };
};
