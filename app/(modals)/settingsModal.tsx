import { ActivityIndicator, Platform, StyleSheet, TouchableOpacity, View, Switch, ScrollView } from "react-native";
import React, { useState, useEffect } from "react";
import * as LocalAuthentication from 'expo-local-authentication';
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
import Input from "@/components/Input";
import { deleteUserAccountData, resetUserAccountData } from "@/services/userService";
import { deleteUser, EmailAuthProvider, GoogleAuthProvider, reauthenticateWithCredential } from "firebase/auth";

import { useRouter } from "expo-router";
import { useTheme } from "@/contexts/themeContext";
import { registerForPushNotificationsAsync, scheduleDailyReminder, cancelAllScheduledNotifications } from "@/services/expoNotificationService";
// cspell:disable-next-line
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';

let GoogleSignin: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  GoogleSignin = require('@react-native-google-signin/google-signin').GoogleSignin;
} catch {
  // Ignore
}

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
  const [reAuthPassword, setReAuthPassword] = useState("");
  const isPasswordUser = auth.currentUser?.providerData[0]?.providerId === "password";

  // App Data Reset state
  const [resetAlertVisible, setResetAlertVisible] = useState(false);
  const [confirmResetVisible, setConfirmResetVisible] = useState(false);

  const selectedCurrency = user?.currency || "$";
  const [localPushEnabled, setLocalPushEnabled] = useState(user?.pushNotificationsEnabled || false);
  const [appLockEnabled, setAppLockEnabled] = useState(user?.appLockEnabled || false);
  const [appLockTimeout, setAppLockTimeout] = useState(user?.appLockTimeout || 0);

  // Sync toggle with the live user profile — handles the case where user data loads
  // after the modal has already rendered (e.g., first app open, slow network)
  useEffect(() => {
    setLocalPushEnabled(user?.pushNotificationsEnabled || false);
    setAppLockEnabled(user?.appLockEnabled || false);
    setAppLockTimeout(user?.appLockTimeout || 0);
  }, [user?.pushNotificationsEnabled, user?.appLockEnabled, user?.appLockTimeout]);

  // Compute the reminder time date from the stored string, only when it changes.
  // Avoids creating a new Date object on every render which caused picker flicker.
  const reminderDate = React.useMemo(() => {
    const d = new Date();
    if (user?.reminderTime) {
      const [hours, minutes] = user.reminderTime.split(":");
      d.setHours(Number(hours), Number(minutes), 0, 0);
    } else {
      d.setHours(20, 0, 0, 0); // Default: 8:00 PM
    }
    return d;
  }, [user?.reminderTime]);

  // Local state for the picker — initialized from the memoized value
  const [localReminderDate, setLocalReminderDate] = useState(reminderDate);
  const [showTimePicker, setShowTimePicker] = useState(false);


  const handleToggleAppLock = async (value: boolean) => {
    if (!user?.uid) return;
    setLoading(true);
    try {
        if (value) {
            const hasHardware = await LocalAuthentication.hasHardwareAsync();
            if (!hasHardware) {
                Toast.show({ type: "error", text1: "Error", text2: "Biometric hardware not found on this device." });
                setLoading(false);
                return;
            }
            const isEnrolled = await LocalAuthentication.isEnrolledAsync();
            if (!isEnrolled) {
                Toast.show({ type: "error", text1: "Error", text2: "No biometrics enrolled. Please set up device lock." });
                setLoading(false);
                return;
            }
            // Ask them to authenticate right now to prove it works before enabling
            const authRes = await LocalAuthentication.authenticateAsync({
                promptMessage: "Authenticate to enable App Lock",
            });
            if (!authRes.success) {
                Toast.show({ type: "error", text1: "Authentication failed", text2: "Could not verify identity." });
                setLoading(false);
                return;
            }
        }
        
        setAppLockEnabled(value);
        const userRef = doc(firestore, "users", user.uid);
        await updateDoc(userRef, { appLockEnabled: value });
        await updateUserData(user.uid);
        
        Toast.show({
            type: "success",
            text1: "Settings Updated",
            text2: `App Lock ${value ? "Enabled" : "Disabled"}.`,
        });
    } catch (error: any) {
        Toast.show({
            type: "error",
            text1: "Error",
            text2: error.message || "Failed to update App Lock settings",
        });
    } finally {
        setLoading(false);
    }
  };

  const handleAppLockTimeoutChange = async (item: { label: string; value: number }) => {
    if (!user?.uid) return;
    setLoading(true);
    try {
      const userRef = doc(firestore, "users", user.uid);
      await updateDoc(userRef, { appLockTimeout: item.value });
      setAppLockTimeout(item.value);
      await updateUserData(user.uid);
      Toast.show({
        type: "success",
        text1: "Success",
        text2: `App Lock timeout updated`,
      });
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: error.message || "Failed to update timeout",
      });
    } finally {
      setLoading(false);
    }
  };

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
        await scheduleDailyReminder(localReminderDate.getHours(), localReminderDate.getMinutes());
        
        // Fire a test notification so they know it works immediately
        import("@/services/expoNotificationService").then(({ scheduleLocalNotification }) => {
            scheduleLocalNotification(
                "Notifications Enabled! 🔔",
                `You will now receive alerts for upcoming bills, and a daily reminder to log expenses at ${localReminderDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`
            );
        });

      } else {
        await cancelAllScheduledNotifications();
      }
      
      setLocalPushEnabled(value);
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
      setLocalReminderDate(date);
      const timeString = `${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`;
      
      setLoading(true);
      try {
        const userRef = doc(firestore, "users", user.uid);
        await updateDoc(userRef, { reminderTime: timeString });
        await updateUserData(user.uid);
        
        if (localPushEnabled) {
          await scheduleDailyReminder(date.getHours(), date.getMinutes());
        }
        
        Toast.show({
          type: "success",
          text1: "Reminder Time Updated",
          text2: `Your daily reminder is set for ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`,
        });
      } catch {
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
    if (!user?.uid || !auth.currentUser) return;
    
    setLoading(true);
    
    try {
      const providerId = auth.currentUser.providerData[0]?.providerId;
      
      // 1. Proactively Re-Authenticate
      if (providerId === "password") {
         if (!reAuthPassword) {
           Toast.show({ type: "error", text1: "Error", text2: "Please enter your password to confirm." });
           setLoading(false);
           return;
         }
         const credential = EmailAuthProvider.credential(auth.currentUser.email || "", reAuthPassword);
         await reauthenticateWithCredential(auth.currentUser, credential);
      } else if (providerId === "google.com") {
         if (GoogleSignin) {
           await GoogleSignin.hasPlayServices();
           const userInfo = await GoogleSignin.signIn();
           const credential = GoogleAuthProvider.credential(userInfo.data.idToken);
           await reauthenticateWithCredential(auth.currentUser, credential);
         }
      }
      
      // 2. Freshly authenticated, wipe DB
      const dbDeletePromise = deleteUserAccountData(user.uid);
      const timeoutPromise = new Promise<{success: boolean, msg: string}>((resolve) => 
        setTimeout(() => resolve({ success: false, msg: "Database deletion timed out. Please try again." }), 15000)
      );
      
      const dbRes = await Promise.race([dbDeletePromise, timeoutPromise]);
      
      if (!dbRes.success) {
        Toast.show({ type: "error", text1: "Error", text2: dbRes.msg || "Failed to clear database records" });
        setLoading(false);
        return;
      }

      setConfirmDeleteVisible(false);
      
      // Hide the loading spinner before triggering Firebase Auth deletion
      setLoading(false);

      // 3. Delete the user from Auth
      await deleteUser(auth.currentUser);

      Toast.show({
        type: "success",
        text1: "Account Deleted",
        text2: "Your account and data have been permanently deleted.",
      });

    } catch (error: any) {
      setLoading(false);
      
      let errorMsg = "An unexpected error occurred. Please try again.";
      if (error.code === "auth/invalid-credential" || error.code === "auth/wrong-password") {
        errorMsg = "Incorrect password. Please try again.";
      } else if (error.code === "auth/network-request-failed") {
        errorMsg = "Network error. Please check your connection.";
      } else if (error.code === "auth/too-many-requests") {
        errorMsg = "Too many failed attempts. Please try again later.";
      } else if (error.message) {
        // Fallback for non-auth errors or unmapped codes
        errorMsg = "Failed to authenticate or delete account";
      }

      Toast.show({
        type: "error",
        text1: "Error",
        text2: errorMsg,
      });
    } finally {
      setReAuthPassword("");
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

        <ScrollView contentContainerStyle={{ paddingBottom: verticalScale(40) }} showsVerticalScrollIndicator={false}>

        <View style={styles.content}>
          {/* General Section */}
          <View style={[styles.section, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
            <View style={[styles.sectionHeader, { borderBottomColor: themeColors.border }]}>
              <Icons.FadersHorizontalIcon size={24} color={themeColors.textLighter} weight="fill" />
              <Typo size={16} fontWeight="600" color={themeColors.text}>
                General
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

            <TouchableOpacity
              style={styles.settingRow}
              onPress={() => router.push("/(modals)/tutorialModal")}
              disabled={loading}
              activeOpacity={0.7}
            >
              <Icons.PlayCircleIcon size={24} color={themeColors.textLighter} weight="fill" />
              <Typo size={15} color={themeColors.textLighter} style={{ flex: 1, paddingVertical: 5 }}>
                Replay App Tutorial
              </Typo>
              <Icons.CaretRight size={verticalScale(20)} color={themeColors.textLighter} weight="bold" />
            </TouchableOpacity>
          </View>

          {/* Security & Alerts Section */}
          <View style={[styles.section, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
            <View style={[styles.sectionHeader, { borderBottomColor: themeColors.border }]}>
              <Icons.ShieldCheck size={24} color={themeColors.textLighter} weight="fill" />
              <Typo size={16} fontWeight="600" color={themeColors.text}>
                Security & Alerts
              </Typo>
            </View>

            <View style={styles.settingRow}>
              <Typo size={15} color={themeColors.textLighter} style={{ flex: 1 }}>
                Push Notifications
              </Typo>
              <Switch
                value={localPushEnabled}
                onValueChange={handleTogglePushNotifications}
                disabled={loading}
                trackColor={{ false: themeColors.border, true: colors.primary }}
                thumbColor={colors.white}
              />
            </View>

            {localPushEnabled && (
              <>
                <View style={[styles.divider, { backgroundColor: themeColors.border, marginLeft: spacingX._20 }]} />
                <TouchableOpacity
                  style={styles.settingRow}
                  onPress={() => setShowTimePicker(true)}
                  disabled={loading}
                >
                  <Typo size={15} color={themeColors.textLighter} style={{ flex: 1, paddingLeft: spacingX._15 }}>
                    Reminder to log expenses
                  </Typo>
                  <Typo size={15} color={colors.primary} fontWeight="600">
                    {localReminderDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Typo>
                </TouchableOpacity>

                {showTimePicker && (
                  <DateTimePicker
                    value={localReminderDate}
                    mode="time"
                    display="default"
                    onChange={handleTimeChange}
                  />
                )}
              </>
            )}

            <View style={[styles.divider, { backgroundColor: themeColors.border }]} />

            <View style={styles.settingRow}>
              <Typo size={15} color={themeColors.textLighter} style={{ flex: 1 }}>
                App Lock (Biometrics)
              </Typo>
              <Switch
                value={appLockEnabled}
                onValueChange={handleToggleAppLock}
                disabled={loading}
                trackColor={{ false: themeColors.border, true: colors.primary }}
                thumbColor={colors.white}
              />
            </View>

            {appLockEnabled && (
              <Animated.View entering={FadeInUp.duration(300)} exiting={FadeOutUp.duration(300)} style={{ gap: spacingY._15 }}>
                <View style={[styles.divider, { backgroundColor: themeColors.border, marginLeft: spacingX._20 }]} />
                <View style={[styles.settingRow, { paddingLeft: spacingX._15 }]}>
                  <Typo size={15} color={themeColors.textLighter} style={{ flex: 1 }}>
                    Require Passcode
                  </Typo>
                  <Dropdown
                    style={[styles.dropdownContainer, { backgroundColor: themeColors.inputBg, borderColor: themeColors.border, flex: 1, marginLeft: 10, maxWidth: 160 }]}
                    activeColor={themeColors.card}
                    selectedTextStyle={[styles.dropdownSelectedText, { color: themeColors.text }]}
                    iconStyle={[styles.dropdownIcon, { tintColor: themeColors.textLighter }]}
                    data={[
                      { label: "Immediately", value: 0 },
                      { label: "After 1 minute", value: 60000 },
                      { label: "After 15 minutes", value: 900000 },
                      { label: "After 1 hour", value: 3600000 },
                    ]}
                    maxHeight={250}
                    labelField="label"
                    valueField="value"
                    itemTextStyle={[styles.dropdownItemText, { color: themeColors.text }]}
                    itemContainerStyle={[styles.dropdownItemContainer, { backgroundColor: themeColors.inputBg }]}
                    containerStyle={[styles.dropdownListContainer, { backgroundColor: themeColors.inputBg, borderColor: themeColors.border }]}
                    value={appLockTimeout}
                    onChange={handleAppLockTimeoutChange}
                    disable={loading}
                  />
                </View>
              </Animated.View>
            )}

          </View>


          {/* Data Management Section */}
          <View style={[styles.section, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
            <View style={[styles.sectionHeader, { borderBottomColor: themeColors.border }]}>
              <Icons.DatabaseIcon size={24} color={themeColors.textLighter} weight="fill" />
              <Typo size={16} fontWeight="600" color={themeColors.text}>
                Data
              </Typo>
            </View>
            
            <TouchableOpacity
              style={styles.settingRow}
              onPress={() => router.push("/(modals)/exportModal")}
              disabled={loading}
              activeOpacity={0.7}
            >
              <Icons.ExportIcon size={24} color={themeColors.textLighter} weight="bold" />
              <Typo size={15} color={themeColors.textLighter} style={{ flex: 1, paddingVertical: 5 }}>
                Export Transactions to CSV
              </Typo>
              <Icons.CaretRight size={verticalScale(20)} color={themeColors.textLighter} weight="bold" />
            </TouchableOpacity>
          </View>

          {/* Danger Zone */}
          <View style={[styles.section, styles.dangerSection, { backgroundColor: themeColors.card }]}>
            <View style={[styles.sectionHeader, { borderBottomColor: themeColors.border }]}>
              <Icons.WarningIcon size={24} color={colors.rose} weight="fill" />
              <Typo size={16} fontWeight="600" color={colors.rose}>
                Danger Zone
              </Typo>
            </View>

            <TouchableOpacity
              style={styles.actionRow}
              onPress={() => setResetAlertVisible(true)}
              disabled={loading}
            >
              <Icons.ArrowClockwiseIcon size={24} color={colors.rose} weight="bold" />
              <Typo size={15} color={colors.rose} style={{ flex: 1 }} fontWeight="500">
                Reset App Data (Clear Records)
              </Typo>
            </TouchableOpacity>

            <View style={[styles.divider, { backgroundColor: "rgba(239, 68, 68, 0.2)" }]} />

            <TouchableOpacity
              style={styles.actionRow}
              onPress={() => setDeleteAlertVisible(true)}
              disabled={loading}
            >
              <Icons.TrashIcon size={24} color={colors.rose} weight="fill" />
              <Typo size={15} color={colors.rose} style={{ flex: 1 }} fontWeight="500">
                Delete Account & Clear Data
              </Typo>
            </TouchableOpacity>
          </View>
        </View>
        </ScrollView>
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
        message={isPasswordUser ? "Please verify your password to permanently delete your account and data. You cannot undo this." : "Are you absolutely sure? This is your last warning before your account is permanently deleted."}
        onCancel={() => {
          setConfirmDeleteVisible(false);
          setReAuthPassword("");
        }}
        onConfirm={handleDeleteAccount}
        confirmText="Permanently Delete"
      >
        {isPasswordUser && (
          <View style={{ marginBottom: spacingY._15 }}>
            <Input 
              placeholder="Enter your password"
              value={reAuthPassword}
              onChangeText={setReAuthPassword}
              secureTextEntry
              containerStyle={{ backgroundColor: themeColors.inputBg, borderColor: themeColors.border }}
            />
          </View>
        )}
      </CustomAlert>

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
    gap: spacingX._10,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacingY._5,
    gap: spacingX._10,
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
