import mongoose from 'mongoose';
import passport from 'passport';
import express, { Request, Response } from 'express';

import auth from '../../../auth';
import { LocalUser } from '../../../models/LocalUser';
import { OAuthUserModel } from '../../../models/OAuthUser';

const router = express.Router();
const LocalUser = mongoose.model<LocalUser>('LocalUser');
const OAuthUser = mongoose.model<OAuthUserModel>('OAuthUser');

const oauthScopes = [
  'chat:connect',
  'chat:view_deleted',
  'channel:analytics:self',
  'channel:details:self',
  'user:details:self',
  'user:analytics:self',
];

const createUser = async (oauthUser: OAuthUserModel, localUser: LocalUser) => {
  const finalUser = new OAuthUser({
    data: {
      username: oauthUser.data.username,
      userid: oauthUser._id,
    },
    tokens: {
      accessToken: oauthUser.tokens.accessToken,
      refreshToken: oauthUser.tokens.refreshToken,
      expiresAt: Date.now() + 1000 * 60 * 60 * 24 * 365,
    },
    provider: oauthUser.provider,
  });

  localUser.services.push(finalUser._id);

  try {
    await finalUser.save();
    await localUser.save();
  } catch (err) {
    console.log(err);
  }
};

const updateUser = async (oauthUser: OAuthUserModel, finalUser: OAuthUserModel) => {
  Object.assign(finalUser, oauthUser);

  try {
    await finalUser.save();
  } catch (err) {
    console.log(err);
  }
};

router.get('/login', 
  ...auth.required, 
  passport.authenticate('google', {
    scope: oauthScopes,
  }));

router.get('/callback',
  ...auth.required,
  passport.authenticate('google', { failureRedirect: '/login' }), async (req: Request, res: Response) => {
    const { user } = req;

    const localUser = await LocalUser.findOne({ id: user._id });
    const finalUser = await OAuthUser.findOne({ "user.userid": user._id }) as OAuthUserModel;

    if (localUser === null) {
      throw new Error('user not found');
    }

    if (finalUser === null) {
      throw new Error('user not found');
    }

    if (finalUser) {
      updateUser(user, finalUser);
    } else {
      createUser(user, localUser);
    }

    // Successful authentication, redirect home.
    return res.redirect('/');
  });

router.get('/current', ...auth.required, async (req: Request, res: Response) => {
  const { user } = req;

  if (user) {
    return res.send(user);
  }

  return res.sendStatus(400);
});

export default router;
