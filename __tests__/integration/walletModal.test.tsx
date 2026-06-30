import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import WalletModal from '../../app/(modals)/walletModal';
import { useAuth } from '@/contexts/authContext';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Toast from 'react-native-toast-message';
import * as walletService from '@/services/walletService';

jest.mock('@/contexts/authContext');
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
jest.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children }: any) => {
    const { View } = require('react-native');
    return <View testID="mock-linear-gradient">{children}</View>;
  }
}));
jest.mock('@/services/walletService');
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
  return new Proxy({}, {
    get: function(target, prop) {
      if (prop === '__esModule') return true;
      return () => <Text testID={`mock-icon-${String(prop)}`} />;
    }
  });
});

describe('WalletModal Integration Tests', () => {
  let mockPush: jest.Mock;
  let mockBack: jest.Mock;

  beforeEach(() => {
    mockPush = jest.fn();
    mockBack = jest.fn();

    (useAuth as jest.Mock).mockReturnValue({
      user: { uid: 'test-user-id' },
    });

    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
      back: mockBack,
    });

    (useLocalSearchParams as jest.Mock).mockReturnValue({});
    
    (Toast.show as jest.Mock).mockClear();
    (walletService.CreateOrUpdateWallet as jest.Mock).mockClear();
    (walletService.deleteWallet as jest.Mock).mockClear();
  });

  it('renders correctly for a new wallet', async () => {
    const { getByText, getByPlaceholderText, getByTestId } = await render(<WalletModal />);
    
    expect(getByText('New Wallet')).toBeTruthy();
    expect(getByPlaceholderText('Wallet name...')).toBeTruthy();
    expect(getByText('Add Wallet')).toBeTruthy();
  });

  it('shows error toast if fields are empty', async () => {
    const { getByText, getByTestId } = await render(<WalletModal />);
    fireEvent.press(getByText('Add Wallet'));
    
    expect(Toast.show).toHaveBeenCalledWith(expect.objectContaining({
      type: 'error',
      text2: 'Please fill all the fields'
    }));
    await new Promise(r => setTimeout(r, 0));
  });

  it.skip('calls CreateOrUpdateWallet when fields are valid', async () => {
    (walletService.CreateOrUpdateWallet as jest.Mock).mockResolvedValue({ success: true, msg: 'Wallet created' });
    
    const { getByText, getByPlaceholderText, getByTestId } = await render(<WalletModal />);
    
    // Enter name
    fireEvent.changeText(getByPlaceholderText('Wallet name...'), 'My New Wallet');
    
    // Select a preset (assuming preset selection relies on touchable elements we can find by finding PresetCardItem)
    // PresetCardItem has testID
    const bankPreset = getByTestId('preset-preset_bank');
    fireEvent.press(bankPreset);
    
    fireEvent.press(getByText('Add Wallet'));
    
    await waitFor(() => {
      expect(walletService.CreateOrUpdateWallet).toHaveBeenCalledWith(expect.objectContaining({
        name: 'My New Wallet',
        image: 'preset_bank',
        uid: 'test-user-id'
      }));
      expect(mockBack).toHaveBeenCalled();
    });
    await new Promise(r => setTimeout(r, 0));
  });

  it.skip('renders correctly for updating an existing wallet', async () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({
      id: 'wallet-1',
      name: 'Existing Wallet',
      image: 'preset_cash'
    });

    const { getByText, getByDisplayValue, getAllByText, getByTestId } = await render(<WalletModal />);
    
    expect(getAllByText('Update Wallet')).toBeTruthy();
    expect(getByDisplayValue('Existing Wallet')).toBeTruthy();
    expect(getAllByText('Update Wallet')).toBeTruthy(); // button text
    expect(getByTestId('mock-icon-TrashIcon')).toBeTruthy();
    await new Promise(r => setTimeout(r, 0));
  });

  it.skip('calls deleteWallet when delete button is pressed', async () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({
      id: 'wallet-1',
      name: 'Existing Wallet',
      image: 'preset_cash'
    });
    (walletService.deleteWallet as jest.Mock).mockResolvedValue({ success: true, msg: 'Wallet deleted' });

    const { getByText, getByTestId, getAllByText } = await render(<WalletModal />);
    
    // Open delete alert
    fireEvent.press(getByTestId('mock-icon-TrashIcon'));
    
    // The CustomAlert should show "Delete Wallet?"
    await waitFor(() => {
      expect(getByText('Delete Wallet?')).toBeTruthy();
      expect(getByText('This action will permanently delete this wallet and all its transactions.')).toBeTruthy();
    });
    
    // Confirm delete
    fireEvent.press(getByText('Delete'));

    await waitFor(() => {
      expect(walletService.deleteWallet).toHaveBeenCalledWith('wallet-1');
      expect(mockBack).toHaveBeenCalled();
    });
    await new Promise(r => setTimeout(r, 0));
  });
});
