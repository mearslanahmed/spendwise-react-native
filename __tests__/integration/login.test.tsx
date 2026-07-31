import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import Login from '../../app/(auth)/login';
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
    Eye: () => <Text testID="mock-eye-icon" />,
    EyeSlash: () => <Text testID="mock-eye-slash-icon" />,
    CaretLeft: () => <Text testID="mock-caret-left" />,
    GoogleLogo: () => <Text testID="mock-google-logo" />,
  };
});

describe('Login Screen Integration Tests', () => {
  let mockLogin: jest.Mock;
  let mockPush: jest.Mock;
  let mockNavigate: jest.Mock;

  beforeEach(() => {
    mockLogin = jest.fn();
    mockPush = jest.fn();
    mockNavigate = jest.fn();

    (useAuth as jest.Mock).mockReturnValue({
      login: mockLogin,
      loginWithGoogle: jest.fn(),
      user: null,
    });

    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
      navigate: mockNavigate,
      back: jest.fn(),
    });

    (Toast.show as jest.Mock).mockClear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('shows error toast if fields are empty', async () => {
    const { getByText } = await render(<Login />);
    
    fireEvent.press(getByText('Login'));
    
    await waitFor(() => {
      expect(Toast.show).toHaveBeenCalledWith(expect.objectContaining({
        type: 'error',
        text2: 'Please fill all the fields'
      }));
    });
    await new Promise(r => setTimeout(r, 0));
  });

  it('shows error toast for invalid email', async () => {
    const { getByText, getByPlaceholderText } = await render(<Login />);
    
    fireEvent.changeText(getByPlaceholderText('Enter your email'), 'invalid-email');
    fireEvent.changeText(getByPlaceholderText('Enter your password'), 'password123');
    
    fireEvent.press(getByText('Login'));
    
    await waitFor(() => {
      expect(Toast.show).toHaveBeenCalledWith(expect.objectContaining({
        type: 'error',
        text2: 'Please enter a valid email address'
      }));
    });
    await new Promise(r => setTimeout(r, 0));
  });

  it.skip('calls login service with valid credentials and handles failure', async () => {
    mockLogin.mockResolvedValue({ success: false, msg: 'Invalid credentials' });
    const { getByText, getByPlaceholderText } = await render(<Login />);
    
    fireEvent.changeText(getByPlaceholderText('Enter your email'), 'test@example.com');
    fireEvent.changeText(getByPlaceholderText('Enter your password'), 'password123');
    
    fireEvent.press(getByText('Login'));
    
    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password123');
      expect(Toast.show).toHaveBeenCalledWith(expect.objectContaining({
        type: 'error',
        text2: 'Invalid credentials'
      }));
    });
    await waitFor(() => {
      expect(getByText('Login')).toBeTruthy();
    });
    await new Promise(r => setTimeout(r, 0));
  });

  it.skip('calls login service with valid credentials successfully', async () => {
    mockLogin.mockResolvedValue({ success: true });
    const { getByText, getByPlaceholderText } = await render(<Login />);
    
    fireEvent.changeText(getByPlaceholderText('Enter your email'), 'test@example.com');
    fireEvent.changeText(getByPlaceholderText('Enter your password'), 'password123');
    
    fireEvent.press(getByText('Login'));
    
    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password123');
    });
    
    // In success case, no toast is shown for login failure
    expect(Toast.show).not.toHaveBeenCalledWith(expect.objectContaining({
      type: 'error'
    }));
    
    // Wait for loading state to finish
    await waitFor(() => {
      expect(getByText('Login')).toBeTruthy();
    });
    await new Promise(r => setTimeout(r, 0));
  });
});
