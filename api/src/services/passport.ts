import mongoose from 'mongoose';
import passport from 'passport';
import * as passportLocal from 'passport-local';
import * as passportGoogle from 'passport-google-oauth';
import { LocalUser } from '../models/LocalUser';

if (typeof process.env.GOOGLE_CLIENT_ID === 'undefined') {
  throw new Error('GOOGLE_CLIENT_ID is undefined');
}

if (typeof process.env.GOOGLE_CLIENT_SECRET === 'undefined') {
  throw new Error('GOOGLE_CLIENT_SECRET is undefined');
}

if (typeof process.env.GOOGLE_CALLBACK_URL === 'undefined') {
  throw new Error('GOOGLE_CALLBACK_URL is undefined');
}

const LocalUser = mongoose.model<LocalUser>('LocalUser');

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((id, done) => {
  LocalUser.findById(id, (err, user) => {
    done(err, user);
  });
});

passport.use(new passportLocal.Strategy({
  usernameField: 'email',
  passwordField: 'password',
}, async (email, password, done) => {

  try {
    const localUser: LocalUser | null = await LocalUser.findOne({ email });

    if (localUser === null) {
      throw new Error('user not found');
    }

    if (!localUser.validatePassword(password)) {
      throw new Error('password not valid');
    }

    return done(null, localUser);
  } catch (error) {
    done(null, false, { message: 'credentials invalid' });
  }
}));

passport.use(new passportGoogle.OAuth2Strategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.GOOGLE_CALLBACK_URL,
}, (accessToken, refreshToken, profile, done) => {
  const oauthUser = {
    _id: profile.id,
    user: {
      username: profile.username,
      userid: profile.id,
    },
    tokens: {
      accessToken,
      refreshToken,
      expiresAt: Date.now() + 1000 * 60 * 60 * 24 * 30,
    },
    provider: profile.provider,
  };

  return done(null, oauthUser);
}));
