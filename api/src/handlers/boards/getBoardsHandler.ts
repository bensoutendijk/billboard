import { NextFunction, Request, Response } from "express";
import { getUserContext } from "../../middlewares/auth.middleware";
import { BoardService } from "../../services/board.service";

export const createGetBoardsHandler = (boardService: BoardService) => {
  return async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const userContext = getUserContext(req);
      const boards = await boardService.getUserBoards(userContext);
      res.json(boards);
    } catch (error) {
      next(error);
    }
  };
};
