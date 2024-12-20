import { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { getUserContext } from "../../middlewares/auth.middleware";
import { BoardService } from "../../services/board.service";

const getBoardByIdSchema = z.object({
  id: z.string(),
});

export const createGetBoardHandler = (boardService: BoardService) => {
  return async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const input = getBoardByIdSchema.parse({
        id: req.params.boardId,
      });

      const userContext = getUserContext(req);
      const boards = await boardService.getBoardById(input.id, userContext);
      res.json(boards);
    } catch (error) {
      next(error);
    }
  };
};
