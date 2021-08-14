import axios from 'axios';

import { createAction } from '@reduxjs/toolkit';

import {
  Category,
  CategoriesError,
  CategoryForm,
} from './types';
import { AppDispatch } from '..';
import { postBoardPending, postBoardSuccess, postBoardFailed } from '../boards/actions';

export const createCategoryPending = createAction('CREATE_CATEGORY_PENDING');
export const createCategorySuccess = createAction<Category>('CREATE_CATEGORY_SUCCESS');
export const createCategoryFailed = createAction<CategoriesError>('CREATE_CATEGORY_FAILED');

export const requestCategories = createAction('REQUEST_CATEGORIES');
export const receiveCategories = createAction<Category[]>('RECEIVE_CATEGORIES');
export const rejectCategories = createAction<CategoriesError>('REJECT_CATEGORIES');

export const postCategoryPending = createAction('POST_CATEGORY_PENDING');
export const postCategorySuccess = createAction<Category>('POST_CATEGORY_SUCCESS');
export const postCategoryFailed = createAction<CategoriesError>('POST_CATEGORY_FAILED');

export const removeCategoryPending = createAction('REMOVE_CATEGORY_PENDING');
export const removeCategorySuccess = createAction<Category>('REMOVE_CATEGORY_SUCCESS');
export const removeCategoryFailed = createAction<CategoriesError>('REMOVE_CATEGORY_FAILED');

export const updateCategoryForm = createAction<CategoryForm>('UPDATE_CATEGORY_FORM');

export const createCategory = (
  formData: Omit<CategoryForm, '_id'>,
) => async (dispatch: AppDispatch): Promise<void> => {
  dispatch(createCategoryPending());
  dispatch(postBoardPending());
  try {
    if (!formData) throw new Error('No form data prodived');
    const { data } = await axios.post('/api/categories', formData);
    dispatch(createCategorySuccess(data.category));
    dispatch(postBoardSuccess(data.board));
  } catch (error) {
    dispatch(createCategoryFailed(error.message));
    dispatch(postBoardFailed(error.message));
  }
};

export const updateCategory = (
  category: CategoryForm,
) => async (dispatch: AppDispatch): Promise<void> => {
  dispatch(postCategoryPending());
  try {
    if (!category) throw new Error('No form data provided');
    const { data } = await axios.post(`/api/categories/${category._id}`, category);
    dispatch(postCategorySuccess(data));
  } catch (error) {
    dispatch(postCategoryFailed(error.message));
  }
};

export const deleteCategory = (
  categoryid: string,
) => async (dispatch: AppDispatch): Promise<void> => {
  dispatch(removeCategoryPending());
  dispatch(postBoardPending());
  try {
    const { data } = await axios.delete(`/api/categories/${categoryid}`);
    dispatch(removeCategorySuccess(data.category));
    dispatch(postBoardSuccess(data.board));
  } catch (error) {
    const { data } = error.response;
    dispatch(removeCategoryFailed(data));
  }
};
