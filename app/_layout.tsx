import React, { useEffect, useState, useCallback } from 'react'
import { Stack } from 'expo-router'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { AuthProvider, useAuth } from '@/contexts/authContext'
import Toast from 'react-native-toast-message'
import { customToastConfig } from '@/config/toastConfig'
import { ThemeProvider, useTheme } from '@/contexts/themeContext'
import { DataProvider } from '@/contexts/dataContext'
import { AppState, View, StyleSheet, TouchableOpacity } from 'react-native'
import * as LocalAuthentication from 'expo-local-authentication'
import * as Icons from 'phosphor-react-native'
import Typo from '@/components/Typo'
import Animated, { FadeIn, FadeOut, useSharedValue, useAnimatedStyle, withSequence, withTiming } from 'react-native-reanimated'
import * as Haptics from 'expo-haptics'
import { colors } from '@/constants/theme'

const StackLayout = () => {
  return (
    <Stack screenOptions={{headerShown: false}}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="(modals)/profileModal" options={{presentation: 'modal'}}/>
      <Stack.Screen name="(modals)/walletModal" options={{presentation: 'modal'}}/>
      <Stack.Screen name="(modals)/transactionModal" options={{presentation: 'modal'}}/>
      <Stack.Screen name="(modals)/searchModal" options={{presentation: 'modal'}}/>
      <Stack.Screen name="(modals)/settingsModal" options={{presentation: 'modal'}}/>
      <Stack.Screen name="(modals)/changePasswordModal" options={{presentation: 'modal'}}/>
      <Stack.Screen name="(modals)/budgetModal" options={{presentation: 'modal'}}/>
      <Stack.Screen name="(modals)/tutorialModal" options={{presentation: 'modal', animation: 'fade'}}/>
      <Stack.Screen name="(modals)/exportModal" options={{presentation: 'modal'}}/>
    </Stack>
  )
}

const AppLockWrapper = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const { colors: themeColors, isDark } = useTheme();
  const [isLocked, setIsLocked] = useState(false);
  const [isPrivacyObscured, setIsPrivacyObscured] = useState(false);
  const appState = React.useRef(AppState.currentState);
  const lastBackgroundTime = React.useRef<number | null>(null);
  const shakeValue = useSharedValue(0);

  const shakeAnimation = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: shakeValue.value }],
    };
  });

  const authenticate = useCallback(async () => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Unlock SpendWise',
        fallbackLabel: 'Use Passcode',
      });
      if (result.success) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setIsLocked(false);
        lastBackgroundTime.current = null;
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        shakeValue.value = withSequence(
          withTiming(10, { duration: 50 }),
          withTiming(-10, { duration: 50 }),
          withTiming(10, { duration: 50 }),
          withTiming(0, { duration: 50 })
        );
      }
    } catch (error) {
      console.log('Authentication error:', error);
    }
  }, [shakeValue]);

  // Trigger lock if it's enabled on initial load (when user data is restored)
  useEffect(() => {
    if (user?.appLockEnabled) {
      setIsLocked(true);
      authenticate();
    }
  }, [user?.appLockEnabled, authenticate]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (appState.current.match(/active/) && nextAppState.match(/inactive|background/)) {
        // App is going to the background - INSTANTLY obscure screen for privacy
        lastBackgroundTime.current = Date.now();
        if (user?.appLockEnabled) {
          setIsPrivacyObscured(true);
        }
      }

      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        // App is returning to foreground
        setIsPrivacyObscured(false);

        if (user?.appLockEnabled) {
          const timeInBg = lastBackgroundTime.current ? Date.now() - lastBackgroundTime.current : 0;
          const timeoutMs = user?.appLockTimeout || 0;
          
          if (timeInBg >= timeoutMs) {
            setIsLocked(true);
            authenticate();
          } else if (isLocked) {
            // Already locked, but returning, prompt again automatically
            authenticate();
          }
        }
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [user?.appLockEnabled, user?.appLockTimeout, isLocked, authenticate]);

  return (
    <View style={{ flex: 1 }}>
      {children}
      
      {/* Privacy Shield for Multitasking View */}
      {isPrivacyObscured && !isLocked && (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: themeColors.background, zIndex: 10000 }]} />
      )}

      {/* Main Lock Screen */}
      {isLocked && (
        <Animated.View entering={FadeIn.duration(300)} exiting={FadeOut.duration(300)} style={[StyleSheet.absoluteFill, { zIndex: 9999, elevation: 9999, justifyContent: 'center', alignItems: 'center', backgroundColor: themeColors.background }]}>
          <Animated.View style={[{ alignItems: 'center', zIndex: 10000 }, shakeAnimation]}>
            <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', justifyContent: 'center', alignItems: 'center', marginBottom: 20 }}>
               <Icons.LockKeyIcon size={40} color={themeColors.text} weight="fill" />
            </View>
            <Typo size={24} color={themeColors.text} fontWeight="700">
              SpendWise
            </Typo>
            <Typo size={16} color={themeColors.textLighter} style={{ marginTop: 10, textAlign: 'center', paddingHorizontal: 40 }}>
              Use Biometrics or Passcode to unlock the app
            </Typo>
            <TouchableOpacity onPress={authenticate} style={{ marginTop: 40, paddingVertical: 15, paddingHorizontal: 40, backgroundColor: colors.primary, borderRadius: 25 }}>
              <Typo size={16} color={colors.neutral900} fontWeight="700">Unlock App</Typo>
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>
      )}
    </View>
  );
};

export default function _layout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <ThemeProvider>
          <DataProvider>
            <AppLockWrapper>
              <StackLayout/>
            </AppLockWrapper>
            <Toast config={customToastConfig} position="top" topOffset={50} />
          </DataProvider>
        </ThemeProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  )
}