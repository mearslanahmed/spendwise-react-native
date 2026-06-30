import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import Welcome from '../../app/(auth)/welcome';
import { useRouter } from 'expo-router';

jest.mock('expo-router', () => ({
  useRouter: jest.fn(),
}));
jest.mock('@/contexts/themeContext', () => ({
  useTheme: () => ({
    colors: {
      text: '#000000',
      primary: '#0000ff'
    },
  }),
}));

describe('Welcome Screen Integration Tests', () => {
  let mockPush: jest.Mock;

  beforeEach(() => {
    mockPush = jest.fn();

    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
      navigate: jest.fn(),
    });
  });

  it('renders correctly', async () => {
    const { getByText } = await render(<Welcome />);
    
    expect(getByText(/Take control/i)).toBeTruthy();
    expect(getByText(/Sign in/i)).toBeTruthy();
    expect(getByText(/Get Started/i)).toBeTruthy();
  });

  it('navigates to login when sign in is pressed', async () => {
    const { getByText } = await render(<Welcome />);
    
    fireEvent.press(getByText(/Sign in/i));
    
    expect(mockPush).toHaveBeenCalledWith('/(auth)/login');
  });

  it('navigates to register when sign up is pressed', async () => {
    const { getByText } = await render(<Welcome />);
    
    fireEvent.press(getByText(/Get Started/i));
    
    expect(mockPush).toHaveBeenCalledWith('/(auth)/register');
  });
});
