import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Animated,
  ScrollView,
} from "react-native";
import React, { useEffect, useState, useRef } from "react";
import { colors, radius, spacingX, spacingY } from "@/constants/theme";
import { scale, verticalScale } from "@/utils/styling";
import ModalWrapper from "@/components/ModalWrapper";
import Header from "@/components/Header";
import BackButton from "@/components/BackButton";

import * as Icon from "phosphor-react-native";
import Typo from "@/components/Typo";
import Input from "@/components/Input";
import { TransactionType } from "@/types";
import Button from "@/components/Button";
import { useAuth } from "@/contexts/authContext";
import Toast from 'react-native-toast-message';

import { useLocalSearchParams, useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import ImageUpload from "@/components/ImageUpload";
import { resolveTime, formatDateShort } from "@/utils/dateHelper";

import CustomAlert from "@/components/CustomAlert";
import { Dropdown } from "react-native-element-dropdown";
import { expenseCategories, transactionTypes } from "@/constants/data";
import { useData } from "@/contexts/dataContext";

import DateTimePicker from "@react-native-community/datetimepicker";
import { createOrUpdateTransaction, deleteTransaction } from "@/services/transactionService";
import { useTheme } from "@/contexts/themeContext";
import { addNotification } from "@/services/notificationService";
import { scheduleLocalNotification } from "@/services/expoNotificationService";
import { analyzeReceiptImage } from "@/services/aiService";

const TransactionModal = () => {
  const { user } = useAuth();
  const { colors: themeColors, isDark } = useTheme();
  const [transaction, setTransaction] = useState<TransactionType>({
    type: "expense",
    amount: 0,
    description: "",
    category: "",
    date: new Date(),
    walletId: "",
    image: null,
    uid: user?.uid || "",
  });

  const [loading, setLoading] = useState(false);
  const [deleteAlertVisible, setDeleteAlertVisible] = useState(false);
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [analyzingReceipt, setAnalyzingReceipt] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0.3)).current;
  const router = useRouter();

  const [showDatePicker, setShowDatePicker] = useState(false);
  const { wallets: allWallets, budgets, transactions, loading: dataLoading } = useData();

  const wallets = React.useMemo(() => {
    return [...allWallets].sort((a, b) => {
      const aCreated = a.created as any;
      const bCreated = b.created as any;
      const aTime = resolveTime(aCreated);
      const bTime = resolveTime(bCreated);
      return bTime - aTime;
    });
  }, [allWallets]);



  useEffect(() => {
    if (analyzingReceipt) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(fadeAnim, {
            toValue: 0.3,
            duration: 800,
            useNativeDriver: true,
          })
        ])
      ).start();
    }
  }, [analyzingReceipt, fadeAnim]);



  type paramType = {
    id: string;
    type: string;
    amount: string;
    category? : string;
    date: string;
    description?: string;
    image?: any;
    uid?: string;
    walletId: string;
    scan?: string;
  }

  const oldTransaction: paramType =
    useLocalSearchParams();

  const triggerScan = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (!permissionResult.granted) {
        Toast.show({ type: 'error', text1: 'Permission required', text2: 'Permission to access the camera is required.' });
        return;
    }

    const result = await ImagePicker.launchCameraAsync({
        allowsEditing: false,
        quality: 0.2,
        base64: true,
    });

    if (!result.canceled && result.assets?.length) {
        const file = result.assets[0];
        setTransaction(prev => ({ ...prev, image: file }));
        if (file.base64) {
          setAnalyzingReceipt(true);
          const aiData = await analyzeReceiptImage(file.base64);
          setAnalyzingReceipt(false);
          
          if (aiData && aiData.error) {
            Toast.show({ type: 'error', text1: 'Scan Failed', text2: aiData.error });
          } else if (aiData && aiData.isReceipt === false) {
            Toast.show({ type: 'error', text1: 'Not a Receipt', text2: 'This image does not appear to be a valid receipt or invoice.' });
          } else if (aiData) {
            setTransaction(prev => ({
              ...prev,
              amount: aiData.amount || prev.amount,
              category: aiData.category || prev.category,
              description: aiData.description || prev.description,
              type: 'expense'
            }));
            Toast.show({ type: 'success', text1: 'Magic Scan', text2: 'Receipt details automatically filled!' });
          } else {
            Toast.show({ type: 'error', text1: 'Scan Failed', text2: 'Could not read receipt details.' });
          }
        }
    }
  };

  const startOfMonth = React.useMemo(() => {
    const d = new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const monthTransactions = React.useMemo(() => {
    const limitTime = startOfMonth.getTime();
    return transactions.filter((tx) => {
      const txTime = resolveTime(tx.date);
      return txTime >= limitTime;
    });
  }, [transactions, startOfMonth]);

  const spentByCategory = React.useMemo(() => {
    const totals: { [category: string]: number } = {};
    monthTransactions.forEach((tx) => {
      if (tx.id === oldTransaction?.id) return;
      if (tx.type === "expense" && tx.category) {
        totals[tx.category] = (totals[tx.category] || 0) + Number(tx.amount);
      }
    });
    return totals;
  }, [monthTransactions, oldTransaction?.id]);

  const getBudgetWarning = () => {
    if (transaction.type !== "expense" || !transaction.category || !transaction.amount) {
      return null;
    }

    const activeBudget = budgets.find((b) => b.category === transaction.category);
    if (!activeBudget) return null;

    const currentSpent = spentByCategory[transaction.category] || 0;
    const newSpent = currentSpent + Number(transaction.amount);

    if (newSpent > activeBudget.amount) {
      const exceededBy = newSpent - activeBudget.amount;
      const categoryLabel = expenseCategories[transaction.category]?.label || transaction.category;
      return {
        exceededBy,
        limit: activeBudget.amount,
        spent: currentSpent,
        categoryLabel,
      };
    }

    return null;
  };

  const warning = getBudgetWarning();

  const onDateChange = (event: any, date: any) => {
    const currentDate = date || transaction.date;
    setTransaction({ ...transaction, date: currentDate });
    setShowDatePicker(Platform.OS === "ios" ? true : false);
  };

  useEffect(() => {
      if (oldTransaction?.id) {
        setTransaction({
         type: oldTransaction?.type,
         amount: Number(oldTransaction.amount),
         description: oldTransaction.description || "",
         category: oldTransaction?.category || "",
         date: new Date(oldTransaction?.date),
         walletId: oldTransaction?.walletId,
         image: oldTransaction?.image,
         uid: user?.uid || "",
        });
      } else if (oldTransaction?.walletId) {
        setTransaction((prev) => ({
          ...prev,
          walletId: oldTransaction.walletId,
        }));
      } else if (wallets.length > 0) {
        let defaultWalletId = wallets[0].id;
        if (transactions && transactions.length > 0) {
          const sortedTx = [...transactions].sort((a, b) => {
            return resolveTime(b.date) - resolveTime(a.date);
          });
          const lastUsedWalletId = sortedTx[0].walletId;
          if (wallets.some(w => w.id === lastUsedWalletId)) {
            defaultWalletId = lastUsedWalletId!;
          }
        }

        setTransaction((prev) => ({
          ...prev,
          walletId: defaultWalletId,
        }));
      }
  },[wallets.length, wallets, transactions, oldTransaction.amount, oldTransaction?.category, oldTransaction?.date, oldTransaction.description, oldTransaction?.id, oldTransaction?.image, oldTransaction?.type, oldTransaction.walletId, user?.uid])

  const onSubmit = async () => {
    if (loading) return;
    if (!user?.uid) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'You must be logged in to do this.' });
      return;
    }

    if (wallets.length === 0) {
      Toast.show({ type: 'error', text1: 'Wallet Required', text2: 'Please create a wallet first before adding a transaction.' });
      return;
    }

    const { type, amount, description, category, date, walletId, image } =
      transaction;

    const missing: string[] = [];
    if (!walletId) missing.push("wallet");
    if (!date) missing.push("date");
    if (!amount) missing.push("amount");
    if (type === 'expense' && !category) missing.push("category");

    if (missing.length > 0) {
      setMissingFields(missing);
      Toast.show({ type: 'error', text1: 'Transaction', text2: "Please fill all the required fields" });
      return;
    }

    setMissingFields([]);

    let transactionData: TransactionType = {
      type,
      amount: Number(amount),
      description,
      category,
      date,
      walletId,
      image: image ? image : null,
      uid: user.uid,
    };

    if(oldTransaction?.id) transactionData.id = oldTransaction?.id;
    setLoading(true);
    
    // Fast fail for offline mode
    const timeoutPromise = new Promise<{success: boolean, msg: string, offline?: boolean}>((resolve) => 
      setTimeout(() => resolve({ success: true, msg: "Saved offline. Connect to internet to sync.", offline: true }), 3000)
    );
    
    const res = await Promise.race([ createOrUpdateTransaction(transactionData) as Promise<any>, timeoutPromise ]);
    setLoading(false);
    if (res?.success) {
      if (!oldTransaction?.id && transaction.type === 'expense' && warning && user?.uid) {
        const title = "Budget Exceeded! 🚨";
        const message = `You've exceeded your ${warning.categoryLabel} budget by ${user.currency || "$"}${warning.exceededBy.toFixed(2)}.`;
        
        // 1. Add to In-App Inbox
        await addNotification({
          uid: user.uid,
          title,
          message,
          type: "budget_alert",
          read: false,
        });

        // 2. Fire OS-Level Mobile Notification (if enabled)
        if (user.pushNotificationsEnabled) {
          await scheduleLocalNotification(title, message);
        }
      }
      if (res.offline) {
        Toast.show({ type: 'info', text1: 'Offline Mode', text2: res.msg });
      }
      router.back();
    }
    else {
      Toast.show({ type: 'error', text1: 'Transaction', text2: res?.msg || "Failed to create transaction" });
    }
  };

  const onDelete = async () => {
    if (!oldTransaction?.id) return;
    setDeleteAlertVisible(false);
    setLoading(true);
    const res = await deleteTransaction(oldTransaction?.id, oldTransaction.walletId);
    setLoading(false);
    if (res.success) {
      router.back();
    } else {
      Toast.show({ type: 'error', text1: 'Transaction', text2: res.msg });
    }
  };

  const showDeleteAlert = () => {
    setDeleteAlertVisible(true);
  };

  return (
    <ModalWrapper>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Header
          title={oldTransaction?.id ? "Update Transaction" : "New Transaction"}
          leftIcon={<BackButton />}
          style={{ marginBottom: spacingY._20, marginTop: spacingY._10 }}
        />

        {/* form */}
        <ScrollView
          contentContainerStyle={styles.form}
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* amount of transaction */}
          <View style={styles.inputContainer}>
            {/* Name Input */}
            <Typo color={themeColors.text} size={16}>
              Amount
            </Typo>
            <Input
              keyboardType="decimal-pad"
              value={transaction.amount ? transaction.amount.toString() : ""}
              containerStyle={missingFields.includes("amount") ? { borderColor: colors.rose, borderWidth: 1.5 } : {}}
              onChangeText={(value: string) =>
                setTransaction({
                  ...transaction,
                  amount: value.replace(/[^0-9.]/g, "").replace(/(\..*?)\..*/g, '$1') as any,
                })
              }
            />
          </View>

          {/* transaction type */}
          <View style={styles.inputContainer}>
            {/* Name Input */}
            <Typo color={themeColors.text} size={16}>
              Type
            </Typo>
            <Dropdown
              style={[styles.dropdownContainer, { borderColor: themeColors.border }]}
              activeColor={themeColors.inputBg}
              selectedTextStyle={[styles.dropdownSelectedText, { color: themeColors.text }]}
              iconStyle={[styles.dropdownIcon, { tintColor: themeColors.textLighter }]}
              data={transactionTypes}
              maxHeight={300}
              labelField="label"
              valueField="value"
              itemTextStyle={[styles.dropdownItemText, { color: themeColors.text }]}
              itemContainerStyle={[styles.dropdownItemContainer, { backgroundColor: themeColors.inputBg }]}
              containerStyle={[styles.dropdownListContainer, { backgroundColor: themeColors.inputBg, borderColor: themeColors.border }]}
              value={transaction.type}
              onChange={(item) => {
                setTransaction({ ...transaction, type: item.value, category: item.value === 'income' ? "" : transaction.category });
                if (item.value === 'income') {
                   setMissingFields(prev => prev.filter(f => f !== 'category'));
                }
              }}
            />
          </View>

          {/* wallets category*/}
          <View style={styles.inputContainer}>
            {/* Name Input */}
            <Typo color={themeColors.text} size={16}>
              Wallet
            </Typo>
            {dataLoading.wallets ? (
              <View style={[styles.dateInput, { borderColor: themeColors.border, borderWidth: 1, justifyContent: 'center' }]}>
                <Typo color={themeColors.textLighter} size={14} style={{ textAlign: 'center' }}>Loading wallets...</Typo>
              </View>
            ) : wallets.length > 0 ? (
              <Dropdown
                style={[styles.dropdownContainer, { borderColor: missingFields.includes("wallet") ? colors.rose : themeColors.border, borderWidth: missingFields.includes("wallet") ? 1.5 : 1 }]}
                activeColor={themeColors.inputBg}
                placeholderStyle={[styles.dropdownPlaceholder, { color: themeColors.textLighter }]}
                selectedTextStyle={[styles.dropdownSelectedText, { color: themeColors.text }]}
                iconStyle={[styles.dropdownIcon, { tintColor: themeColors.textLighter }]}
                data={wallets.map((wallet) => ({
                  label: `${wallet?.name} (${user?.currency || "$"}${wallet.amount})`,
                  value: wallet.id,
                }))}
                maxHeight={300}
                labelField="label"
                valueField="value"
                itemTextStyle={[styles.dropdownItemText, { color: themeColors.text }]}
                itemContainerStyle={[styles.dropdownItemContainer, { backgroundColor: themeColors.inputBg }]}
                containerStyle={[styles.dropdownListContainer, { backgroundColor: themeColors.inputBg, borderColor: themeColors.border }]}
                placeholder={"Select Wallet"}
                value={transaction.walletId}
                onChange={(item) => {
                  setTransaction({ ...transaction, walletId: item.value || "" });
                  setMissingFields(prev => prev.filter(f => f !== 'wallet'));
                }}
              />
            ) : (
              <TouchableOpacity
                style={[styles.dateInput, { borderColor: colors.rose, borderWidth: 1.5, justifyContent: 'center' }]}
                onPress={() => {
                  router.replace("/(modals)/walletModal" as any);
                }}
              >
                <Typo color={colors.rose} size={14} fontWeight={"600"}>
                  No wallets found. Tap to create one!
                </Typo>
              </TouchableOpacity>
            )}
          </View>

          {/* expense category */}
          {transaction.type === "expense" && (
            <View style={styles.inputContainer}>
              {/* Name Input */}
              <Typo color={themeColors.text} size={16}>
                Expense Category
              </Typo>
              <Dropdown
                style={[styles.dropdownContainer, { borderColor: missingFields.includes("category") ? colors.rose : themeColors.border, borderWidth: missingFields.includes("category") ? 1.5 : 1 }]}
                activeColor={themeColors.inputBg}
                placeholderStyle={[styles.dropdownPlaceholder, { color: themeColors.textLighter }]}
                selectedTextStyle={[styles.dropdownSelectedText, { color: themeColors.text }]}
                iconStyle={[styles.dropdownIcon, { tintColor: themeColors.textLighter }]}
                data={Object.values(expenseCategories)}
                maxHeight={300}
                labelField="label"
                valueField="value"
                itemTextStyle={[styles.dropdownItemText, { color: themeColors.text }]}
                itemContainerStyle={[styles.dropdownItemContainer, { backgroundColor: themeColors.inputBg }]}
                containerStyle={[styles.dropdownListContainer, { backgroundColor: themeColors.inputBg, borderColor: themeColors.border }]}
                placeholder={"Expense Type"}
                value={transaction.category}
                onChange={(item) => {
                  setTransaction({
                    ...transaction,
                    category: item.value || "",
                  });
                  setMissingFields(prev => prev.filter(f => f !== 'category'));
                }}
              />
            </View>
          )}

          {/* date picker */}
          <View style={styles.inputContainer}>
            {/* Name Input */}
            <Typo color={themeColors.text} size={16}>
              Date
            </Typo>
            {!showDatePicker && (
              <Pressable
                style={[styles.dateInput, { borderColor: missingFields.includes("date") ? colors.rose : themeColors.border, borderWidth: missingFields.includes("date") ? 1.5 : 1 }]}
                onPress={() => setShowDatePicker(true)}
              >
                <Typo size={14}>
                  {formatDateShort(transaction.date, true)}
                </Typo>
              </Pressable>
            )}

            {showDatePicker && (
              <View style={Platform.OS === "ios" ? styles.iosDatePicker : {}}>
                <DateTimePicker
                  themeVariant={isDark ? "dark" : "light"}
                  value={transaction.date as Date}
                  textColor={themeColors.text}
                  mode="date"
                  display={Platform.OS === "ios" ? "spinner" : "default"}
                  onChange={onDateChange}
                />
                {Platform.OS === "ios" && (
                  <TouchableOpacity
                    style={[styles.datePickerButton, { backgroundColor: themeColors.border }]}
                    onPress={() => setShowDatePicker(false)}
                  >
                    <Typo size={15} fontWeight={"500"}>
                      OK
                    </Typo>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>



          {/* Budget warning alert */}
          {warning && (
            <View style={[styles.warningBanner, { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.1)', borderColor: colors.rose }]}>
              <Icon.WarningIcon size={verticalScale(20)} color={colors.rose} weight="bold" />
              <View style={{ flex: 1 }}>
                <Typo color={colors.rose} size={14} fontWeight="600">
                  Budget Warning
                </Typo>
                <Typo color={themeColors.text} size={13} style={{ marginTop: 2 }}>
                  This will exceed your monthly budget for <Text style={{ fontWeight: "bold" }}>{warning.categoryLabel}</Text> by <Text style={{ fontWeight: "bold" }}>{user?.currency || "$"}{warning.exceededBy.toFixed(0)}</Text>! (Limit: {user?.currency || "$"}{warning.limit.toFixed(0)})
                </Typo>
              </View>
            </View>
          )}

          {/* transaction description */}
          <View style={styles.inputContainer}>
            <View style={styles.flexRow}>
              <Typo color={themeColors.text} size={16}>
                Description
              </Typo>
              <Typo color={themeColors.textLighter} size={14}>
                (optional)
              </Typo>
            </View>

            <Input
              //   placeholder="Salary, Cash, etc."
              value={transaction.description}
              multiline
              containerStyle={{
                flexDirection: "row",
                height: verticalScale(100),
                alignItems: "flex-start",
                paddingVertical: 15,
              }}
              onChangeText={(value: string) =>
                setTransaction({ ...transaction, description: value })
              }
            />
          </View>

          <View style={styles.inputContainer}>
            {/* Name Input */}
            <View style={styles.flexRow}>
              <Typo color={themeColors.text} size={16}>
                Receipt
              </Typo>
              <Typo color={themeColors.textLighter} size={14}>
                (optional)
              </Typo>
            </View>
            <ImageUpload
              file={transaction.image}
              onClear={() => setTransaction({ ...transaction, image: null })}
              onSelect={(file) => {
                setTransaction({ ...transaction, image: file });
              }}
              placeholder="Upload Image"
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {analyzingReceipt && (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', zIndex: 100 }]}>
          <Animated.View style={{ opacity: fadeAnim, marginBottom: 15, alignItems: 'center' }}>
            <Icon.SparkleIcon size={scale(55)} color={colors.primary} weight="fill" />
            <Typo color={colors.white} size={18} fontWeight="700" style={{ marginTop: 15 }}>Analyzing Receipt...</Typo>
          </Animated.View>
        </View>
      )}

      {/* Floating Magic Scan Button */}
      {!oldTransaction?.id && !analyzingReceipt && wallets.length > 0 && (
        <View style={{
          position: 'absolute',
          bottom: verticalScale(100),
          right: spacingX._20,
          alignItems: 'center',
          zIndex: 90,
        }}>
          <TouchableOpacity
            onPress={triggerScan}
            style={{
              height: verticalScale(55),
              width: verticalScale(55),
              borderRadius: 100,
              backgroundColor: colors.primary,
              justifyContent: 'center',
              alignItems: 'center',
              shadowColor: colors.primary,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.4,
              shadowRadius: 5,
              elevation: 5,
            }}
          >
            <Icon.SparkleIcon size={verticalScale(28)} color={colors.black} weight="fill" />
          </TouchableOpacity>
          <Typo 
            color={themeColors.text} 
            size={12} 
            fontWeight="700" 
            style={{ marginTop: spacingY._5, textShadowColor: 'rgba(0,0,0,0.1)', textShadowOffset: {width:0, height:1}, textShadowRadius: 2 }}
          >
            Scan Receipt
          </Typo>
        </View>
      )}

      {/* footer */}
      <View style={[styles.footer, { borderTopColor: themeColors.border }]}>
        {oldTransaction?.id && !loading && (
          <Button
            testID="delete-transaction-btn"
            onPress={showDeleteAlert}
            style={{
              backgroundColor: colors.rose,
              paddingHorizontal: spacingX._15,
            }}
          >
            <Icon.TrashIcon
              size={verticalScale(24)}
              color={colors.white}
              weight="bold"
            />
          </Button>
        )}
        <Button onPress={onSubmit} loading={loading} style={{ flex: 1 }}>
          <Typo color={colors.black} fontWeight={"700"}>
            {oldTransaction?.id ? "Update Transaction" : "Add Transaction"}
          </Typo>
        </Button>
      </View>

      <CustomAlert
        visible={deleteAlertVisible}
        title="Confirm"
        message={"Are you sure you want to delete this transaction?\nThis action cannot be undone."}
        onCancel={() => setDeleteAlertVisible(false)}
        onConfirm={onDelete}
        confirmText="Delete"
        loading={loading}
      />
    </ModalWrapper>
  );
};

export default TransactionModal;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacingY._20,
  },
  form: {
    gap: spacingY._20,
    paddingVertical: spacingY._15,
    paddingBottom: spacingY._40,
  },
  footer: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    paddingHorizontal: spacingX._20,
    gap: scale(12),
    paddingTop: spacingY._15,
    borderTopColor: colors.neutral700,
    marginBottom: spacingY._5,
    borderTopWidth: 1,
  },
  inputContainer: {
    gap: spacingY._10,
  },

  iosDropDown: {
    flexDirection: "row",
    height: verticalScale(54),
    alignItems: "center",
    justifyContent: "center",
    fontSize: verticalScale(14),
    borderWidth: 1,
    color: colors.white,
    borderColor: colors.neutral300,
    borderRadius: radius._17,
    borderCurve: "continuous",
    paddingHorizontal: spacingX._15,
  },

  androidDropDown: {
    // flexDirection: "row",
    height: verticalScale(54),
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    fontSize: verticalScale(14),
    color: colors.white,
    borderColor: colors.neutral300,
    borderRadius: radius._17,
    borderCurve: "continuous",
  },
  flexRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacingX._5,
  },
  dateInput: {
    flexDirection: "row",
    height: verticalScale(54),
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.neutral300,
    borderRadius: radius._17,
    borderCurve: "continuous",
    paddingHorizontal: spacingX._15,
  },

  iosDatePicker: {
    // backgroundColor: "red",
  },
  datePickerButton: {
    backgroundColor: colors.neutral700,
    alignSelf: "flex-end",
    padding: spacingY._7,
    marginRight: spacingX._7,
    paddingHorizontal: spacingY._15,
    borderRadius: radius._10,
  },
  dropdownContainer: {
    height: verticalScale(54),
    borderWidth: 1,
    borderColor: colors.neutral300,
    paddingHorizontal: spacingX._15,
    borderRadius: radius._15,
    borderCurve: "continuous",
  },
  dropdownItemText: { color: colors.white },
  dropdownSelectedText: {
    color: colors.white,
    fontSize: verticalScale(14),
  },
  dropdownListContainer: {
    backgroundColor: colors.neutral900,
    borderRadius: radius._15,
    borderCurve: "continuous",
    paddingVertical: spacingY._7,
    top: 5,
    borderColor: colors.neutral500,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.15,
    shadowRadius: 15,
    elevation: 5,
  },
  dropdownPlaceholder: {
    color: colors.white,
  },

  dropdownItemContainer: {
    borderRadius: radius._15,
    marginHorizontal: spacingX._7,
  },

  dropdownIcon: {
    height: verticalScale(30),
    tintColor: colors.neutral300,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: scale(10),
    borderWidth: 1,
    padding: spacingY._12,
    borderRadius: radius._15,
    marginTop: spacingY._5,
  },
});
