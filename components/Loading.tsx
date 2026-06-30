import { ActivityIndicator, View } from 'react-native'
import React from 'react'
import { useTheme } from '@/contexts/themeContext'

const Loading = ({size="large", color=""}: {size?: "large" | "small", color?: string}) => {
  const { colors: themeColors } = useTheme();
  return (
    <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
      <ActivityIndicator size={size} color={color || themeColors.primary} testID="loading-indicator" />
    </View>
  )
}

export default Loading