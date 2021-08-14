import React, { useState } from 'react';
import { Redirect } from 'react-router';

import Jumbotron from 'react-bootstrap/Jumbotron';
import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button';

import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../store';
import { login } from '../../store/auth/actions';

import './LogIn.scss';

function LogIn() {
  const dispatch = useDispatch();

  const auth = useSelector((state: RootState) => state.auth);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>): void => {
    document.cookie = 'token=;';
    document.cookie = 'httpOnlyToken=;';

    event.preventDefault();
    const user = {
      email,
      password,
    };
    dispatch(login(user));
  };

  const loginDemoUser = (event: React.MouseEvent): void => {
    event.preventDefault();

    const user = {
      email: 'demo@soutendijk.org',
      password: 'd!p#wT7w%OksA8sN5w',
    };
    dispatch(login(user));
  };

  if (auth.fetched) return (
    <Redirect to="/"/>
  );

  return (
    <div className="LogIn">
      <Jumbotron className="bg-dark text-light">
        {auth?.error?.authentication ? (
          <div className="alert alert-danger" role="alert">
            {auth?.error?.authentication}
          </div>
        ) : (
          null
        )}
        <h1>Log In</h1>
        <div className="one-click-logins">
          <button className="btn btn-primary" onClick={loginDemoUser}>Try the Demo</button>
        </div>
        <Form onSubmit={handleSubmit}>
          <Form.Group>
            <Form.Label>Email address</Form.Label>
            <Form.Control
              type="email"
              placeholder="Email"
              onChange={(e) => setEmail(e.target.value)}
              value={email}
              isInvalid={!!auth?.error?.email}
            />
            {auth?.error?.email ? (
              <Form.Text className="text-danger">
                Email {auth.error.email}
              </Form.Text>
            ) : (
              null
            )}
          </Form.Group>
          <Form.Group>
            <Form.Label>Password</Form.Label>
            <Form.Control type="password"
              placeholder="Password"
              onChange={(e) => setPassword(e.target.value)}
              value={password}
              isInvalid={!!auth?.error?.password}
            />
            {auth?.error?.password ? (
              <Form.Text className="text-danger">
                Password {auth.error.password}
              </Form.Text>
            ) : (
              null
            )}
          </Form.Group>
          <Button variant="primary" type="submit">
            Log In
          </Button>
        </Form>
      </Jumbotron>
    </div>
  );
}

export default LogIn;
