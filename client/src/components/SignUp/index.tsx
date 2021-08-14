import React, { useState } from 'react';
import { Redirect } from 'react-router';

import Jumbotron from 'react-bootstrap/Jumbotron';
import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store';
import { createUser, login } from '../../store/auth/actions';

import './SignUp.scss';

function SignUp() {
  const dispatch = useDispatch();

  const auth = useSelector((state: RootState) => state.auth);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    const user = {
      email,
      password,
      passwordConfirmation,
    };
    dispatch(createUser(user));
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
    <div className="SignUp">
      <Jumbotron className="bg-dark text-light">
        {auth?.error?.authentication ? (
          <div className="alert alert-danger" role="alert">
            {auth?.error?.authentication}
          </div>
        ) : (
          null
        )}
        <h1>Sign Up</h1>
        <div className="one-click-logins">
          <button className="btn btn-primary" onClick={loginDemoUser}>Try the Demo</button>
        </div>
        <Form onSubmit={handleSubmit}>
          <Form.Group>
            <Form.Label>Email address</Form.Label>
            <Form.Control
              name="email"
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
            <Form.Control
              name="password"
              type="password"
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
          <Form.Group>
            <Form.Label>Confirm Password</Form.Label>
            <Form.Control
              name="passwordConfirmation"
              type="password"
              placeholder="Confirm Password"
              onChange={(e) => setPasswordConfirmation(e.target.value)}
              value={passwordConfirmation}
              isInvalid={!!auth?.error?.passwordConfirmation}
            />
            {auth?.error?.passwordConfirmation ? (
              <Form.Text className="text-danger">
                Password {auth.error.passwordConfirmation}
              </Form.Text>
            ) : (
              null
            )}
          </Form.Group>
          <Button variant="primary" type="submit">
            Sign Up
          </Button>
        </Form>
      </Jumbotron>
    </div>
  );
}

export default SignUp;
