import { ActionReducerMapBuilder, createReducer } from "@reduxjs/toolkit";
import { getUniqueValues, mapToKey } from "../../utils";
import {
  createBoardFailed,
  createBoardPending,
  createBoardSuccess,
  getBoardFailed,
  getBoardPending,
  getBoardSuccess,
  postBoardFailed,
  postBoardPending,
  postBoardSuccess,
  receiveBoards,
  rejectBoards,
  removeBoardFailed,
  removeBoardPending,
  removeBoardSuccess,
  updateBoardForm,
} from "./actions";
import { BoardsState } from "./types";

const initialState: BoardsState = {
  fetched: false,
  fetching: false,
  error: "",
  allIds: [],
  byId: {},
  form: {},
};

export default createReducer(
  initialState,
  (builder: ActionReducerMapBuilder<BoardsState>) => {
    builder.addCase(createBoardPending, (state) => {
      state.fetching = true;
    });
    builder.addCase(createBoardSuccess, (state, action) => {
      state.fetching = false;
      state.fetched = true;
      state.byId[action.payload.id] = action.payload;
      state.allIds.push(action.payload.id);
    });
    builder.addCase(createBoardFailed, (state, action) => {
      state.fetching = false;
      state.fetched = false;
      state.error = action.payload;
    });
    builder.addCase(receiveBoards, (state, action) => {
      state.fetching = false;
      state.fetched = true;
      state.byId = mapToKey(action.payload, "id");
      state.allIds = getUniqueValues(action.payload, "id");
    });
    builder.addCase(rejectBoards, (state, action) => {
      state.fetching = false;
      state.fetched = false;
      state.error = action.payload;
    });
    builder.addCase(getBoardPending, (state) => {
      state.fetching = true;
    });
    builder.addCase(getBoardSuccess, (state, action) => {
      state.fetching = false;
      state.fetched = true;
      state.byId[action.payload.id] = action.payload;
      state.form[action.payload.id] = action.payload;
    });
    builder.addCase(getBoardFailed, (state, action) => {
      state.fetching = false;
      state.fetched = false;
      state.error = action.payload;
    });
    builder.addCase(postBoardPending, (state) => {
      state.fetching = true;
    });
    builder.addCase(postBoardSuccess, (state, action) => {
      state.fetching = false;
      state.fetched = true;
      state.byId[action.payload.id] = action.payload;
      state.form[action.payload.id] = action.payload;
    });
    builder.addCase(postBoardFailed, (state, action) => {
      state.fetched = false;
      state.error = action.payload;
    });
    builder.addCase(removeBoardPending, (state, action) => {
      state.fetching = true;
    });
    builder.addCase(removeBoardSuccess, (state, action) => {
      state.fetching = false;
      state.allIds = state.allIds.filter((id) => id !== action.payload.id);
    });
    builder.addCase(removeBoardFailed, (state, action) => {
      state.fetching = false;
      state.error = action.payload;
    });
    builder.addCase(updateBoardForm, (state, action) => {
      state.form[action.payload.id] = action.payload;
    });
  }
);
