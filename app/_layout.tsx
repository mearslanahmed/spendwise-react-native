import { StyleSheet, Text, View } from 'react-native'
import React from 'react'
import { Stack } from 'expo-router'
import { AuthProvider } from '@/contexts/authContext'
import Toast from 'react-native-toast-message'
import { customToastConfig } from '@/config/toastConfig'
import { ThemeProvider } from '@/contexts/themeContext'
import { DataProvider } from '@/contexts/dataContext'

const StackLayout = () => {
  return (
    <Stack screenOptions={{headerShown: false}}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="(modals)/profileModal" options={{presentation: 'modal'}}/>
      <Stack.Screen name="(modals)/walletModal" options={{presentation: 'modal'}}/>
      <Stack.Screen name="(modals)/transactionModal" options={{presentation: 'modal'}}/>
      <Stack.Screen name="(modals)/searchModal" options={{presentation: 'modal'}}/>
      <Stack.Screen name="(modals)/privacyPolicyModal" options={{presentation: 'modal'}}/>
      <Stack.Screen name="(modals)/termsOfServiceModal" options={{presentation: 'modal'}}/>
      <Stack.Screen name="(modals)/settingsModal" options={{presentation: 'modal'}}/>
      <Stack.Screen name="(modals)/changePasswordModal" options={{presentation: 'modal'}}/>
      <Stack.Screen name="(modals)/budgetModal" options={{presentation: 'modal'}}/>
    </Stack>
  )
}

export default function _layout() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <DataProvider>
          <StackLayout/>
          <Toast config={customToastConfig} position="top" topOffset={50} />
        </DataProvider>
      </ThemeProvider>
    </AuthProvider>
  )
}

const styles = StyleSheet.create({})