import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import Register from '../../app/(auth)/register';
import { useAuth } from '@/contexts/authContext';
import { useRouter } from 'expo-router';
import Toast from 'react-native-toast-message';

jest.mock('@/contexts/authContext');
jest.mock('expo-router', () => ({
  useRouter: jest.fn(),
}));
jest.mock('@/contexts/themeContext', () => ({
  useTheme: () => ({
    colors: {
      inputBg: '#ffffff',
      border: '#dddddd',
      text: '#000000',
      textLighter: '#888888',
      primary: '#0000ff'
    },
  }),
}));

// Mock phosphor-react-native
jest.mock('phosphor-react-native', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    __esModule: true,
    At: () => <Text testID="mock-at-icon" />,
    Lock: () => <Text testID="mock-lock" />,
    LockIcon: () => <Text testID="mock-lock-icon" />,
    User: () => <Text testID="mock-user" />,
    UserIcon: () => <Text testID="mock-user-icon" />,
    Check: () => <Text testID="mock-check" />,
    CheckCircle: () => <Text testID="mock-check-circle" />,
    Eye: () => <Text testID="mock-eye-icon" />,
    EyeSlash: () => <Text testID="mock-eye-slash-icon" />,
    CaretLeft: () => <Text testID="mock-caret-left" />,
    GoogleLogo: () => <Text testID="mock-google-logo" />,
  };
});

describe('Register Screen Integration Tests', () => {
  let mockRegister: jest.Mock;

  beforeEach(() => {
    mockRegister = jest.fn();

    (useAuth as jest.Mock).mockReturnValue({
      register: mockRegister,
      user: null,
    });

    (useRouter as jest.Mock).mockReturnValue({
      push: jest.fn(),
      navigate: jest.fn(),
      back: jest.fn(),
    });

    (Toast.show as jest.Mock).mockClear();
  });

  it('renders correctly', async () => {
    const { getByText, getByPlaceholderText } = await render(<Register />);
    
    expect(getByText(/Sign up/i)).toBeTruthy();
    expect(getByPlaceholderText('Enter your name')).toBeTruthy();
    expect(getByPlaceholderText('Enter your email')).toBeTruthy();
    expect(getByPlaceholderText('Enter your password')).toBeTruthy();
  });

  it('shows error toast if fields are empty', async () => {
    const { getByText } = await render(<Register />);
    
    fireEvent.press(getByText(/Sign up/i));
    
    expect(Toast.show).toHaveBeenCalledWith(expect.objectContaining({
      type: 'error',
      text2: 'Please fill all the fields'
    }));
  });
});
