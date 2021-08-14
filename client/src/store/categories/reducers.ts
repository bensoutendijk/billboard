import { createReducer, ActionReducerMapBuilder } from '@reduxjs/toolkit';
import { CategoriesState } from './types';
import {
  createCategoryPending,
  createCategorySuccess,
  createCategoryFailed,
  postCategoryPending,
  postCategorySuccess,
  postCategoryFailed,
  removeCategoryPending,
  removeCategorySuccess,
  removeCategoryFailed,
  updateCategoryForm,
  receiveCategories,
  rejectCategories,
} from './actions';
import { mapToKey, getUniqueValues } from '../../utils';

const initialState: CategoriesState = {
  fetched: false,
  fetching: false,
  error: '',
  allIds: [],
  byId: {},
  form: {},
};

export default createReducer(initialState, (builder: ActionReducerMapBuilder<CategoriesState>) => {
  builder
    .addCase(createCategoryPending, (state) => {
      state.fetching = true;
    });
  builder
    .addCase(createCategorySuccess, (state, action) => {
      state.fetching = false;
      state.fetched = true;
      state.byId[action.payload._id] = action.payload;
      state.form[action.payload._id] = action.payload;
      state.allIds.push(action.payload._id);
    });
  builder
    .addCase(createCategoryFailed, (state, action) => {
      state.fetching = false;
      state.fetched = false;
      state.error = action.payload;
    });
  builder
    .addCase(receiveCategories, (state, action) => {
      state.fetching = false;
      state.fetched = true;
      state.byId = mapToKey(action.payload, '_id');
      state.form = mapToKey(action.payload, '_id');
      state.allIds = getUniqueValues(action.payload, '_id');
    });
  builder
    .addCase(rejectCategories, (state, action) => {
      state.fetching = false;
      state.fetched = false;
      state.error = action.payload;
    });
  builder
    .addCase(postCategoryPending, (state) => {
      state.fetching = true;
    });
  builder
    .addCase(postCategorySuccess, (state, action) => {
      state.fetching = false;
      state.fetched = true;
      state.byId[action.payload._id] = action.payload;
      state.form[action.payload._id] = action.payload;
    });
  builder
    .addCase(postCategoryFailed, (state, action) => {
      state.fetched = false;
      state.error = action.payload;
    });
  builder
    .addCase(removeCategoryPending, (state, action) => {
      state.fetching = true;
    });
  builder
    .addCase(removeCategorySuccess, (state, action) => {
      state.fetching = false;
      state.allIds = state.allIds.filter((id) => id !== action.payload._id);
    });
  builder
    .addCase(removeCategoryFailed, (state, action) => {
      state.fetching = false;
      state.error = action.payload;
    });
  builder
    .addCase(updateCategoryForm, (state, action) => {
      state.form[action.payload._id] = action.payload;
    });
});
