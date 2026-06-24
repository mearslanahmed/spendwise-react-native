import { ActivityIndicator, Linking, StyleSheet, TouchableOpacity, View } from "react-native";
import React, { useState } from "react";
import { colors, radius, spacingX, spacingY } from "@/constants/theme";
import { verticalScale } from "@/utils/styling";
import ModalWrapper from "@/components/ModalWrapper";
import Header from "@/components/Header";
import BackButton from "@/components/BackButton";
import Typo from "@/components/Typo";
import { useAuth } from "@/contexts/authContext";
import { doc, updateDoc } from "firebase/firestore";
import { auth, firestore } from "@/config/firebase";
import Toast from 'react-native-toast-message';
import { Dropdown } from "react-native-element-dropdown";
import * as Icons from "phosphor-react-native";
import CustomAlert from "@/components/CustomAlert";
import { deleteUserAccountData } from "@/services/userService";
import { deleteUser, signOut } from "firebase/auth";

const currencies = [
  { label: "USD ($)", value: "$" },
  { label: "EUR (€)", value: "€" },
  { label: "GBP (£)", value: "£" },
  { label: "INR (₹)", value: "₹" },
  { label: "JPY (¥)", value: "¥" },
  { label: "PKR (Rs.)", value: "Rs." },
];

const SettingsModal = () => {
  const { user, updateUserData } = useAuth();
  const [loading, setLoading] = useState(false);
  const [deleteAlertVisible, setDeleteAlertVisible] = useState(false);
  const [confirmDeleteVisible, setConfirmDeleteVisible] = useState(false);

  const selectedCurrency = user?.currency || "$";

  const handleCurrencyChange = async (item: { label: string; value: string }) => {
    if (!user?.uid) return;
    setLoading(true);
    try {
      const userRef = doc(firestore, "users", user.uid);
      await updateDoc(userRef, { currency: item.value });
      await updateUserData(user.uid);
      Toast.show({
        type: "success",
        text1: "Success",
        text2: `Preferred currency updated to ${item.value}`,
      });
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: error.message || "Failed to update currency",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleContactSupport = () => {
    Linking.openURL("mailto:support@spendwise.com?subject=SpendWise%20Support%20Request")
      .catch(() => {
        Toast.show({
          type: "error",
          text1: "Error",
          text2: "Could not open mail client. Please email support@spendwise.com.",
        });
      });
  };

  const handleDeleteAccount = async () => {
    if (!user?.uid) return;
    setConfirmDeleteVisible(false);
    setLoading(true);
    try {
      // 1. Delete all user data in Firestore
      const dbRes = await deleteUserAccountData(user.uid);
      if (!dbRes.success) {
        Toast.show({
          type: "error",
          text1: "Error",
          text2: dbRes.msg || "Failed to clear database records",
        });
        setLoading(false);
        return;
      }

      // 2. Delete the user from Auth
      const firebaseUser = auth.currentUser;
      if (firebaseUser) {
        await deleteUser(firebaseUser);
      }
      
      Toast.show({
        type: "success",
        text1: "Account Deleted",
        text2: "Your account and data have been permanently deleted.",
      });
    } catch (error: any) {
      if (error.code === "auth/requires-recent-login") {
        Toast.show({
          type: "error",
          text1: "Action Required",
          text2: "Please log out and log back in, then try deleting again.",
        });
      } else {
        Toast.show({
          type: "error",
          text1: "Error",
          text2: error.message || "Failed to delete account",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalWrapper>
      <View style={styles.container}>
        <Header
          title="Settings"
          leftIcon={<BackButton />}
          style={{ marginBottom: spacingY._15 }}
        />

        {loading && (
          <View style={styles.loaderOverlay}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        )}

        <View style={styles.content}>
          {/* Currency Selection */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Icons.CurrencyCircleDollarIcon size={24} color={colors.neutral300} />
              <Typo size={16} fontWeight="600" color={colors.neutral100}>
                Preferences
              </Typo>
            </View>
            <View style={styles.settingRow}>
              <Typo size={15} color={colors.neutral300} style={{ flex: 1 }}>
                Preferred Currency
              </Typo>
              <Dropdown
                style={styles.dropdownContainer}
                activeColor={colors.neutral700}
                selectedTextStyle={styles.dropdownSelectedText}
                iconStyle={styles.dropdownIcon}
                data={currencies}
                maxHeight={250}
                labelField="label"
                valueField="value"
                itemTextStyle={styles.dropdownItemText}
                itemContainerStyle={styles.dropdownItemContainer}
                containerStyle={styles.dropdownListContainer}
                value={selectedCurrency}
                onChange={handleCurrencyChange}
                disabled={loading}
              />
            </View>
          </View>

          {/* Support Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Icons.QuestionIcon size={24} color={colors.neutral300} />
              <Typo size={16} fontWeight="600" color={colors.neutral100}>
                Support
              </Typo>
            </View>
            <TouchableOpacity
              style={styles.actionRow}
              onPress={handleContactSupport}
              disabled={loading}
            >
              <Typo size={15} color={colors.neutral300} style={{ flex: 1 }}>
                Contact Support
              </Typo>
              <Icons.EnvelopeIcon size={20} color={colors.neutral300} />
            </TouchableOpacity>
          </View>

          {/* Danger Zone */}
          <View style={[styles.section, styles.dangerSection]}>
            <View style={styles.sectionHeader}>
              <Icons.WarningIcon size={24} color={colors.rose} />
              <Typo size={16} fontWeight="600" color={colors.rose}>
                Danger Zone
              </Typo>
            </View>
            <TouchableOpacity
              style={styles.actionRow}
              onPress={() => setDeleteAlertVisible(true)}
              disabled={loading}
            >
              <Typo size={15} color={colors.rose} style={{ flex: 1 }} fontWeight="500">
                Delete Account & Clear Data
              </Typo>
              <Icons.TrashIcon size={20} color={colors.rose} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* First confirmation */}
      <CustomAlert
        visible={deleteAlertVisible}
        title="Delete Account?"
        message="This action will permanently delete your SpendWise account, profile, all wallets, and transactions. You cannot undo this."
        onCancel={() => setDeleteAlertVisible(false)}
        onConfirm={() => {
          setDeleteAlertVisible(false);
          setConfirmDeleteVisible(true);
        }}
        confirmText="Continue"
      />

      {/* Second confirmation */}
      <CustomAlert
        visible={confirmDeleteVisible}
        title="Final Confirmation"
        message="Are you absolutely sure? This is your last warning before your account is permanently deleted."
        onCancel={() => setConfirmDeleteVisible(false)}
        onConfirm={handleDeleteAccount}
        confirmText="Permanently Delete"
      />
    </ModalWrapper>
  );
};

export default SettingsModal;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacingX._20,
  },
  loaderOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  content: {
    gap: spacingY._25,
    marginTop: spacingY._15,
  },
  section: {
    backgroundColor: colors.neutral800,
    borderRadius: radius._15,
    padding: spacingY._15,
    borderWidth: 1,
    borderColor: colors.neutral700,
    gap: spacingY._15,
  },
  dangerSection: {
    borderColor: "rgba(225, 29, 72, 0.2)",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacingX._10,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral700,
    paddingBottom: spacingY._10,
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacingY._5,
  },
  dropdownContainer: {
    height: verticalScale(40),
    width: 140,
    borderWidth: 1,
    borderColor: colors.neutral600,
    paddingHorizontal: spacingX._10,
    borderRadius: radius._10,
    backgroundColor: colors.neutral900,
  },
  dropdownItemText: { 
    color: colors.white,
    fontSize: verticalScale(13),
  },
  dropdownSelectedText: {
    color: colors.white,
    fontSize: verticalScale(13),
  },
  dropdownListContainer: {
    backgroundColor: colors.neutral900,
    borderRadius: radius._12,
    borderColor: colors.neutral500,
    top: 5,
  },
  dropdownItemContainer: {
    borderRadius: radius._10,
    marginHorizontal: spacingX._5,
  },
  dropdownIcon: {
    height: verticalScale(20),
    tintColor: colors.neutral300,
  },
});
