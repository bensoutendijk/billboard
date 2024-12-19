import { Card } from "../cards/types";
import { Category } from "../categories/types";

export type BoardsState = {
  fetched: boolean;
  fetching: boolean;
  error: BoardsError;
  allIds: string[];
  byId: Partial<{
    [key: string]: Board;
  }>;
  form: Partial<{
    [key: string]: BoardForm;
  }>;
  selected?: string;
};

export type BoardsError = string;

export interface Board {
  id: string;
  title: string;
  createdOn: Date;
  updatedOn: Date;
  members: {
    id: string;
    scopes: string[];
  }[];
  categories: string[];
  archived: boolean;
}

export interface BoardComplete {
  board: Board;
  categories: Category[];
  cards: Card[];
}

export type BoardForm = Pick<Board, "id" | "title" | "categories">;
