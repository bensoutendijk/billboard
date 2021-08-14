import React from 'react';
import { render } from '@testing-library/react';
import Todos from '.';

test('app', () => {
  const element = render(<Todos />);
  expect(element);
});
