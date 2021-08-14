import mongoose, { Schema, Document } from 'mongoose';

export interface OAuthUserModel extends Document {
  data?: any;
  localUser: string;
  tokens: {
    accessToken: string;
    refreshToken: string;
    expiresAt: Date;
  };
  provider: string;
}

const oauthUserSchema = new Schema({
  data: {
    username: {
      type: String,
      required: true,
    },
    userid: {
      type: Number,
      required: true,
    },
  },
  tokens: {
    accessToken: {
      type: String,
      required: true,
    },
    refreshToken: {
      type: String,
      required: true,
    },
    expiresAt: {
      type: Number,
      required: true,
    },
  },
  provider: String,
}, { timestamps: true });

mongoose.model<OAuthUserModel>('OAuthUser', oauthUserSchema);
