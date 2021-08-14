import jwt, { GetTokenCallback } from 'express-jwt';
import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';

if (typeof process.env.JWT_SECRET_HTTP === 'undefined') {
  throw new Error('JWT_SECRET_HTTP is undefined');
}

if (typeof process.env.JWT_SECRET === 'undefined') {
  throw new Error('JWT_SECRET is undefined');
}

const handleErrorMiddleware: ErrorRequestHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  if (err.name === 'UnauthorizedError' ) {
    return res.status(err.status).send(err.inner);
  }

  return next();
};

const getHttpOnlyToken: GetTokenCallback = (req) => {
  const { httpOnlyToken } = req.cookies;
  if (httpOnlyToken && httpOnlyToken.split(' ')[0] === 'Token') {
    return httpOnlyToken.split(' ')[1];
  }
  return null;
};

const getToken: GetTokenCallback = (req) => {
  const { token } = req.cookies;
  if (token && token.split(' ')[0] === 'Token') {
    return token.split(' ')[1];
  }
  return null;
};

const auth = {
  required: [
    jwt({
      secret: process.env.JWT_SECRET_HTTP,
      userProperty: 'user',
      getToken: getHttpOnlyToken,
    }),
    jwt({
      secret: process.env.JWT_SECRET,
      userProperty: 'user',
      getToken,
    }),
    handleErrorMiddleware,
  ],
  optional: [
    jwt({
      secret: process.env.JWT_SECRET_HTTP,
      userProperty: 'user',
      getToken: getHttpOnlyToken,
      credentialsRequired: false,
    }),
    jwt({
      secret: process.env.JWT_SECRET,
      userProperty: 'user',
      getToken,
      credentialsRequired: false,
    }),
    handleErrorMiddleware,
  ],
};

export default auth;
