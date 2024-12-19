import { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { AuthService } from "../../services/auth.service";
import { ValidationError } from "../../types/errors";

const changePasswordSchema = z.object({
  currentPassword: z.string(),
  newPassword: z.string().min(8),
});

export const createChangePasswordHandler = (authService: AuthService) => {
  return async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const input = changePasswordSchema.parse(req.body);

      if (!req.user?.id) {
        throw new ValidationError("User not authenticated");
      }

      await authService.changePassword(
        req.user.id,
        input.currentPassword,
        input.newPassword,
      );

      res.json({ message: "Password updated successfully" });
    } catch (error) {
      if (error instanceof z.ZodError) {
        next(new ValidationError("Invalid password data", error.issues));
      } else {
        next(error);
      }
    }
  };
};
