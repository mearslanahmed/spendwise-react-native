import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import TransactionList from '../../components/TransactionList';
import { useRouter } from 'expo-router';

// Mock expo router
jest.mock('expo-router', () => ({
  useRouter: jest.fn(),
}));

jest.mock('@/contexts/authContext', () => ({
  useAuth: () => ({ user: { uid: '123' } }),
}));

jest.mock('@/contexts/themeContext', () => ({
  useTheme: () => ({
    colors: { text: '#000', textLight: '#333' },
    isDark: false,
  }),
}));

// Mock phosphor-react-native to prevent errors
jest.mock('phosphor-react-native', () => {
  const { Text } = require('react-native');
  return new Proxy({}, {
    get: function() {
      return () => <Text testID="mock-icon" />;
    }
  });
});

// Mock FlashList
jest.mock('@shopify/flash-list', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    FlashList: ({ data, renderItem, ListEmptyComponent }: any) => {
      if (!data || data.length === 0) {
        return React.isValidElement(ListEmptyComponent) ? ListEmptyComponent : (ListEmptyComponent ? <ListEmptyComponent /> : <View />);
      }
      return (
        <View>
          {data.map((item: any, index: number) => (
            <View key={index}>{renderItem({ item, index })}</View>
          ))}
        </View>
      );
    },
  };
});

describe('TransactionList Component', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state when loading is true', async () => {
    const { getByTestId } = await render(<TransactionList title="Test" data={[]} loading={true} />);
    // Loading component uses ActivityIndicator, we can check for it
    expect(getByTestId('loading-indicator')).toBeTruthy();
  });

  it('renders empty list message when data is empty and not loading', async () => {
    const { getByText } = await render(
      <TransactionList title="Test" data={[]} loading={false} emptyListMessage="No transactions found" />
    );
    expect(getByText('No transactions found')).toBeTruthy();
  });

  it('renders transactions list', async () => {
    const mockData = [
      { id: '1', category: 'food', amount: 50, date: { seconds: 1000 }, type: 'expense' },
      { id: '2', category: 'salary', amount: 2000, date: { seconds: 2000 }, type: 'income' },
    ];
    const { getByText } = await render(<TransactionList title="Test" data={mockData as any} loading={false} />);
    
    // Check amounts
    expect(getByText('- $50')).toBeTruthy();
    expect(getByText('+ $2000')).toBeTruthy();
  });

  it('navigates to transaction modal when item is clicked', async () => {
    const mockPush = jest.fn();
    (useRouter as jest.Mock).mockReturnValue({ push: mockPush });

    const mockData = [
      { id: '1', category: 'food', amount: 50, date: { seconds: 1000 }, type: 'expense' }
    ];
    const { getByText } = await render(<TransactionList title="Test" data={mockData as any} loading={false} />);
    
    fireEvent.press(getByText('Others'));
    
    expect(mockPush).toHaveBeenCalledWith(
      expect.objectContaining({ pathname: '/(modals)/transactionModal' })
    );
  });
});
