import { createReducer, ActionReducerMapBuilder } from '@reduxjs/toolkit';
import { CardsState } from './types';
import {
  createCardPending,
  createCardSuccess,
  createCardFailed,
  postCardPending,
  postCardSuccess,
  postCardFailed,
  removeCardPending,
  removeCardSuccess,
  removeCardFailed,
  updateCardForm,
  receiveCards,
  rejectCards,
  getCardPending,
  getCardSuccess,
  getCardFailed,
} from './actions';
import { mapToKey, getUniqueValues } from '../../utils';

const initialState: CardsState = {
  fetched: false,
  fetching: false,
  error: '',
  allIds: [],
  byId: {},
  form: {},
};

export default createReducer(initialState, (builder: ActionReducerMapBuilder<CardsState>) => {
  builder
    .addCase(createCardPending, (state) => {
      state.fetching = true;
    });
  builder
    .addCase(createCardSuccess, (state, action) => {
      state.fetching = false;
      state.fetched = true;
      state.byId[action.payload._id] = action.payload;
      state.allIds.push(action.payload._id);
    });
  builder
    .addCase(createCardFailed, (state, action) => {
      state.fetching = false;
      state.fetched = false;
      state.error = action.payload;
    });
  builder
    .addCase(receiveCards, (state, action) => {
      state.fetching = false;
      state.fetched = true;
      state.byId = mapToKey(action.payload, '_id');
      state.allIds = getUniqueValues(action.payload, '_id');
    });
  builder
    .addCase(rejectCards, (state, action) => {
      state.fetching = false;
      state.fetched = false;
      state.error = action.payload;
    });
  builder
    .addCase(getCardPending, (state) => {
      state.fetching = true;
    });
  builder
    .addCase(getCardSuccess, (state, action) => {
      state.fetching = false;
      state.fetched = true;
      state.byId[action.payload._id] = action.payload;
      state.form[action.payload._id] = action.payload;
    });
  builder
    .addCase(getCardFailed, (state, action) => {
      state.fetching = false;
      state.fetched = false;
      state.error = action.payload;
    });
  builder
    .addCase(postCardPending, (state) => {
      state.fetching = true;
    });
  builder
    .addCase(postCardSuccess, (state, action) => {
      state.fetching = false;
      state.fetched = true;
      state.byId[action.payload._id] = action.payload;
    });
  builder
    .addCase(postCardFailed, (state, action) => {
      state.fetched = false;
      state.error = action.payload;
    });
  builder
    .addCase(removeCardPending, (state, action) => {
      state.fetching = true;
    });
  builder
    .addCase(removeCardSuccess, (state, action) => {
      state.fetching = false;
      state.allIds = state.allIds.filter((id) => id !== action.payload);
      state.byId[action.payload] = undefined;
    });
  builder
    .addCase(removeCardFailed, (state, action) => {
      state.fetching = false;
      state.error = action.payload;
    });
  builder
    .addCase(updateCardForm, (state, action) => {
      state.form[action.payload._id] = action.payload;
    });
});
