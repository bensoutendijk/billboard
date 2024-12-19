import axios from "axios";

import { createAction } from "@reduxjs/toolkit";

import { AppDispatch } from "..";
import { postCategorySuccess } from "../categories/actions";
import { Card, CardForm, CardsError } from "./types";

export const createCardPending = createAction("CREATE_CARD_PENDING");
export const createCardSuccess = createAction<Card>("CREATE_CARD_SUCCESS");
export const createCardFailed = createAction<CardsError>("CREATE_CARD_FAILED");

export const requestCards = createAction("REQUEST_CARDS");
export const receiveCards = createAction<Card[]>("RECEIVE_CARDS");
export const rejectCards = createAction<CardsError>("REJECT_CARDS");

export const getCardPending = createAction("GET_CARD_PENDING");
export const getCardSuccess = createAction<Card>("GET_CARD_SUCCESS");
export const getCardFailed = createAction<CardsError>("GET_CARD_FAILED");

export const postCardPending = createAction("POST_CARD_PENDING");
export const postCardSuccess = createAction<Card>("POST_CARD_SUCCESS");
export const postCardFailed = createAction<CardsError>("POST_CARD_FAILED");

export const removeCardPending = createAction("REMOVE_CARD_PENDING");
export const removeCardSuccess = createAction<string>("REMOVE_CARD_SUCCESS");
export const removeCardFailed = createAction<CardsError>("REMOVE_CARD_FAILED");

export const updateCardForm = createAction<CardForm>("UPDATE_CARD_FORM");

export const createCard =
  (formData: CardForm) =>
  async (dispatch: AppDispatch): Promise<void> => {
    dispatch(createCardPending());
    try {
      if (!formData) throw new Error("No form data prodived");
      const { data } = await axios.post("/api/cards", formData);
      dispatch(createCardSuccess(data.card));
      dispatch(postCategorySuccess(data.category));
    } catch (error) {
      dispatch(createCardFailed(error.message));
    }
  };

export const fetchCard =
  (cardid: string) =>
  async (dispatch: AppDispatch): Promise<void> => {
    dispatch(getCardPending());
    try {
      if (!cardid) throw new Error("No card ID provided");
      const { data } = await axios.get<Card>(`/api/cards/${cardid}`);
      dispatch(getCardSuccess(data));
    } catch (error) {
      dispatch(getCardFailed(error.message));
    }
  };

export const updateCard =
  (card: CardForm) =>
  async (dispatch: AppDispatch): Promise<void> => {
    dispatch(postCardPending());
    try {
      if (!card) throw new Error("No form data provided");
      const { data } = await axios.post(`/api/cards/${card.id}`, card);
      dispatch(postCardSuccess(data));
    } catch (error) {
      dispatch(postCardFailed(error.message));
    }
  };

export const deleteCard =
  (cardid: string) =>
  async (dispatch: AppDispatch): Promise<void> => {
    dispatch(removeCardPending());
    try {
      const { data } = await axios.delete(`/api/cards/${cardid}`);
      dispatch(removeCardSuccess(data.card.id));
      dispatch(postCategorySuccess(data.category));
    } catch (error) {
      const { data } = error.response;
      dispatch(removeCardFailed(data));
    }
  };
