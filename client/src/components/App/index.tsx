import React, { useEffect, useState } from 'react';
import { Switch, Route, Redirect } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';

import { fetchUser } from '../../store/auth/actions';

import Loading from './Loading';
import Header from '../Header';
import Boards from '../Boards';
import LogIn from '../LogIn';
import SignUp from '../SignUp';

import './App.scss';
import { RootState } from '../../store';
import ViewSourceButton from './ViewSourceButton';

function App() {
  const [ready, setReady] = useState(false);
  const dispatch = useDispatch();

  const auth = useSelector((state: RootState) => state.auth);


  useEffect(() => {
    const getAuth = async () => {
      await dispatch(fetchUser());
    };

    getAuth().then(() => setReady(true));
  }, [dispatch]);

  if (!ready) {
    return (
      <Loading />
    );
  }

  return (
    <div className="App">
      <Header />
      {auth.fetched ? (
        <Switch>
          <Route path="/boards" component={Boards} />
          <Route path="/cards" component={Boards} />
          <Redirect to="/boards" />
        </Switch>
      ) : (
        <Switch>
          <Route exact path="/login" component={LogIn} />
          <Route exact path="/signup" component={SignUp} />
          <Redirect to="/login" />
        </Switch>
      )}
      <ViewSourceButton />
    </div>
  );
}

export default App;