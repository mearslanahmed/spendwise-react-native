import { StyleSheet, Text, View } from 'react-native'
import React from 'react'
import Button from '@/components/Button'
import Typo from '@/components/Typo'
import { signOut } from 'firebase/auth'
import { auth } from '@/config/firebase'
import { colors } from '@/constants/theme'
import { useAuth } from '@/contexts/authContext'
import ScreenWrapper from '@/components/ScreenWrapper'

const Home = () => {
    const {user} = useAuth();
    console.log("user:", user);
    const handleLogout = async () => {
        // Add your logout logic here
        await signOut(auth);
    }
  return (
    <ScreenWrapper>
      <Typo>Home</Typo>
      <Button onPress={handleLogout}>
        <Typo color={colors.black}>Logout</Typo>
      </Button>
    </ScreenWrapper>
  )
}

export default Home

const styles = StyleSheet.create({})