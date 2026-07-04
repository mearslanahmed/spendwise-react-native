import React from 'react';
import { Text } from 'react-native';
import { render } from '@testing-library/react-native';
import Header from '../../components/Header';

jest.mock('@/contexts/themeContext', () => ({
  useTheme: () => ({
    colors: { text: '#000', background: '#fff' },
    isDark: false,
  })
}));

describe('Header Component', () => {
  it('renders correctly with title', async () => {
    const { getByText } = await render(<Header title="Dashboard" />);
    expect(getByText('Dashboard')).toBeTruthy();
  });

  it('renders left icon when provided', async () => {
    const { getByTestId } = await render(
      <Header title="" leftIcon={<Text testID="left-icon">Left</Text>} />
    );
    expect(getByTestId('left-icon')).toBeTruthy();
  });

  it('renders right icon when provided', async () => {
    const { getByTestId } = await render(
      <Header title="" rightIcon={<Text testID="right-icon">Right</Text>} />
    );
    expect(getByTestId('right-icon')).toBeTruthy();
  });

  it('renders title, left icon, and right icon together', async () => {
    const { getByText, getByTestId } = await render(
      <Header 
        title="Settings" 
        leftIcon={<Text testID="left-icon">Left</Text>} 
        rightIcon={<Text testID="right-icon">Right</Text>} 
      />
    );
    
    expect(getByText('Settings')).toBeTruthy();
    expect(getByTestId('left-icon')).toBeTruthy();
    expect(getByTestId('right-icon')).toBeTruthy();
  });
});
