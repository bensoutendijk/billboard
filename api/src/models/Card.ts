import mongoose from 'mongoose';

export interface Card extends mongoose.Document {
  title: string;
  description?: string;
  createdOn: Date;
  updatedOn: Date;
  categoryid: string;
  boardid: string;
  archived: boolean;
}

const cardSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: false },
  createdOn: { type: Date, required: true },
  updatedOn: { type: Date, required: true },
  categoryid: { type: String, required: true },
  boardid: { type: String, required: true },
  archived: { type: Boolean, required: true },
});

mongoose.model<Card>('Card', cardSchema);
export default Card;

export type CardUpdateProperties = 'title' | 'description'| 'categoryid' | 'updatedOn';