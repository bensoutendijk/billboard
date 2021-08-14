import { combineReducers, configureStore } from '@reduxjs/toolkit';
import reduxLogger from 'redux-logger';
import reduxThunk from 'redux-thunk';

import authReducer from './auth/reducers';
import boardsReducer from './boards/reducers';
import categoriesReducer from './categories/reducers';
import cardsReducer from './cards/reducers';

const rootReducer = combineReducers({
  auth: authReducer,
  boards: boardsReducer,
  categories: categoriesReducer,
  cards: cardsReducer,
});

const store = configureStore({
  reducer: rootReducer,
  middleware: [reduxThunk, reduxLogger as any],
});


export type AppDispatch = typeof store.dispatch;

export type RootState = ReturnType<typeof rootReducer>;

export default store;
