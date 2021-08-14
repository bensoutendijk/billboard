import React from 'react';
import { render } from '@testing-library/react';
import SignUp from '.';

test('SignUp form fields render', () => {
  const element = render(<SignUp />);
  expect(element);
});
