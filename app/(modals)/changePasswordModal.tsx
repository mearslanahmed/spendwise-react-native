import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import React, { useState } from "react";
import { colors, radius, spacingX, spacingY } from "@/constants/theme";
import { scale } from "@/utils/styling";
import ModalWrapper from "@/components/ModalWrapper";
import Header from "@/components/Header";
import BackButton from "@/components/BackButton";
import Typo from "@/components/Typo";
import Input from "@/components/Input";
import Button from "@/components/Button";
import * as Icons from "phosphor-react-native";
import Toast from 'react-native-toast-message';
import { auth } from "@/config/firebase";
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from "firebase/auth";
import { useTheme } from "@/contexts/themeContext";

const ChangePasswordModal = () => {
  const [loading, setLoading] = useState(false);
  const { colors: themeColors } = useTheme();
  
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Password requirements validation state
  const hasMinLength = newPassword.length >= 8;
  const hasLetter = /[a-zA-Z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);

  const isPasswordValid = hasMinLength && hasLetter && hasNumber;

  const handleSubmit = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Toast.show({
        type: "error",
        text1: "Validation Error",
        text2: "Please fill in all the password fields.",
      });
      return;
    }

    if (!isPasswordValid) {
      Toast.show({
        type: "error",
        text1: "Weak Password",
        text2: "The new password does not meet security requirements.",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      Toast.show({
        type: "error",
        text1: "Mismatch Error",
        text2: "Confirm password does not match the new password.",
      });
      return;
    }

    const firebaseUser = auth.currentUser;
    if (!firebaseUser || !firebaseUser.email) {
      Toast.show({
        type: "error",
        text1: "Session Error",
        text2: "User session not found.",
      });
      return;
    }

    setLoading(true);
    try {
      // 1. Reauthenticate user
      const credential = EmailAuthProvider.credential(firebaseUser.email, currentPassword);
      await reauthenticateWithCredential(firebaseUser, credential);

      // 2. Update password
      await updatePassword(firebaseUser, newPassword);

      Toast.show({
        type: "success",
        text1: "Success",
        text2: "Password updated successfully!",
      });

      // Clear inputs
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      let msg = "Failed to update password.";
      if (error.code === "auth/wrong-password" || error.message?.includes("wrong-password")) {
        msg = "Incorrect current password. Please try again.";
      } else if (error.code === "auth/weak-password") {
        msg = "Password is too weak.";
      }
      Toast.show({
        type: "error",
        text1: "Error",
        text2: msg,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalWrapper>
      <View style={styles.container}>
        <Header
          title="Change Password"
          leftIcon={<BackButton />}
          style={{ marginBottom: spacingY._15, marginTop: spacingY._10 }}
        />

        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.form}>
            {/* Current Password */}
            <View style={styles.inputContainer}>
              <Typo color={colors.neutral200} size={15}>Current Password</Typo>
              <Input
                placeholder="Enter current password"
                value={currentPassword}
                onChangeText={setCurrentPassword}
                autoFocus={true}
                secureTextEntry={!showCurrent}
                icon={
                  <TouchableOpacity onPress={() => setShowCurrent(!showCurrent)}>
                    <Icons.EyeIcon
                      size={20}
                      color={themeColors.textLighter}
                      weight={showCurrent ? "fill" : "regular"}
                    />
                  </TouchableOpacity>
                }
              />
            </View>

            {/* New Password */}
            <View style={styles.inputContainer}>
              <Typo color={colors.neutral200} size={15}>New Password</Typo>
              <Input
                placeholder="Enter new password"
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry={!showNew}
                icon={
                  <TouchableOpacity onPress={() => setShowNew(!showNew)}>
                    <Icons.EyeIcon
                      size={20}
                      color={themeColors.textLighter}
                      weight={showNew ? "fill" : "regular"}
                    />
                  </TouchableOpacity>
                }
              />
            </View>

            {/* Password Validation Checklist */}
            <View style={[styles.checklistContainer, { backgroundColor: themeColors.inputBg, borderColor: themeColors.border }]}>
              <View style={styles.checkRow}>
                {hasMinLength ? (
                  <Icons.CheckCircleIcon size={18} color={colors.primary} weight="fill" />
                ) : (
                  <Icons.CircleIcon size={18} color={colors.neutral500} />
                )}
                <Typo size={13} color={hasMinLength ? colors.neutral200 : colors.neutral400}>
                  {"At least 8 characters"}
                </Typo>
              </View>

              <View style={styles.checkRow}>
                {hasLetter ? (
                  <Icons.CheckCircleIcon size={18} color={colors.primary} weight="fill" />
                ) : (
                  <Icons.CircleIcon size={18} color={colors.neutral500} />
                )}
                <Typo size={13} color={hasLetter ? colors.neutral200 : colors.neutral400}>
                  {"Contains a letter"}
                </Typo>
              </View>

              <View style={styles.checkRow}>
                {hasNumber ? (
                  <Icons.CheckCircleIcon size={18} color={colors.primary} weight="fill" />
                ) : (
                  <Icons.CircleIcon size={18} color={colors.neutral500} />
                )}
                <Typo size={13} color={hasNumber ? colors.neutral200 : colors.neutral400}>
                  {"Contains a number"}
                </Typo>
              </View>
            </View>

            {/* Confirm New Password */}
            <View style={styles.inputContainer}>
              <Typo color={colors.neutral200} size={15}>Confirm New Password</Typo>
              <Input
                placeholder="Confirm new password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirm}
                icon={
                  <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)}>
                    <Icons.EyeIcon
                      size={20}
                      color={themeColors.textLighter}
                      weight={showConfirm ? "fill" : "regular"}
                    />
                  </TouchableOpacity>
                }
              />
              {confirmPassword.length > 0 && confirmPassword !== newPassword && (
                <Typo size={13} color={colors.rose} style={{ marginTop: 5 }}>
                  Passwords do not match
                </Typo>
              )}
            </View>
          </View>
        </ScrollView>

        <View style={[styles.footer, { borderTopColor: themeColors.border }]}>
          <Button 
            onPress={handleSubmit} 
            loading={loading} 
            style={{ flex: 1, opacity: (confirmPassword !== newPassword && confirmPassword.length > 0) ? 0.5 : 1 }}
            disabled={confirmPassword !== newPassword && confirmPassword.length > 0}
          >
            <Typo color={colors.black} fontWeight={"700"}>Update Password</Typo>
          </Button>
        </View>
      </View>
    </ModalWrapper>
  );
};

export default ChangePasswordModal;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacingX._20,
    justifyContent: "space-between",
  },
  scrollContent: {
    paddingBottom: spacingY._20,
  },
  form: {
    gap: spacingY._20,
    marginTop: spacingY._15,
  },
  inputContainer: {
    gap: spacingY._10,
  },
  checklistContainer: {
    backgroundColor: colors.neutral800,
    borderWidth: 1,
    borderColor: colors.neutral700,
    borderRadius: radius._12,
    padding: spacingY._12,
    gap: scale(8),
  },
  checkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(8),
  },
  footer: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    paddingHorizontal: spacingX._10,
    gap: scale(12),
    paddingTop: spacingY._15,
    borderTopColor: colors.neutral700,
    marginBottom: spacingY._5,
    borderTopWidth: 1,
  },
});
