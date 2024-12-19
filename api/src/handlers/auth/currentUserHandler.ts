import { NextFunction, Request, Response } from "express";
import { AuthService } from "../../services/auth.service";
import { ValidationError } from "../../types/errors";

export const createCurrentUserHandler = (authService: AuthService) => {
  return async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      if (!req.user?.id) {
        throw new ValidationError("User not authenticated");
      }

      const user = await authService.getCurrentUser(req.user.id);
      res.json(user);
    } catch (error) {
      next(error);
    }
  };
};
