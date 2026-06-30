import React from 'react'
import { Image, StyleSheet, View } from 'react-native'
import { useTheme } from '@/contexts/themeContext'

const Index = () => {
  const { colors: themeColors } = useTheme();

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

export default Index

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