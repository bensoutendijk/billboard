import { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { getUserContext } from "../../middlewares/auth.middleware";
import { BoardService } from "../../services/board.service";

const createBoardSchema = z.object({
  title: z.string(),
});

export const createCreateBoardHandler = (boardService: BoardService) => {
  return async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const input = createBoardSchema.parse(req.body);

      const userContext = getUserContext(req);
      const boards = await boardService.createBoard(input.title, userContext);
      res.json(boards);
    } catch (error) {
      next(error);
    }
  };
};
