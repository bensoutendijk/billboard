import { ActionReducerMapBuilder, createReducer } from "@reduxjs/toolkit";
import { getUniqueValues, mapToKey } from "../../utils";
import {
  createCardFailed,
  createCardPending,
  createCardSuccess,
  getCardFailed,
  getCardPending,
  getCardSuccess,
  postCardFailed,
  postCardPending,
  postCardSuccess,
  receiveCards,
  rejectCards,
  removeCardFailed,
  removeCardPending,
  removeCardSuccess,
  updateCardForm,
} from "./actions";
import { CardsState } from "./types";

const initialState: CardsState = {
  fetched: false,
  fetching: false,
  error: "",
  allIds: [],
  byId: {},
  form: {},
};

export default createReducer(
  initialState,
  (builder: ActionReducerMapBuilder<CardsState>) => {
    builder.addCase(createCardPending, (state) => {
      state.fetching = true;
    });
    builder.addCase(createCardSuccess, (state, action) => {
      state.fetching = false;
      state.fetched = true;
      state.byId[action.payload.id] = action.payload;
      state.allIds.push(action.payload.id);
    });
    builder.addCase(createCardFailed, (state, action) => {
      state.fetching = false;
      state.fetched = false;
      state.error = action.payload;
    });
    builder.addCase(receiveCards, (state, action) => {
      state.fetching = false;
      state.fetched = true;
      state.byId = mapToKey(action.payload, "id");
      state.allIds = getUniqueValues(action.payload, "id");
    });
    builder.addCase(rejectCards, (state, action) => {
      state.fetching = false;
      state.fetched = false;
      state.error = action.payload;
    });
    builder.addCase(getCardPending, (state) => {
      state.fetching = true;
    });
    builder.addCase(getCardSuccess, (state, action) => {
      state.fetching = false;
      state.fetched = true;
      state.byId[action.payload.id] = action.payload;
      state.form[action.payload.id] = action.payload;
    });
    builder.addCase(getCardFailed, (state, action) => {
      state.fetching = false;
      state.fetched = false;
      state.error = action.payload;
    });
    builder.addCase(postCardPending, (state) => {
      state.fetching = true;
    });
    builder.addCase(postCardSuccess, (state, action) => {
      state.fetching = false;
      state.fetched = true;
      state.byId[action.payload.id] = action.payload;
    });
    builder.addCase(postCardFailed, (state, action) => {
      state.fetched = false;
      state.error = action.payload;
    });
    builder.addCase(removeCardPending, (state, action) => {
      state.fetching = true;
    });
    builder.addCase(removeCardSuccess, (state, action) => {
      state.fetching = false;
      state.allIds = state.allIds.filter((id) => id !== action.payload);
      state.byId[action.payload] = undefined;
    });
    builder.addCase(removeCardFailed, (state, action) => {
      state.fetching = false;
      state.error = action.payload;
    });
    builder.addCase(updateCardForm, (state, action) => {
      state.form[action.payload.id] = action.payload;
    });
  }
);
