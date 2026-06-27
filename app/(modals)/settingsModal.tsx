import { ActivityIndicator, Linking, Platform, StyleSheet, TouchableOpacity, View, Switch } from "react-native";
import React, { useState } from "react";
import { colors, radius, spacingX, spacingY } from "@/constants/theme";
import { verticalScale } from "@/utils/styling";
import ModalWrapper from "@/components/ModalWrapper";
import Header from "@/components/Header";
import BackButton from "@/components/BackButton";
import Typo from "@/components/Typo";
import { useAuth } from "@/contexts/authContext";
import { collection, doc, getDocs, query, updateDoc, where } from "firebase/firestore";
import { auth, firestore } from "@/config/firebase";
import Toast from 'react-native-toast-message';
import { Dropdown } from "react-native-element-dropdown";
import * as Icons from "phosphor-react-native";
import CustomAlert from "@/components/CustomAlert";
import { deleteUserAccountData, resetUserAccountData } from "@/services/userService";
import { deleteUser, signOut } from "firebase/auth";
import { useRouter } from "expo-router";
import { cacheDirectory, writeAsStringAsync, StorageAccessFramework } from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { useTheme } from "@/contexts/themeContext";
import { registerForPushNotificationsAsync, scheduleDailyReminder, cancelAllScheduledNotifications } from "@/services/expoNotificationService";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";

const currencies = [
  { label: "USD ($)", value: "$" },
  { label: "EUR (€)", value: "€" },
  { label: "GBP (£)", value: "£" },
  { label: "INR (₹)", value: "₹" },
  { label: "JPY (¥)", value: "¥" },
  { label: "PKR (Rs.)", value: "Rs." },
];

const SettingsModal = () => {
  const router = useRouter();
  const { user, updateUserData } = useAuth();
  const [loading, setLoading] = useState(false);
  const { theme, setTheme, colors: themeColors } = useTheme();
  
  // Account Deletion state
  const [deleteAlertVisible, setDeleteAlertVisible] = useState(false);
  const [confirmDeleteVisible, setConfirmDeleteVisible] = useState(false);

  // App Data Reset state
  const [resetAlertVisible, setResetAlertVisible] = useState(false);
  const [confirmResetVisible, setConfirmResetVisible] = useState(false);

  const selectedCurrency = user?.currency || "$";
  const pushEnabled = user?.pushNotificationsEnabled || false;
  
  // By default, 8:00 PM if none is set
  const initialReminderDate = new Date();
  if (user?.reminderTime) {
    const [hours, minutes] = user.reminderTime.split(":");
    initialReminderDate.setHours(Number(hours), Number(minutes), 0, 0);
  } else {
    initialReminderDate.setHours(20, 0, 0, 0);
  }
  
  const [reminderDate, setReminderDate] = useState(initialReminderDate);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const handleTogglePushNotifications = async (value: boolean) => {
    if (!user?.uid) return;
    setLoading(true);
    try {
      if (value) {
        const token = await registerForPushNotificationsAsync();
        if (!token) {
          Toast.show({
            type: "error",
            text1: "Permission Denied",
            text2: "You must enable notifications in your phone settings.",
          });
          setLoading(false);
          return;
        }
        await scheduleDailyReminder(reminderDate.getHours(), reminderDate.getMinutes());
      } else {
        await cancelAllScheduledNotifications();
      }
      
      const userRef = doc(firestore, "users", user.uid);
      await updateDoc(userRef, { pushNotificationsEnabled: value });
      await updateUserData(user.uid);
      
      Toast.show({
        type: "success",
        text1: "Settings Updated",
        text2: `Push Notifications ${value ? "Enabled" : "Disabled"}.`,
      });
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: error.message || "Failed to update notification settings",
      });
    } finally {
      setLoading(false);
    }
  };
  const handleTimeChange = async (event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === "android") {
      setShowTimePicker(false);
    }
    
    if (event.type === "set" && date && user?.uid) {
      setReminderDate(date);
      const timeString = `${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`;
      
      setLoading(true);
      try {
        const userRef = doc(firestore, "users", user.uid);
        await updateDoc(userRef, { reminderTime: timeString });
        await updateUserData(user.uid);
        
        if (pushEnabled) {
          await scheduleDailyReminder(date.getHours(), date.getMinutes());
        }
        
        Toast.show({
          type: "success",
          text1: "Reminder Time Updated",
          text2: `Your daily reminder is set for ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`,
        });
      } catch (error: any) {
        Toast.show({
          type: "error",
          text1: "Error",
          text2: "Failed to save reminder time.",
        });
      } finally {
        setLoading(false);
      }
    }
  };

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

  const handleExportCSV = async () => {
    if (!user?.uid) return;
    setLoading(true);
    try {
      // 1. Fetch user transactions from Firestore
      const q = query(
        collection(firestore, "transactions"),
        where("uid", "==", user.uid)
      );
      const querySnapshot = await getDocs(q);
      const transactionsData: any[] = [];
      querySnapshot.forEach((doc) => {
        transactionsData.push({ id: doc.id, ...doc.data() });
      });

      if (transactionsData.length === 0) {
        Toast.show({
          type: "info",
          text1: "Export Report",
          text2: "No transactions found to export.",
        });
        setLoading(false);
        return;
      }

      // Client-side sort by date descending
      transactionsData.sort((a, b) => {
        const secA = a.date?.seconds || 0;
        const secB = b.date?.seconds || 0;
        return secB - secA;
      });

      // 2. Format transactions into CSV format
      const headers = "Date,Type,Category,Amount,Description\n";
      const rows = transactionsData.map((t) => {
        const date = t.date?.seconds 
          ? new Date(t.date.seconds * 1000).toLocaleDateString("en-US") 
          : "";
        const cleanDesc = t.description ? t.description.replace(/"/g, '""') : "";
        return `"${date}","${t.type}","${t.category}",${t.amount},"${cleanDesc}"`;
      }).join("\n");

      const csvContent = headers + rows;
      const fileName = `SpendWise_Transactions_${new Date().toISOString().split('T')[0]}.csv`;

      if (Platform.OS === 'android') {
        // Use StorageAccessFramework to prompt directory picker
        const permissions = await StorageAccessFramework.requestDirectoryPermissionsAsync();
        if (permissions.granted) {
          const directoryUri = permissions.directoryUri;
          const fileUri = await StorageAccessFramework.createFileAsync(
            directoryUri,
            fileName,
            'text/csv'
          );
          await writeAsStringAsync(fileUri, csvContent, { encoding: 'utf8' });
          Toast.show({
            type: "success",
            text1: "Saved to Phone",
            text2: "CSV report successfully saved to your chosen folder.",
          });
        } else {
          Toast.show({
            type: "info",
            text1: "Permission Denied",
            text2: "Could not save file without folder permissions.",
          });
        }
      } else {
        // iOS: use cache directory and share sheet (which contains "Save to Files")
        const fileUri = `${cacheDirectory}${fileName}`;
        await writeAsStringAsync(fileUri, csvContent, { encoding: 'utf8' });

        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(fileUri, {
            mimeType: "text/csv",
            dialogTitle: "Export SpendWise Transactions",
            UTI: "public.comma-separated-values-text",
          });
        } else {
          Toast.show({
            type: "error",
            text1: "Sharing Unavailable",
            text2: "Sharing is not supported on this platform.",
          });
        }
      }
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: "Export Failed",
        text2: error.message || "Failed to generate CSV report.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResetData = async () => {
    if (!user?.uid) return;
    setConfirmResetVisible(false);
    setLoading(true);
    try {
      const res = await resetUserAccountData(user.uid);
      if (res.success) {
        await updateUserData(user.uid);
        Toast.show({
          type: "success",
          text1: "Data Reset",
          text2: "Your transactions and wallets have been cleared.",
        });
        router.back();
      } else {
        Toast.show({
          type: "error",
          text1: "Reset Failed",
          text2: res.msg,
        });
      }
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: error.message || "Failed to reset app data.",
      });
    } finally {
      setLoading(false);
    }
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
          style={{ marginBottom: spacingY._15, marginTop: spacingY._10 }}
        />

        {loading && (
          <View style={styles.loaderOverlay}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        )}

        <View style={styles.content}>
          {/* Preferences Section */}
          <View style={[styles.section, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
            <View style={[styles.sectionHeader, { borderBottomColor: themeColors.border }]}>
              <Icons.CurrencyCircleDollarIcon size={24} color={themeColors.textLighter} />
              <Typo size={16} fontWeight="600" color={themeColors.text}>
                Preferences
              </Typo>
            </View>
            
            <View style={styles.settingRow}>
              <Typo size={15} color={themeColors.textLighter} style={{ flex: 1 }}>
                Preferred Currency
              </Typo>
              <Dropdown
                style={[styles.dropdownContainer, { backgroundColor: themeColors.inputBg, borderColor: themeColors.border }]}
                activeColor={themeColors.card}
                selectedTextStyle={[styles.dropdownSelectedText, { color: themeColors.text }]}
                iconStyle={[styles.dropdownIcon, { tintColor: themeColors.textLighter }]}
                data={currencies}
                maxHeight={250}
                labelField="label"
                valueField="value"
                itemTextStyle={[styles.dropdownItemText, { color: themeColors.text }]}
                itemContainerStyle={[styles.dropdownItemContainer, { backgroundColor: themeColors.inputBg }]}
                containerStyle={[styles.dropdownListContainer, { backgroundColor: themeColors.inputBg, borderColor: themeColors.border }]}
                value={selectedCurrency}
                onChange={handleCurrencyChange}
                disable={loading}
              />
            </View>

            <View style={[styles.divider, { backgroundColor: themeColors.border }]} />

            <View style={styles.settingRow}>
              <Typo size={15} color={themeColors.textLighter} style={{ flex: 1 }}>
                Theme Mode
              </Typo>
              <Dropdown
                style={[styles.dropdownContainer, { backgroundColor: themeColors.inputBg, borderColor: themeColors.border }]}
                activeColor={themeColors.card}
                selectedTextStyle={[styles.dropdownSelectedText, { color: themeColors.text }]}
                iconStyle={[styles.dropdownIcon, { tintColor: themeColors.textLighter }]}
                data={[
                  { label: "Light Mode", value: "light" },
                  { label: "Dark Mode", value: "dark" },
                  { label: "System Default", value: "system" },
                ]}
                maxHeight={200}
                labelField="label"
                valueField="value"
                itemTextStyle={[styles.dropdownItemText, { color: themeColors.text }]}
                itemContainerStyle={[styles.dropdownItemContainer, { backgroundColor: themeColors.inputBg }]}
                containerStyle={[styles.dropdownListContainer, { backgroundColor: themeColors.inputBg, borderColor: themeColors.border }]}
                value={theme}
                onChange={(item) => setTheme(item.value as 'dark' | 'light' | 'system')}
                disable={loading}
              />
            </View>

            <View style={[styles.divider, { backgroundColor: themeColors.border }]} />

            <View style={styles.settingRow}>
              <Typo size={15} color={themeColors.textLighter} style={{ flex: 1 }}>
                Push Notifications
              </Typo>
              <Switch
                value={pushEnabled}
                onValueChange={handleTogglePushNotifications}
                disabled={loading}
                trackColor={{ false: themeColors.border, true: colors.primary }}
                thumbColor={colors.white}
              />
            </View>

            {pushEnabled && (
              <>
                <View style={[styles.divider, { backgroundColor: themeColors.border, marginLeft: spacingX._20 }]} />
                <TouchableOpacity
                  style={styles.settingRow}
                  onPress={() => setShowTimePicker(true)}
                  disabled={loading}
                >
                  <Typo size={15} color={themeColors.textLighter} style={{ flex: 1, paddingLeft: spacingX._15 }}>
                    Daily Reminder Time
                  </Typo>
                  <Typo size={15} color={colors.primary} fontWeight="600">
                    {reminderDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Typo>
                </TouchableOpacity>

                {showTimePicker && (
                  <DateTimePicker
                    value={reminderDate}
                    mode="time"
                    display="default"
                    onChange={handleTimeChange}
                  />
                )}
              </>
            )}
          </View>

          {/* Support Section */}
          <View style={[styles.section, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
            <View style={[styles.sectionHeader, { borderBottomColor: themeColors.border }]}>
              <Icons.QuestionIcon size={24} color={themeColors.textLighter} />
              <Typo size={16} fontWeight="600" color={themeColors.text}>
                Support & Reports
              </Typo>
            </View>

            <TouchableOpacity
              style={styles.actionRow}
              onPress={handleContactSupport}
              disabled={loading}
            >
              <Typo size={15} color={themeColors.textLighter} style={{ flex: 1 }}>
                Contact Support
              </Typo>
              <Icons.EnvelopeIcon size={20} color={themeColors.textLighter} />
            </TouchableOpacity>

            <View style={[styles.divider, { backgroundColor: themeColors.border }]} />

            <TouchableOpacity
              style={styles.actionRow}
              onPress={handleExportCSV}
              disabled={loading}
            >
              <Typo size={15} color={themeColors.textLighter} style={{ flex: 1 }}>
                Export Transactions to CSV
              </Typo>
              <Icons.ExportIcon size={20} color={themeColors.textLighter} />
            </TouchableOpacity>
          </View>

          {/* Danger Zone */}
          <View style={[styles.section, styles.dangerSection, { backgroundColor: themeColors.card }]}>
            <View style={[styles.sectionHeader, { borderBottomColor: themeColors.border }]}>
              <Icons.WarningIcon size={24} color={colors.rose} />
              <Typo size={16} fontWeight="600" color={colors.rose}>
                Danger Zone
              </Typo>
            </View>

            <TouchableOpacity
              style={styles.actionRow}
              onPress={() => setResetAlertVisible(true)}
              disabled={loading}
            >
              <Typo size={15} color={colors.rose} style={{ flex: 1 }} fontWeight="500">
                Reset App Data (Clear Records)
              </Typo>
              <Icons.ArrowClockwiseIcon size={20} color={colors.rose} />
            </TouchableOpacity>

            <View style={[styles.divider, { backgroundColor: "rgba(239, 68, 68, 0.2)" }]} />

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

      {/* Account Deletion Confirmation Alerts */}
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

      <CustomAlert
        visible={confirmDeleteVisible}
        title="Final Confirmation"
        message="Are you absolutely sure? This is your last warning before your account is permanently deleted."
        onCancel={() => setConfirmDeleteVisible(false)}
        onConfirm={handleDeleteAccount}
        confirmText="Permanently Delete"
      />

      {/* App Data Reset Confirmation Alerts */}
      <CustomAlert
        visible={resetAlertVisible}
        title="Reset App Data?"
        message="This will permanently delete all your wallets and transactions. Your login profile remains active. Continue?"
        onCancel={() => setResetAlertVisible(false)}
        onConfirm={() => {
          setResetAlertVisible(false);
          setConfirmResetVisible(true);
        }}
        confirmText="Continue"
      />

      <CustomAlert
        visible={confirmResetVisible}
        title="Final Confirmation"
        message="This is your final warning. Clear all wallets and transactions from database? This cannot be undone."
        onCancel={() => setConfirmResetVisible(false)}
        onConfirm={handleResetData}
        confirmText="Reset All Data"
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
  divider: {
    height: 1,
    backgroundColor: colors.neutral700,
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
