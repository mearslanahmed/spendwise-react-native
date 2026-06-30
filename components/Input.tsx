import { StyleSheet, TextInput, View, TouchableOpacity } from 'react-native'
import React, { useState } from 'react'
import { InputProps } from '@/types'
import { colors as staticColors, radius, spacingX } from '@/constants/theme'
import { verticalScale } from '@/utils/styling'
import * as Icons from 'phosphor-react-native'
import { useTheme } from '@/contexts/themeContext'

const Input = (props: InputProps) => {
  const [showPassword, setShowPassword] = useState(false)
  const isPasswordField = props.secureTextEntry
  const { secureTextEntry, ...restProps } = props
  const { colors: themeColors } = useTheme(); // Uses updated dynamic theme colors type

  return (
    <View
        style={[
          styles.container, 
          {
            backgroundColor: themeColors.inputBg,
            borderColor: themeColors.border,
          },
          props.containerStyle && props.containerStyle
        ]}
    >
        {props.icon && props.icon}
      <TextInput 
        style={[
            styles.input, 
            { color: themeColors.text },
            props.inputStyle
        ]}
        placeholderTextColor={themeColors.textLighter}
        ref={props.inputRef && props.inputRef}
        secureTextEntry={isPasswordField ? !showPassword : false}
        {...restProps}
      />
      {isPasswordField && (
        <TouchableOpacity testID="toggle-password-button" onPress={() => setShowPassword(!showPassword)}>
          {showPassword ? (
            <Icons.Eye size={verticalScale(20)} color={themeColors.textLighter} weight="fill" />
          ) : (
            <Icons.EyeSlash size={verticalScale(20)} color={themeColors.textLighter} weight="fill" />
          )}
        </TouchableOpacity>
      )}
    </View>
  )
}

export default Input

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        height: verticalScale(54),
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: staticColors.neutral300,
        borderRadius: radius._17,
        borderCurve: 'continuous',
        paddingHorizontal: spacingX._15,
        gap: spacingX._10,
    },
    input: {
        flex: 1,
        color: staticColors.white,
        fontSize: verticalScale(14),
    },
})