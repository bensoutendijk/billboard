import { NextFunction, Request, Response } from "express";
import { ValidationError } from "../types/errors";

export const validateRequest = <T>(validator: (data: unknown) => T) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = validator(req.body);
      req.body = validated;
      next();
    } catch (error) {
      next(new ValidationError("Invalid request data", error));
    }
  };
};
