import React from 'react';
import { render } from '@testing-library/react';
import LogIn from '.';

test('LogIn form fields render', () => {
  const logInElement = render(<LogIn />);
  expect(logInElement);
});
