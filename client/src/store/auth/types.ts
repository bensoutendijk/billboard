export const REQUEST_AUTH = 'REQUEST_AUTH';
export const RECIEVE_AUTH = 'RECIEVE_AUTH';
export const REJECT_AUTH = 'REJECT_AUTH';

export type AuthError = {
  email?: string;
  password?: string;
  passwordConfirmation?: string;
  authentication?: string;
};

export type AuthPermission = 'admin' | 'tester' | 'default';
export type AuthService = 'mixer' | 'twitch' | 'instagram' | 'facebook' | 'twitter';

export interface UsersState {
  fetched: boolean;
  fetching: boolean;
  data?: LocalUser;
  error?: AuthError;
}

export interface LocalUser {
  _id: any;
  email: string;
  permissions: AuthPermission[];
  services: AuthService[];
}

export interface UserCredentials {
  email: string;
  password: string;
  passwordConfirmation?: string;
}

interface RequestAuth {
  type: typeof REQUEST_AUTH;
}

interface RecieveAuth {
  type: typeof RECIEVE_AUTH;
  payload: LocalUser;
}

interface RejectAuth {
  type: typeof REJECT_AUTH;
  payload: AuthError;
}

export type AuthActionTypes = (
  RequestAuth |
  RecieveAuth |
  RejectAuth
);