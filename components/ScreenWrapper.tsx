import { Dimensions, Platform, StatusBar, StyleSheet, Text, View } from 'react-native'
import React from 'react'
import { ScreenWrapperProps } from '@/types'

import { useTheme } from '@/contexts/themeContext'

const {height} = Dimensions.get('window')

const ScreenWrapper = ({style, children}: ScreenWrapperProps) => {
    const { colors, isDark } = useTheme();
    let paddingTop = Platform.OS == 'ios'? height * 0.06 : 30
  return (
    <View style={[{
      paddingTop,
      flex: 1,
      backgroundColor: colors.background,
    }, style]}>
      
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
      {children}
    </View>
  )
}

export default ScreenWrapper

const styles = StyleSheet.create({})