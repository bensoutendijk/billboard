export type CardsState = {
  fetched: boolean;
  fetching: boolean;
  error: CardsError;
  allIds: string[];
  byId: Partial<{
    [key: string]: Card;
  }>;
  form: Partial<{
    [key: string]: CardForm;
  }>;
};

export type CardsError = string;

export interface Card {
  id: string;
  title: string;
  categoryid: string;
  boardid: string;
  createdOn: Date;
  updatedOn: Date;
  archived: boolean;
}

export type CardForm = Pick<Card, "id" | "title" | "categoryid">;
