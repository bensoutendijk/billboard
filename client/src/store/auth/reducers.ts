import {
  UsersState,
} from './types';
import { createReducer, ActionReducerMapBuilder } from '@reduxjs/toolkit';
import { loginUserPending, loginUserSuccess, loginUserFailed, createUserPending, createUserSuccess, createUserFailed, getUserPending, getUserSuccess, getUserFailed, logoutUser } from './actions';


const initialState: UsersState = {
  fetched: false,
  fetching: false,
};

export default createReducer(initialState, (builder: ActionReducerMapBuilder<UsersState>) => {
  builder
    .addCase(createUserPending, (state) => {
      state.fetching = true;
    });
  builder
    .addCase(createUserSuccess, (state, action) => {
      state.fetching = false;
      state.fetched = true;
      state.data = action.payload;
    });
  builder
    .addCase(createUserFailed, (state, action) => {
      state.fetching = false;
      state.fetched = false;
      state.error = action.payload;
    });
  builder
    .addCase(getUserPending, (state) => {
      state.fetching = true;
    });
  builder
    .addCase(getUserSuccess, (state, action) => {
      state.fetching = false;
      state.fetched = true;
      state.data = action.payload;
    });
  builder
    .addCase(getUserFailed, (state, action) => {
      state.fetching = false;
      state.fetched = false;
      state.error = action.payload;
    });
  builder
    .addCase(loginUserPending, (state) => {
      state.fetching = true;
    });
  builder
    .addCase(loginUserSuccess, (state, action) => {
      state.fetching = false;
      state.fetched = true;
      state.data = action.payload;
    });
  builder
    .addCase(loginUserFailed, (state, action) => {
      state.fetching = false;
      state.fetched = false;
      state.error = action.payload;
    });
  builder
    .addCase(logoutUser, (state) => {
      state.fetched = false;
      state.data = undefined;
    });
});
