import React from 'react';
import { BaseToast, ErrorToast, ToastConfig } from 'react-native-toast-message';
import { colors } from '@/constants/theme';
import { verticalScale } from '@/utils/styling';

export const customToastConfig: ToastConfig = {
  success: (props) => (
    <BaseToast
      {...props}
      style={{ borderLeftColor: colors.primary, backgroundColor: colors.neutral800, height: 'auto', paddingVertical: verticalScale(10) }}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={{
        fontSize: verticalScale(15),
        fontWeight: 'bold',
        color: colors.white
      }}
      text2Style={{
        fontSize: verticalScale(13),
        color: colors.neutral300
      }}
    />
  ),
  error: (props) => (
    <ErrorToast
      {...props}
      style={{ borderLeftColor: colors.rose, backgroundColor: colors.neutral800, height: 'auto', paddingVertical: verticalScale(10) }}
      text1Style={{
        fontSize: verticalScale(15),
        fontWeight: 'bold',
        color: colors.white
      }}
      text2Style={{
        fontSize: verticalScale(13),
        color: colors.neutral300
      }}
    />
  )
};
