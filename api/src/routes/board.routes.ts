// src/routes/boards.routes.ts
import { Router } from "express";
import { createCreateBoardHandler } from "../handlers/boards/createBoardHandler";
import { createGetBoardsHandler } from "../handlers/boards/getBoardsHandler";
// import { createAddBoardMemberHandler } from "../handlers/boards/addBoardMember";
// import { createDeleteBoardHandler } from "../handlers/boards/deleteBoard";
import { createGetBoardHandler } from "../handlers/boards/getBoardById";
// import { createRemoveBoardMemberHandler } from "../handlers/boards/removeBoardMember";
// import { createUpdateBoardHandler } from "../handlers/boards/updateBoard";
// import { createUpdateMemberPermissionsHandler } from "../handlers/boards/updateMemberPermissions";
import { validateAuthToken } from "../middlewares/auth.middleware";
import { BoardService } from "../services/board.service";

const router = Router();
const boardService = new BoardService();

// All board routes require authentication
router.use(validateAuthToken);

// Board CRUD operations
router.get("/", createGetBoardsHandler(boardService));
router.get("/:boardId", createGetBoardHandler(boardService));
router.post("/", createCreateBoardHandler(boardService));
// router.patch("/:boardId", createUpdateBoardHandler(boardService));
// router.delete("/:boardId", createDeleteBoardHandler(boardService));

// Board member management
// router.post("/:boardId/members", createAddBoardMemberHandler(boardService));
// router.delete(
//   "/:boardId/members/:userId",
//   createRemoveBoardMemberHandler(boardService),
// );
// router.patch(
//   "/:boardId/members/:userId",
//   createUpdateMemberPermissionsHandler(boardService),
// );

export default router;
