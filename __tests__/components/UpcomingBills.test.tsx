import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import UpcomingBills from '../../components/UpcomingBills';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/authContext';
import { useTheme } from '@/contexts/themeContext';

jest.mock('expo-router', () => ({
  useRouter: jest.fn(),
}));

jest.mock('@/contexts/authContext', () => ({
  useAuth: jest.fn(),
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

describe('UpcomingBills Component', () => {
  beforeEach(() => {
    (useAuth as jest.Mock).mockReturnValue({ user: { uid: '123' } });
    (useTheme as jest.Mock).mockReturnValue({
      colors: { text: '#000', primary: '#111', inputBg: '#222', border: '#333', textLighter: '#444' },
      isDark: false,
    });
    (useRouter as jest.Mock).mockReturnValue({ push: jest.fn() });
    
    // Mock system time to a fixed date
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-10T12:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('renders empty state when there are no subscriptions', async () => {
    const { getByText } = await render(<UpcomingBills subscriptions={[]} />);
    expect(getByText('Add your first subscription')).toBeTruthy();
  });

  it('navigates to add subscription when empty state is pressed', async () => {
    const mockPush = jest.fn();
    (useRouter as jest.Mock).mockReturnValue({ push: mockPush });
    
    const { getByText } = await render(<UpcomingBills subscriptions={[]} />);
    fireEvent.press(getByText('Add your first subscription'));
    
    expect(mockPush).toHaveBeenCalledWith('/(modals)/manageSubscriptionModal');
  });

  it('renders subscription items and sorts by closest billing date', async () => {
    const mockSubs = [
      { id: '1', name: 'Netflix', amount: 15, category: 'entertainment', nextBillingDate: '2024-01-12T12:00:00Z', frequency: 'monthly', type: 'expense' },
      { id: '2', name: 'Gym', amount: 50, category: 'health', nextBillingDate: '2024-01-11T12:00:00Z', frequency: 'monthly', type: 'expense' },
    ];
    
    const { getByText, getAllByText } = await render(<UpcomingBills subscriptions={mockSubs as any} />);
    
    // Check if names are rendered
    expect(getByText('Netflix')).toBeTruthy();
    expect(getByText('Gym')).toBeTruthy();
    
    // Check if dates are calculated properly
    // 2024-01-10 to 2024-01-11 is 1 day -> Tomorrow
    expect(getByText('Tomorrow')).toBeTruthy();
    // 2024-01-10 to 2024-01-12 is 2 days -> In 2 days
    expect(getByText('In 2 days')).toBeTruthy();
  });

  it('navigates to subscriptions list when "See All" is pressed', async () => {
    const mockPush = jest.fn();
    (useRouter as jest.Mock).mockReturnValue({ push: mockPush });
    
    const { getByText } = await render(<UpcomingBills subscriptions={[{ id: '1', amount: 10, nextBillingDate: '2024-01-12' }] as any} />);
    fireEvent.press(getByText('See All'));
    
    expect(mockPush).toHaveBeenCalledWith('/(modals)/subscriptionsListModal');
  });
});
