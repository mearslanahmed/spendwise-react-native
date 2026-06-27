import { colors } from '@/constants/theme'
import { useRouter } from 'expo-router'
import React, { useEffect } from 'react'
import { Image, StyleSheet, View } from 'react-native'
import { useTheme } from '@/contexts/themeContext'

const index = () => {
  const { colors: themeColors } = useTheme();
  // const router = useRouter();
  // useEffect(() => {
  //   setTimeout(() => {
  //     router.push('/(auth)/welcome');
  //   }, 2000);
  // },[]);

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <Image
        style={styles.logo}
        resizeMode="contain"
        source={require('../assets/images/splash-icon.png')}
      />
    
    </View>
  )
}

export default index

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    // backgroundColor is set via theme dynamically
  },

  logo: {
    height: "20%",
    aspectRatio: 1,
  }
})