import path from 'path';
import express from 'express';
import http from 'http';
import cors from 'cors';
import mongoose from 'mongoose';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import passport from 'passport';

// Load Environment Variables
require('dotenv').config(path.resolve(__dirname, '../.env'));

// Connect to Database
if (typeof process.env.MONGO_URI === 'undefined') {
  throw new Error('MONGO_URI is undefined');
}

mongoose.Promise = global.Promise;
mongoose
  .connect(
    process.env.MONGO_URI,
    { useNewUrlParser: true },
  )
  .then(onDatabaseConnect);
require('./models/LocalUser');
require('./models/OAuthUser');
require('./models/Card');
require('./models/Board');
require('./models/Category');
require('./services/passport');

// Create express app
import routes from './routes';
import LocalUser from './models/LocalUser';
const app = express();

app.use(cookieParser());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cors());
app.use(passport.initialize());
app.use(passport.session());
app.use(routes);

const server = http.createServer(app);

const PORT = process.env.EXPRESS_PORT || 5000;
server.listen(PORT, () => {
  console.log('Listening on port ', PORT);
});


async function onDatabaseConnect(): Promise<void> {
  console.log('MongoDB Connected');

  const LocalUser = mongoose.model<LocalUser>('LocalUser');

  const demoUser = {
    email: 'demo@soutendijk.org',
    password: 'd!p#wT7w%OksA8sN5w',
  };

  const existingUser = await LocalUser.findOne({ email: demoUser.email });

  if (!existingUser) {
    const finalUser = new LocalUser(demoUser);
    finalUser.setPassword(demoUser.password);
    // Create demo user
    finalUser.save()
      .then(() => {
        console.log('Demo user created');
      })
      .catch((error) => {
        console.error('Error creating test user:', error);
      });
  }
}