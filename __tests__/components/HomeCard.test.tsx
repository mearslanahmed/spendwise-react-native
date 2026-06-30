import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import HomeCard from '../../components/HomeCard';
import { useData } from '@/contexts/dataContext';
import { useAuth } from '@/contexts/authContext';

// Mock contexts
jest.mock('@/contexts/dataContext');
jest.mock('@/contexts/authContext');
jest.mock('@/contexts/themeContext', () => ({
  useTheme: () => ({
    colors: { text: '#000', textLighter: '#555', background: '#fff' },
    isDark: false,
  })
}));

jest.mock('phosphor-react-native', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require('react');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Text } = require('react-native');
  return new Proxy({}, {
    get: function() {
      return () => <Text testID="mock-icon" />;
    }
  });
});

describe('HomeCard Component', () => {
  beforeEach(() => {
    (useAuth as jest.Mock).mockReturnValue({
      user: { name: 'John Doe' },
    });

    (useData as jest.Mock).mockReturnValue({
      wallets: [
        { amount: 500, totalIncome: 1000, totalExpense: 500, created: { seconds: 100 } },
        { amount: 300, totalIncome: 400,  totalExpense: 100, created: { seconds: 200 } },
      ],
      loading: { wallets: false },
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders total balance correctly', async () => {
    const { getByText } = await render(<HomeCard />);
    expect(getByText('$800.00')).toBeTruthy();
  });

  it('renders income and expense correctly', async () => {
    const { getByText } = await render(<HomeCard />);
    expect(getByText('$1400.00')).toBeTruthy();
    expect(getByText('$600.00')).toBeTruthy();
  });

  it('toggles balance visibility when eye icon is pressed', async () => {
    const { queryByText, getByTestId, getAllByText } = await render(<HomeCard />);
    
    // Initially balances should be visible
    expect(queryByText('$800.00')).toBeTruthy();

    // Toggle hidden
    const hideButton = getByTestId('hide-balance-button'); // Assuming we add this testID or mock the icon
    fireEvent.press(hideButton);

    // After toggle, should show '••••' instead of numbers

    await waitFor(() => {
      expect(queryByText('$800.00')).toBeNull();
      const hiddenTexts = getAllByText('••••');
      expect(hiddenTexts.length).toBe(3);
    });
  });
});
