import React, { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './authContext';
import { colors as staticColors } from '@/constants/theme';
import { doc, updateDoc } from 'firebase/firestore';
import { firestore } from '@/config/firebase';

type ThemeType = 'dark' | 'light' | 'system';

type ThemeContextType = {
  theme: ThemeType;
  setTheme: (newTheme: ThemeType) => Promise<void>;
  isDark: boolean;
  colors: typeof staticColors;
};

const ThemeContext = createContext<ThemeContextType | null>(null);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, updateUserData } = useAuth();
  const systemScheme = useColorScheme();
  const [localTheme, setLocalTheme] = useState<ThemeType>('system');

  // Load local theme preference from AsyncStorage on startup
  useEffect(() => {
    const loadTheme = async () => {
      const savedTheme = await AsyncStorage.getItem('spendwise_theme');
      if (savedTheme) {
        setLocalTheme(savedTheme as ThemeType);
      }
    };
    loadTheme();
  }, []);

  // Determine active theme mode (dark vs light)
  const activePreference = user?.theme || localTheme;
  const isDark = activePreference === 'system' 
    ? systemScheme === 'dark' 
    : activePreference === 'dark';

  // Construct colors palette dynamically
  const colors = {
    ...staticColors,
    // Dynamic background and text overrides:
    background: isDark ? '#171717' : '#fafafa', // neutral900 vs neutral50
    card: isDark ? '#262626' : '#ffffff', // neutral800 vs white
    text: isDark ? '#ffffff' : '#171717', // white vs neutral900
    textLight: isDark ? '#e5e5e5' : '#404040', // neutral200 vs neutral700
    textLighter: isDark ? '#d4d4d4' : '#737373', // neutral300 vs neutral500
    border: isDark ? '#404040' : '#e5e5e5', // neutral700 vs neutral200
    inputBg: isDark ? '#262626' : '#f5f5f5', // neutral800 vs neutral100
  };

  const setTheme = async (newTheme: ThemeType) => {
    setLocalTheme(newTheme);
    await AsyncStorage.setItem('spendwise_theme', newTheme);
    if (user?.uid) {
      try {
        const userRef = doc(firestore, 'users', user.uid);
        await updateDoc(userRef, { theme: newTheme });
        await updateUserData(user.uid);
      } catch (error) {
        console.log('Error saving theme preference to Firestore:', error);
      }
    }
  };

  return (
    <ThemeContext.Provider value={{ theme: activePreference, setTheme, isDark, colors }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
