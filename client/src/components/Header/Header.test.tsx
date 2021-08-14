import React from 'react';
import { render } from '@testing-library/react';
import Header from '.';

test('renders brand', () => {
  const headerElement = render(<Header />);
  const brandElement = headerElement.getByText('React-Starter');
  expect(brandElement).toBeInTheDocument();
});
