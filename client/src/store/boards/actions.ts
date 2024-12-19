import axios from "axios";

import { createAction } from "@reduxjs/toolkit";

import { AppDispatch } from "..";
import { receiveCards } from "../cards/actions";
import { receiveCategories } from "../categories/actions";
import { Board, BoardComplete, BoardForm, BoardsError } from "./types";

export const createBoardPending = createAction("CREATE_BOARD_PENDING");
export const createBoardSuccess = createAction<Board>("CREATE_BOARD_SUCCESS");
export const createBoardFailed = createAction<BoardsError>(
  "CREATE_BOARD_FAILED"
);

export const requestBoards = createAction("REQUEST_BOARDS");
export const receiveBoards = createAction<Board[]>("RECEIVE_BOARDS");
export const rejectBoards = createAction<BoardsError>("REJECT_BOARDS");

export const getBoardPending = createAction("GET_BOARD_PENDING");
export const getBoardSuccess = createAction<Board>("GET_BOARD_SUCCESS");
export const getBoardFailed = createAction<BoardsError>("GET_BOARD_FAILED");

export const postBoardPending = createAction("POST_BOARD_PENDING");
export const postBoardSuccess = createAction<Board>("POST_BOARD_SUCCESS");
export const postBoardFailed = createAction<BoardsError>("POST_BOARD_FAILED");

export const removeBoardPending = createAction("REMOVE_BOARD_PENDING");
export const removeBoardSuccess = createAction<Board>("REMOVE_BOARD_SUCCESS");
export const removeBoardFailed = createAction<BoardsError>(
  "REMOVE_BOARD_FAILED"
);

export const updateBoardForm = createAction<BoardForm>("UPDATE_BOARD_FORM");

export const createBoard =
  (formData: BoardForm) =>
  async (dispatch: AppDispatch): Promise<void> => {
    dispatch(createBoardPending());
    try {
      if (!formData) throw new Error("No form data prodived");
      const { data } = await axios.post("/api/v1/boards", formData);
      dispatch(createBoardSuccess(data));
    } catch (error) {
      dispatch(createBoardFailed(error.message));
    }
  };

export const fetchBoards =
  () =>
  async (dispatch: AppDispatch): Promise<void> => {
    dispatch(requestBoards());
    try {
      const { data } = await axios.get("/api/v1/boards");
      dispatch(receiveBoards(data));
    } catch (error) {
      const { data } = error.response;
      dispatch(rejectBoards(data));
    }
  };

export const fetchBoard =
  (boardid: string) =>
  async (dispatch: AppDispatch): Promise<void> => {
    dispatch(getBoardPending());
    try {
      if (!boardid) throw new Error("No board ID provided");
      const { data } = await axios.get<BoardComplete>(
        `/api/v1/boards/${boardid}`
      );
      dispatch(getBoardSuccess(data.board));
      dispatch(receiveCategories(data.categories));
      dispatch(receiveCards(data.cards));
    } catch (error) {
      dispatch(getBoardFailed(error.message));
    }
  };

export const updateBoard =
  (board: BoardForm) =>
  async (dispatch: AppDispatch): Promise<void> => {
    dispatch(postBoardPending());
    try {
      if (!board) throw new Error("No form data provided");
      const { data } = await axios.post(`/api/v1/boards/${board.id}`, board);
      dispatch(postBoardSuccess(data));
    } catch (error) {
      dispatch(postBoardFailed(error.message));
    }
  };

export const deleteBoard =
  (boardid: string) =>
  async (dispatch: AppDispatch): Promise<void> => {
    dispatch(removeBoardPending());
    try {
      const { data } = await axios.delete(`/api/boards/${boardid}`);
      dispatch(removeBoardSuccess(data));
    } catch (error) {
      const { data } = error.response;
      dispatch(removeBoardFailed(data));
    }
  };
