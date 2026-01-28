import { StyleSheet, Text, TextInput, View, TouchableOpacity } from 'react-native'
import React, { useState } from 'react'
import { InputProps } from '@/types'
import { colors, radius, spacingX } from '@/constants/theme'
import { verticalScale } from '@/utils/styling'
import * as Icons from 'phosphor-react-native'

const Input = (props: InputProps) => {
  const [showPassword, setShowPassword] = useState(false)
  const isPasswordField = props.secureTextEntry
  const { secureTextEntry, ...restProps } = props

  return (
    <View
        style={[styles.container, props.containerStyle && props.containerStyle]}
    >
        {props.icon && props.icon}
      <TextInput 
        style={[
            styles.input, 
            props.inputStyle
        ]}
        placeholderTextColor={colors.neutral400}
        ref={props.inputRef && props.inputRef}
        secureTextEntry={isPasswordField ? !showPassword : false}
        {...restProps}
      />
      {isPasswordField && (
        <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
          {showPassword ? (
            <Icons.Eye size={verticalScale(20)} color={colors.neutral400} weight="fill" />
          ) : (
            <Icons.EyeSlash size={verticalScale(20)} color={colors.neutral400} weight="fill" />
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
        borderColor: colors.neutral300,
        borderRadius: radius._17,
        borderCurve: 'continuous',
        paddingHorizontal: spacingX._15,
        gap: spacingX._10,
    },
    input: {
        flex: 1,
        color: colors.white,
        fontSize: verticalScale(14),
    },
})