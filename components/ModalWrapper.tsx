import { Platform, StyleSheet, View } from 'react-native'
import React from 'react'
import { colors, spacingY } from '@/constants/theme'
import { ModalWrapperProps } from '@/types'
import Toast from 'react-native-toast-message';
import { customToastConfig } from '@/config/toastConfig';

import { useTheme } from '@/contexts/themeContext';

const isIos = Platform.OS === 'ios';
const ModalWrapper = ({
    style,
    children,
    bg = colors.neutral800,
}: ModalWrapperProps) => {
  const { colors: themeColors } = useTheme();
  const resolvedBg = bg === colors.neutral800 ? themeColors.card : bg;
  return (
    <View style={[styles.container, {backgroundColor: resolvedBg}, style && style]}>
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