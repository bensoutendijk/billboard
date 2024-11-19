import mongoose, { Document } from 'mongoose';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

export interface LocalUser extends Document {
  email: string;
  permissions: string[];
  services: string[];
  hash: string;
  salt: string;
  setPassword: (password: string) => void;
  validatePassword: (password: string) => boolean;
  generateHttpOnlyJWT: () => string;
  generateJWT: () => string;
}

const LocalUserSchema = new mongoose.Schema({
  email: String,
  permissions: [String],
  services: [String],
  hash: String,
  salt: String,
});

LocalUserSchema.methods.setPassword = function(password: string): void {
  this.salt = crypto.randomBytes(16).toString('hex');
  this.hash = crypto.pbkdf2Sync(password, this.salt, 10000, 512, 'sha512').toString('hex');
};

LocalUserSchema.methods.validatePassword = function(password: string): boolean {
  const hash = crypto.pbkdf2Sync(password, this.salt, 10000, 512, 'sha512').toString('hex');
  return this.hash === hash;
};

LocalUserSchema.methods.generateJWT = function(): string {
  return jwt.sign({
    email: this.email,
    id: this._id,
  }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

LocalUserSchema.methods.generateHttpOnlyJWT = function(): string {
  return jwt.sign({
    email: this.email,
    id: this._id,
  }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

LocalUserSchema.methods.toJSON = function(): any {
  return {
    _id: this._id,
    email: this.email,
    permissions: this.permissions,
    services: this.services,
  };
};

mongoose.model<LocalUser>('LocalUser', LocalUserSchema);
