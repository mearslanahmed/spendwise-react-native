/* eslint-env jest */
/* global jest */
import '@testing-library/jest-native/extend-expect';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
  useLocalSearchParams: jest.fn(() => ({})),
}));

require('react-native-reanimated').setUpTests?.();
jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));

jest.mock('@/contexts/themeContext', () => ({
  useTheme: () => ({
    colors: {
      primary: '#000000',
      background: '#ffffff',
      text: '#333333',
      textLighter: '#666666',
      inputBg: '#eeeeee',
      border: '#dddddd',
    },
    isDark: false,
  }),
  ThemeProvider: ({ children }) => children,
}));

jest.mock('firebase/app', () => ({
  initializeApp: jest.fn(() => ({})),
  getApp: jest.fn(() => ({})),
  getApps: jest.fn(() => []),
}));

jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(() => ({})),
  initializeAuth: jest.fn(() => ({})),
  getReactNativePersistence: jest.fn(),
  signInWithEmailAndPassword: jest.fn(),
  createUserWithEmailAndPassword: jest.fn(),
  signOut: jest.fn(),
  onAuthStateChanged: jest.fn(() => jest.fn()),
  sendPasswordResetEmail: jest.fn(),
}));

jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(() => ({})),
  collection: jest.fn(),
  doc: jest.fn(),
  setDoc: jest.fn(),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
  writeBatch: jest.fn(() => ({
    delete: jest.fn(),
    update: jest.fn(),
    set: jest.fn(),
    commit: jest.fn(() => Promise.resolve()),
  })),
  getAggregateFromServer: jest.fn(),
  sum: jest.fn(),
  Timestamp: {
    now: jest.fn(() => ({ toMillis: () => Date.now() })),
    fromDate: jest.fn((date) => ({ toMillis: () => date.getTime() })),
  },
}));

jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: {
    configure: jest.fn(),
    hasPlayServices: jest.fn(() => Promise.resolve(true)),
    signIn: jest.fn(() => Promise.resolve({ data: { idToken: 'mock-id-token' } })),
    signOut: jest.fn(() => Promise.resolve()),
  },
}));

jest.mock('react-native-toast-message', () => {
  const React = require('react');
  const { View } = require('react-native');
  const ToastComponent = (props) => <View testID="mock-toast" {...props} />;
  ToastComponent.show = jest.fn();
  ToastComponent.hide = jest.fn();
  return {
    __esModule: true,
    default: ToastComponent,
    BaseToast: (props) => <View testID="mock-base-toast" {...props} />,
    ErrorToast: (props) => <View testID="mock-error-toast" {...props} />,
  };
});
