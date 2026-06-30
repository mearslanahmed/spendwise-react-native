import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import Input from '../../components/Input';
import { Text } from 'react-native';

jest.mock('@/contexts/themeContext', () => ({
  useTheme: () => ({
    colors: {
      inputBg: '#ffffff',
      border: '#dddddd',
      text: '#000000',
      textLighter: '#888888',
    },
  }),
}));

// Mock phosphor-react-native
jest.mock('phosphor-react-native', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    Eye: () => <Text testID="eye-icon" />,
    EyeSlash: () => <Text testID="eye-slash-icon" />,
  };
});

describe('Input Component', () => {
  it('renders correctly with placeholder', async () => {
    const { getByPlaceholderText } = await render(
      <Input placeholder="Enter text" />
    );
    expect(getByPlaceholderText('Enter text')).toBeTruthy();
  });

  it('renders with an icon if provided', async () => {
    const { getByTestId } = await render(
      <Input placeholder="Search" icon={<Text testID="custom-icon" />} />
    );
    expect(getByTestId('custom-icon')).toBeTruthy();
  });

  it('handles secure text entry and toggles visibility', async () => {
    const { getByPlaceholderText, getByTestId, queryByTestId } = await render(
      <Input placeholder="Password" secureTextEntry={true} />
    );
    
    const input = getByPlaceholderText('Password');
    expect(input.props.secureTextEntry).toBe(true);
    
    // Initially should show the EyeSlashIcon (because it's secure, so we can reveal it)
    expect(getByTestId('eye-slash-icon')).toBeTruthy();

    const toggleButton = getByTestId('toggle-password-button');

    // Toggle
    fireEvent.press(toggleButton);

    // After toggle, should show EyeIcon
    await waitFor(() => {
      expect(getByTestId('eye-icon')).toBeTruthy();
      expect(queryByTestId('eye-slash-icon')).toBeNull();
      // Secure text entry should now be false
      expect(input.props.secureTextEntry).toBe(false);
    });

    // Toggle back
    fireEvent.press(toggleButton);

    // Should be secure again
    await waitFor(() => {
      expect(getByTestId('eye-slash-icon')).toBeTruthy();
      expect(input.props.secureTextEntry).toBe(true);
    });
  });

  it('calls onChangeText when text changes', async () => {
    const mockOnChange = jest.fn();
    const { getByPlaceholderText } = await render(
      <Input placeholder="Enter text" onChangeText={mockOnChange} />
    );

    const input = getByPlaceholderText('Enter text');
    fireEvent.changeText(input, 'hello');
    expect(mockOnChange).toHaveBeenCalledWith('hello');
  });
});
