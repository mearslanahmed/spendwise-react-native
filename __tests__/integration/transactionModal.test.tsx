import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import TransactionModal from '../../app/(modals)/transactionModal';
import { useAuth } from '@/contexts/authContext';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Toast from 'react-native-toast-message';
import * as transactionService from '@/services/transactionService';
import { useData } from '@/contexts/dataContext';

jest.mock('@/contexts/authContext');
jest.mock('@/contexts/dataContext');
jest.mock('expo-router', () => ({
  useRouter: jest.fn(),
  useLocalSearchParams: jest.fn(),
}));

jest.mock('expo-image', () => ({
  Image: () => {
    const { Text } = require('react-native');
    return <Text testID="mock-expo-image" />;
  }
}));

jest.mock('@/services/transactionService');
jest.mock('@/services/notificationService');
jest.mock('@/services/expoNotificationService');
jest.mock('@/services/aiService');

jest.mock('@/contexts/themeContext', () => ({
  useTheme: () => ({
    colors: {
      inputBg: '#ffffff',
      border: '#dddddd',
      text: '#000000',
      textLighter: '#888888',
      primary: '#0000ff'
    },
    isDark: false,
  }),
}));

// Mock phosphor-react-native
jest.mock('phosphor-react-native', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return new Proxy({}, {
    get: function(target, prop) {
      if (prop === '__esModule') return true;
      return () => <Text testID={`mock-icon-${String(prop)}`} />;
    }
  });
});

jest.mock('react-native-element-dropdown', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    Dropdown: (props: any) => {
      // Mock basic dropdown behavior
      const testID = props.placeholder || 'mock-dropdown';
      return <View testID={testID} />;
    }
  };
});

describe('TransactionModal Integration Tests', () => {
  let mockPush: jest.Mock;
  let mockBack: jest.Mock;

  beforeEach(() => {
    mockPush = jest.fn();
    mockBack = jest.fn();

    (useAuth as jest.Mock).mockReturnValue({
      user: { uid: 'test-user-id' },
    });
    
    (useData as jest.Mock).mockReturnValue({
      wallets: [{ id: 'wallet-1', name: 'Main Wallet' }],
      budgets: [],
      transactions: [],
    });

    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
      back: mockBack,
    });

    (useLocalSearchParams as jest.Mock).mockReturnValue({});
    
    (Toast.show as jest.Mock).mockClear();
    (transactionService.createOrUpdateTransaction as jest.Mock).mockClear();
    (transactionService.deleteTransaction as jest.Mock).mockClear();
  });

  it('renders correctly for a new transaction', async () => {
    const { getByText, getAllByText } = await render(<TransactionModal />);
    
    expect(getByText('New Transaction')).toBeTruthy();
    expect(getAllByText('Description')).toBeTruthy();
  });

  it('shows error toast if required fields are missing', async () => {
    const { getByText } = await render(<TransactionModal />);
    
    fireEvent.press(getByText('Add Transaction'));
    
    await waitFor(() => {
      expect(Toast.show).toHaveBeenCalledWith(expect.objectContaining({
        type: 'error',
        text2: 'Please fill all the required fields'
      }));
    });
  });

  it('renders correctly for updating an existing transaction', async () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({
      id: 'tx-1',
      description: 'Grocery Shopping',
      amount: '50',
      type: 'expense'
    });

    const { getAllByText, getByDisplayValue, getByTestId } = await render(<TransactionModal />);
    
    expect(getAllByText('Update Transaction').length).toBe(2); // Header and Button
    expect(getByDisplayValue('Grocery Shopping')).toBeTruthy();
    expect(getByDisplayValue('50')).toBeTruthy();
    expect(getByTestId('mock-icon-TrashIcon')).toBeTruthy(); // Delete button
  });

  it('calls deleteTransaction when delete button is pressed', async () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({
      id: 'tx-1',
      description: 'Grocery Shopping',
      amount: '50',
      type: 'expense'
    });
    (transactionService.deleteTransaction as jest.Mock).mockResolvedValue({ success: true, msg: 'Transaction deleted' });

    const { getByTestId, getByText } = await render(<TransactionModal />);
    
    // Open delete alert
    fireEvent.press(getByTestId('mock-icon-TrashIcon'));
    
    await waitFor(() => {
      expect(getByText('Confirm')).toBeTruthy();
    });
    
    // Confirm delete
    fireEvent.press(getByText('Delete'));

    await waitFor(() => {
      expect(transactionService.deleteTransaction).toHaveBeenCalledWith('tx-1', undefined);
      expect(mockBack).toHaveBeenCalled();
    });
    
    // Flush microtasks
    await act(async () => {});
  });
});
