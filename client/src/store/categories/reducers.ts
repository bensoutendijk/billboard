import { ActionReducerMapBuilder, createReducer } from "@reduxjs/toolkit";
import { getUniqueValues, mapToKey } from "../../utils";
import {
  createCategoryFailed,
  createCategoryPending,
  createCategorySuccess,
  postCategoryFailed,
  postCategoryPending,
  postCategorySuccess,
  receiveCategories,
  rejectCategories,
  removeCategoryFailed,
  removeCategoryPending,
  removeCategorySuccess,
  updateCategoryForm,
} from "./actions";
import { CategoriesState } from "./types";

const initialState: CategoriesState = {
  fetched: false,
  fetching: false,
  error: "",
  allIds: [],
  byId: {},
  form: {},
};

export default createReducer(
  initialState,
  (builder: ActionReducerMapBuilder<CategoriesState>) => {
    builder.addCase(createCategoryPending, (state) => {
      state.fetching = true;
    });
    builder.addCase(createCategorySuccess, (state, action) => {
      state.fetching = false;
      state.fetched = true;
      state.byId[action.payload.id] = action.payload;
      state.form[action.payload.id] = action.payload;
      state.allIds.push(action.payload.id);
    });
    builder.addCase(createCategoryFailed, (state, action) => {
      state.fetching = false;
      state.fetched = false;
      state.error = action.payload;
    });
    builder.addCase(receiveCategories, (state, action) => {
      state.fetching = false;
      state.fetched = true;
      state.byId = mapToKey(action.payload, "id");
      state.form = mapToKey(action.payload, "id");
      state.allIds = getUniqueValues(action.payload, "id");
    });
    builder.addCase(rejectCategories, (state, action) => {
      state.fetching = false;
      state.fetched = false;
      state.error = action.payload;
    });
    builder.addCase(postCategoryPending, (state) => {
      state.fetching = true;
    });
    builder.addCase(postCategorySuccess, (state, action) => {
      state.fetching = false;
      state.fetched = true;
      state.byId[action.payload.id] = action.payload;
      state.form[action.payload.id] = action.payload;
    });
    builder.addCase(postCategoryFailed, (state, action) => {
      state.fetched = false;
      state.error = action.payload;
    });
    builder.addCase(removeCategoryPending, (state, action) => {
      state.fetching = true;
    });
    builder.addCase(removeCategorySuccess, (state, action) => {
      state.fetching = false;
      state.allIds = state.allIds.filter((id) => id !== action.payload.id);
    });
    builder.addCase(removeCategoryFailed, (state, action) => {
      state.fetching = false;
      state.error = action.payload;
    });
    builder.addCase(updateCategoryForm, (state, action) => {
      state.form[action.payload.id] = action.payload;
    });
  }
);
