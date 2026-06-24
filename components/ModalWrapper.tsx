import { Platform, StyleSheet, Text, View } from 'react-native'
import React from 'react'
import { colors, spacingY } from '@/constants/theme'
import { ModalWrapperProps } from '@/types'
import Toast from 'react-native-toast-message';
import { customToastConfig } from '@/config/toastConfig';

const isIos = Platform.OS === 'ios';
const ModalWrapper = ({
    style,
    children,
    bg = colors.neutral800,
}: ModalWrapperProps) => {
  return (
    <View style={[styles.container, {backgroundColor: bg}, style && style]}>
      {children}
      <Toast config={customToastConfig} position="top" topOffset={50} />
    </View>
  );
}

export default ModalWrapper

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingTop: isIos ? spacingY._15 : 30,
        paddingBottom: isIos ? spacingY._20 : spacingY._10,
    },
})