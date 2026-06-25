import { StyleSheet, TouchableOpacity } from 'react-native'
import React from 'react'
import { BackButtonProps } from '@/types'
import { useRouter } from 'expo-router'
import { CaretLeft } from 'phosphor-react-native';
import { verticalScale } from '@/utils/styling';
import { radius } from '@/constants/theme';
import { useTheme } from '@/contexts/themeContext';

const BackButton = ({
    style,
    iconSize = 26,
}: BackButtonProps) => {
    const router = useRouter();
    const { colors: themeColors } = useTheme();
  return (
    <TouchableOpacity 
      onPress={() => router.back()} 
      style={[styles.button, { backgroundColor: themeColors.inputBg }, style]}
    >
      <CaretLeft 
      size={verticalScale(iconSize)} 
      color={themeColors.text}
      weight='bold'/>
    </TouchableOpacity>
  );
};

export default BackButton

const styles = StyleSheet.create({
    button: {
        alignSelf: 'flex-start',
        borderRadius: radius._12,
        borderCurve: 'continuous',
        padding: 5,
     }
})