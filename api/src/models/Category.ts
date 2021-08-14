import mongoose from 'mongoose';

export interface Category extends mongoose.Document {
  title: string;
  cards: string[];
  createdOn: Date;
  updatedOn: Date;
  boardid: string;
  archived: boolean;
}

const categorySchema = new mongoose.Schema({
  title: { type: String, required: true },
  cards: { type: [String], required: true },
  createdOn: { type: Date, required: true },
  updatedOn: { type: Date, required: true },
  boardid: { type: String, required: true },
  archived: { type: Boolean, required: true },
});

mongoose.model<Category>('Category', categorySchema);
export default Category;

export type CategoryUpdateProperties = 'title' | 'updatedOn';