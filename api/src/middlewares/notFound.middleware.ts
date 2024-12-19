import { NextFunction, Request, Response } from "express";
import { NotFoundError } from "../types/errors";

export const notFoundHandler = (
  req: Request,
  _res: Response,
  next: NextFunction,
): void => {
  next(new NotFoundError(`Cannot ${req.method} ${req.path}`));
};
