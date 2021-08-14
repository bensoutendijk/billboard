import axios from 'axios';

import { createAction } from '@reduxjs/toolkit';

import {
  LocalUser,
  AuthError,
  UserCredentials,
} from './types';
import { AppDispatch } from '../';

export const createUserPending = createAction('CREATE_USER_PENDING');
export const createUserSuccess = createAction<LocalUser>('CREATE_USER_SUCCESS');
export const createUserFailed = createAction<AuthError>('CREATE_USER_FAILED');

export const getUserPending = createAction('GET_USER_PENDING');
export const getUserSuccess = createAction<LocalUser>('GET_USER_SUCCESS');
export const getUserFailed = createAction<AuthError>('GET_USER_FAILED');

export const loginUserPending = createAction('LOGIN_USER_PENDING');
export const loginUserSuccess = createAction<LocalUser>('LOGIN_USER_SUCCESS');
export const loginUserFailed = createAction<AuthError>('LOGIN_USER_FAILED');

export const logoutUser = createAction('LOGOUT_USER');

export const createUser = (
  formData: UserCredentials & { passwordConfirmation: string },
) => async (dispatch: AppDispatch): Promise<void> => {
  dispatch(createUserPending());
  try {
    if (!formData) throw new Error('No form data prodived');
    const { data } = await axios.post('/api/auth/local', formData);
    dispatch(createUserSuccess(data));
  } catch (error) {
    dispatch(createUserFailed(error.response.data));
  }
};

export const fetchUser = () => async (dispatch: AppDispatch): Promise<void> => {
  dispatch(getUserPending());
  try {
    const { data } = await axios.get('/api/auth/local/current');
    dispatch(getUserSuccess(data));
  } catch (error) {
    dispatch(getUserFailed(error.message));
  }
};

export const login = (
  formData: UserCredentials,
) => async (dispatch: AppDispatch): Promise<void> => {
  dispatch(loginUserPending());
  try {
    if (!formData) throw new Error('No form data prodived');
    const { data } = await axios.post('/api/auth/local/login', formData);
    dispatch(loginUserSuccess(data));
  } catch (error) {
    dispatch(loginUserFailed(error.response.data));
  }
};