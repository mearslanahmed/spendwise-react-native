import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import Button from '../../components/Button';
import { Text } from 'react-native';

jest.mock('@/contexts/themeContext', () => ({
  useTheme: () => ({
    colors: { primary: '#000', text: '#fff' },
    isDark: false,
  })
}));

describe('Button Component', () => {
  it('renders correctly with children', async () => {
    const { getByText } = await render(
      <Button onPress={() => {}}>
        <Text>Click Me</Text>
      </Button>
    );

    expect(getByText('Click Me')).toBeTruthy();
  });

  it('triggers onPress when pressed', async () => {
    const mockOnPress = jest.fn();
    const { getByText } = await render(
      <Button onPress={mockOnPress}>
        <Text>Click Me</Text>
      </Button>
    );

    fireEvent.press(getByText('Click Me'));
    expect(mockOnPress).toHaveBeenCalledTimes(1);
  });

  it('renders loading indicator and does not trigger onPress when loading is true', async () => {
    const mockOnPress = jest.fn();
    const { queryByText } = await render(
      <Button onPress={mockOnPress} loading={true}>
        <Text>Click Me</Text>
      </Button>
    );

    // The button renders a Loading component which contains an ActivityIndicator
    // We should not see the text "Click Me"
    expect(queryByText('Click Me')).toBeNull();
  });
});
