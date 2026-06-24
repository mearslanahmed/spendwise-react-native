import React from 'react';
import { Modal, StyleSheet, View, TouchableOpacity, ActivityIndicator } from 'react-native';
import { colors, spacingX, spacingY, radius } from '@/constants/theme';
import { verticalScale } from '@/utils/styling';
import Typo from './Typo';

type CustomAlertProps = {
  visible: boolean;
  title: string;
  message: string;
  onCancel: () => void;
  onConfirm: () => void;
  cancelText?: string;
  confirmText?: string;
  loading?: boolean;
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
}: CustomAlertProps) => {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.alertBox}>
          <Typo size={20} fontWeight="700" color={colors.white} style={styles.title}>
            {title}
          </Typo>
          <Typo size={15} color={colors.neutral300} style={styles.message}>
            {message}
          </Typo>

          <View style={styles.buttonContainer}>
            <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={onCancel} disabled={loading}>
              <Typo size={16} fontWeight="600" color={colors.white}>
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
