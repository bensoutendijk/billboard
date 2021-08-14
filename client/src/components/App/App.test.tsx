import React from 'react';
import { render } from '@testing-library/react';
import App from '.';

test('app', () => {
  const appElement = render(<App />);
  expect(appElement);
});
