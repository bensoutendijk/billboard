export type CategoriesState = {
  fetched: boolean;
  fetching: boolean;
  error: CategoriesError;
  allIds: string[];
  byId: Partial<{
    [key: string]: Category;
  }>;
  form: Partial<{
    [key: string]: CategoryForm;
  }>;
};

export type CategoriesError = string;

export interface Category {
  id: string;
  title: string;
  cards: string[];
  createdOn: Date;
  updatedOn: Date;
  boardid: string;
  archived: boolean;
}

export type CategoryForm = Pick<Category, "id" | "title" | "cards">;
