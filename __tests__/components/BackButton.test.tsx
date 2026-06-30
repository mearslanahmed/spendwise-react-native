import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import BackButton from '../../components/BackButton';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/themeContext';

jest.mock('expo-router', () => ({
  useRouter: jest.fn(),
}));

jest.mock('@/contexts/themeContext', () => ({
  useTheme: jest.fn(),
}));

jest.mock('phosphor-react-native', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return new Proxy({}, {
    get: function() {
      return () => <Text testID="mock-icon" />;
    }
  });
});

describe('BackButton Component', () => {
  beforeEach(() => {
    (useTheme as jest.Mock).mockReturnValue({
      colors: { text: '#000', inputBg: '#111' },
    });
    (useRouter as jest.Mock).mockReturnValue({ back: jest.fn() });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly', async () => {
    const { getByTestId } = await render(<BackButton />);
    expect(getByTestId('mock-icon')).toBeTruthy();
  });

  it('calls router.back when pressed', async () => {
    const mockBack = jest.fn();
    (useRouter as jest.Mock).mockReturnValue({ back: mockBack });

    const { getByTestId } = await render(<BackButton />);
    
    // We mocked the icon inside the button, but we need to press the button.
    // The touchable opacity wraps the icon. We can use getByTestId on a view if we add it,
    // or just fire event on the icon since it bubbles up.
    fireEvent.press(getByTestId('mock-icon'));
    
    expect(mockBack).toHaveBeenCalled();
  });
});
