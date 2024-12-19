import axios from "axios";

import { createAction } from "@reduxjs/toolkit";

import { AppDispatch } from "../";
import { AuthError, LocalUser, UserCredentials } from "./types";

export const createUserPending = createAction("CREATE_USER_PENDING");
export const createUserSuccess = createAction<LocalUser>("CREATE_USER_SUCCESS");
export const createUserFailed = createAction<AuthError>("CREATE_USER_FAILED");

export const getUserPending = createAction("GET_USER_PENDING");
export const getUserSuccess = createAction<LocalUser>("GET_USER_SUCCESS");
export const getUserFailed = createAction<AuthError>("GET_USER_FAILED");

export const loginUserPending = createAction("LOGIN_USER_PENDING");
export const loginUserSuccess = createAction<LocalUser>("LOGIN_USER_SUCCESS");
export const loginUserFailed = createAction<AuthError>("LOGIN_USER_FAILED");

export const logoutUser = createAction("LOGOUT_USER");

export const createUser =
  (formData: UserCredentials & { passwordConfirmation: string }) =>
  async (dispatch: AppDispatch): Promise<void> => {
    dispatch(createUserPending());
    try {
      if (!formData) throw new Error("No form data provided");
      const { data } = await axios.post("/api/v1/auth/register", formData);
      dispatch(createUserSuccess(data));
      // Store the token
      localStorage.setItem("token", data.token);
      // Set up axios interceptor
      setupAxiosInterceptors(data.token);
    } catch (error) {
      dispatch(createUserFailed(error.response.data));
    }
  };

export const fetchUser =
  () =>
  async (dispatch: AppDispatch): Promise<void> => {
    dispatch(getUserPending());
    try {
      const token = localStorage.getItem("token");
      if (token) {
        setupAxiosInterceptors(token);
      }
      const { data } = await axios.get("/api/v1/auth/current");
      dispatch(getUserSuccess(data));
    } catch (error) {
      dispatch(getUserFailed(error.message));
    }
  };

export const login =
  (formData: UserCredentials) =>
  async (dispatch: AppDispatch): Promise<void> => {
    dispatch(loginUserPending());
    try {
      if (!formData) throw new Error("No form data provided");
      const { data } = await axios.post("/api/v1/auth/login", formData);
      dispatch(loginUserSuccess(data));
      // Store the token
      localStorage.setItem("token", data.token);
      // Set up axios interceptor
      setupAxiosInterceptors(data.token);
    } catch (error) {
      dispatch(loginUserFailed(error.response.data));
    }
  };

export const logout =
  () =>
  (dispatch: AppDispatch): void => {
    localStorage.removeItem("token");
    axios.interceptors.request.use((config) => {
      config.headers["Authorization"] = null;
      return config;
    });
    dispatch(logoutUser());
  };

const setupAxiosInterceptors = (token: string) => {
  axios.interceptors.request.use(
    (config) => {
      if (token) {
        config.headers["Authorization"] = `Bearer ${token}`;
      }
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );
};
