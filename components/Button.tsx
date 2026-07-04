import { StyleSheet, TouchableOpacity, View } from 'react-native'
import React from 'react'
import { CustomButtonProps } from '@/types'
import { colors, radius } from '@/constants/theme'
import { verticalScale } from '@/utils/styling'
import Loading from './Loading'
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated'

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

const Button = ({
    style,
    onPress,
    loading = false,
    children,
    ...props
}: CustomButtonProps) => {
    const scale = useSharedValue(1);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }]
    }));

    if(loading){
        return (
            <View style={[styles.button, style, {backgroundColor: 'transparent'}]}>
                <Loading/>
            </View>
        )
    }

  return (
    <AnimatedTouchableOpacity 
      activeOpacity={0.8}
      onPressIn={() => scale.value = withTiming(0.97, { duration: 100 })}
      onPressOut={() => scale.value = withTiming(1, { duration: 150 })}
      onPress={onPress} 
      style={[styles.button, style, animatedStyle]} 
      {...props}
    >
      {children}
    </AnimatedTouchableOpacity>
  )
}

export default Button

const styles = StyleSheet.create({
    button: {
        backgroundColor: colors.primary,
        borderRadius: radius._17,
        borderCurve: "continuous",
        height: verticalScale(52),
        justifyContent: "center",
        alignItems: "center",
    }
})