import React from 'react';
import { BaseToast, ErrorToast, ToastConfig } from 'react-native-toast-message';
import { colors } from '@/constants/theme';
import { verticalScale } from '@/utils/styling';

import { useTheme } from '@/contexts/themeContext';

export const customToastConfig: ToastConfig = {
  success: (props) => {
    const { colors: themeColors } = useTheme();
    return (
      <BaseToast
        {...props}
        text1NumberOfLines={0}
        text2NumberOfLines={0}
        style={{ borderLeftColor: colors.primary, backgroundColor: themeColors.inputBg, height: 'auto', paddingVertical: verticalScale(10) }}
        contentContainerStyle={{ paddingHorizontal: 15 }}
        text1Style={{
          fontSize: verticalScale(15),
          fontWeight: 'bold',
          color: themeColors.text
        }}
        text2Style={{
          fontSize: verticalScale(13),
          color: themeColors.textLight
        }}
      />
    );
  },
  error: (props) => {
    const { colors: themeColors } = useTheme();
    return (
      <ErrorToast
        {...props}
        text1NumberOfLines={0}
        text2NumberOfLines={0}
        style={{ borderLeftColor: colors.rose, backgroundColor: themeColors.inputBg, height: 'auto', paddingVertical: verticalScale(10) }}
        text1Style={{
          fontSize: verticalScale(15),
          fontWeight: 'bold',
          color: themeColors.text
        }}
        text2Style={{
          fontSize: verticalScale(13),
          color: themeColors.textLight
        }}
      />
    );
  }
};
