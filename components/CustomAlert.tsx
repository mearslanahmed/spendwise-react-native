import React from 'react';
import { Modal, StyleSheet, View, TouchableOpacity, ActivityIndicator } from 'react-native';
import { colors, spacingX, spacingY, radius } from '@/constants/theme';
import { verticalScale } from '@/utils/styling';
import Typo from './Typo';
import { useTheme } from '@/contexts/themeContext';

type CustomAlertProps = {
  visible: boolean;
  title: string;
  message: string;
  onCancel: () => void;
  onConfirm: () => void;
  cancelText?: string;
  confirmText?: string;
  loading?: boolean;
  children?: React.ReactNode;
};

const CustomAlert = ({
  visible,
  title,
  message,
  onCancel,
  onConfirm,
  cancelText = "Cancel",
  confirmText = "Confirm",
  loading = false,
  children,
}: CustomAlertProps) => {
  const { colors: themeColors, isDark } = useTheme();
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={[styles.alertBox, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
          <Typo size={20} fontWeight="700" color={themeColors.text} style={styles.title}>
            {title}
          </Typo>
          <Typo size={15} color={themeColors.textLight} style={styles.message}>
            {message}
          </Typo>

          {children}

          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={[
                styles.button, 
                { backgroundColor: isDark ? colors.neutral600 : themeColors.border }
              ]} 
              onPress={onCancel} 
              disabled={loading}
            >
              <Typo size={16} fontWeight="600" color={themeColors.text}>
                {cancelText}
              </Typo>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.button, styles.confirmButton]} onPress={onConfirm} disabled={loading}>
              {loading ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Typo size={16} fontWeight="700" color={colors.white}>
                  {confirmText}
                </Typo>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default CustomAlert;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacingX._20,
  },
  alertBox: {
    backgroundColor: colors.neutral800,
    borderRadius: radius._15,
    width: '100%',
    padding: spacingY._20,
    borderWidth: 1,
    borderColor: colors.neutral700,
  },
  title: {
    marginBottom: spacingY._10,
    textAlign: 'center',
  },
  message: {
    textAlign: 'center',
    marginBottom: spacingY._20,
    lineHeight: verticalScale(22),
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: spacingX._15,
  },
  button: {
    flex: 1,
    height: verticalScale(45),
    borderRadius: radius._12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: colors.neutral600,
  },
  confirmButton: {
    backgroundColor: colors.rose,
  },
});
