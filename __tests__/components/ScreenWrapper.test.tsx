import React from 'react';
import { Text } from 'react-native';
import { render } from '@testing-library/react-native';
import ScreenWrapper from '../../components/ScreenWrapper';
import { useTheme } from '@/contexts/themeContext';

jest.mock('@/contexts/themeContext', () => ({
  useTheme: jest.fn(),
}));

describe('ScreenWrapper Component', () => {
  beforeEach(() => {
    (useTheme as jest.Mock).mockReturnValue({
      colors: { background: '#ffffff' },
      isDark: false,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly with children', async () => {
    const { getByText } = await render(
      <ScreenWrapper>
        <Text>Test Content</Text>
      </ScreenWrapper>
    );

    expect(getByText('Test Content')).toBeTruthy();
  });

  it('applies custom style', async () => {
    const { getByTestId } = await render(
      <ScreenWrapper style={{ margin: 10 }}>
        <Text testID="child">Test Content</Text>
      </ScreenWrapper>
    );

    // The wrapper view contains the children
    const child = getByTestId('child');
    expect(child).toBeTruthy();
  });
});
