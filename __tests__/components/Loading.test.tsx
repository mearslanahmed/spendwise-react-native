import React from 'react';
import { render } from '@testing-library/react-native';
import Loading from '../../components/Loading';
import { useTheme } from '@/contexts/themeContext';

jest.mock('@/contexts/themeContext', () => ({
  useTheme: jest.fn(),
}));

describe('Loading Component', () => {
  beforeEach(() => {
    (useTheme as jest.Mock).mockReturnValue({
      colors: { primary: '#FF0000' },
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly with default props', async () => {
    const { getByTestId } = await render(<Loading />);
    expect(getByTestId('loading-indicator')).toBeTruthy();
  });
});
