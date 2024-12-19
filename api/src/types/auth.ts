export interface JWTPayload {
  sub: string; // user ID
  role: string; // user role
  email: string; // user email
  iat: number; // issued at
  exp: number; // expiration
}
