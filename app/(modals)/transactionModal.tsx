import {
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import React, { useEffect, useState } from "react";
import { colors, radius, spacingX, spacingY } from "@/constants/theme";
import { scale, verticalScale } from "@/utils/styling";
import ModalWrapper from "@/components/ModalWrapper";
import Header from "@/components/Header";
import BackButton from "@/components/BackButton";
import { Image } from "expo-image";
import { getProfileImage } from "@/services/imageService";
import { ScrollView } from "react-native";
import * as Icon from "phosphor-react-native";
import Typo from "@/components/Typo";
import Input from "@/components/Input";
import { BudgetType, TransactionType, UserDataType, WalletType } from "@/types";
import Button from "@/components/Button";
import { useAuth } from "@/contexts/authContext";
import Toast from 'react-native-toast-message';
import { updateUser } from "@/services/userService";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import ImageUpload from "@/components/ImageUpload";
import { CreateOrUpdateWallet, deleteWallet } from "@/services/walletService";
import CustomAlert from "@/components/CustomAlert";
import { Dropdown } from "react-native-element-dropdown";
import { expenseCategories, transactionTypes } from "@/constants/data";
import { useData } from "@/contexts/dataContext";
import { Timestamp } from "firebase/firestore";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { createOrUpdateTransaction, deleteTransaction } from "@/services/transactionService";
import { useTheme } from "@/contexts/themeContext";
import { addNotification } from "@/services/notificationService";
import { scheduleLocalNotification } from "@/services/expoNotificationService";

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
  const router = useRouter();
  const [showDatePicker, setShowDatePicker] = useState(false);

  const { wallets: allWallets, budgets, transactions, loading: dataLoading } = useData();
  const walletsLoading = dataLoading.wallets;

  const wallets = React.useMemo(() => {
    return [...allWallets].sort((a, b) => {
      const aCreated = a.created as any;
      const bCreated = b.created as any;
      const aTime = aCreated?.toDate ? aCreated.toDate().getTime() : new Date(aCreated || 0).getTime();
      const bTime = bCreated?.toDate ? bCreated.toDate().getTime() : new Date(bCreated || 0).getTime();
      return bTime - aTime;
    });
  }, [allWallets]);

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
  }

  const oldTransaction: paramType =
    useLocalSearchParams();

  const startOfMonth = React.useMemo(() => {
    const d = new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const monthTransactions = React.useMemo(() => {
    const limitTime = startOfMonth.getTime();
    return transactions.filter((tx) => {
      const txTime = (tx.date as Timestamp)?.toDate().getTime() || new Date(tx.date as string).getTime();
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
    const newSpent = currentSpent + transaction.amount;

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
      }
  },[])

  const onSubmit = async () => {
    const { type, amount, description, category, date, walletId, image } =
      transaction;

    if (!walletId || !date || !amount || (type == 'expense' && !category)) {
      Toast.show({ type: 'error', text1: 'Transaction', text2: "Please fill all the required fields" });
      return;
    }

    let transactionData: TransactionType = {
      type,
      amount,
      description,
      category,
      date,
      walletId,
      image: image ? image : null,
      uid: user?.uid || "",
    };

    if(oldTransaction?.id) transactionData.id = oldTransaction?.id;
    setLoading(true);
    const res = await createOrUpdateTransaction(transactionData) as any;

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
      <View style={styles.container}>
        <Header
          title={oldTransaction?.id ? "Update Transaction" : "New Transaction"}
          leftIcon={<BackButton />}
          style={{ marginBottom: spacingY._10 }}
        />

        {/* form */}
        <ScrollView
          contentContainerStyle={styles.form}
          showsHorizontalScrollIndicator={false}
        >
          {/* transaction type */}
          <View style={styles.inputContainer}>
            {/* Name Input */}
            <Typo color={colors.neutral200} size={16}>
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
                setTransaction({ ...transaction, type: item.value });
              }}
            />
          </View>

          {/* wallets category*/}
          <View style={styles.inputContainer}>
            {/* Name Input */}
            <Typo color={colors.neutral200} size={16}>
              Wallet
            </Typo>
            <Dropdown
              style={[styles.dropdownContainer, { borderColor: themeColors.border }]}
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
              }}
            />
          </View>

          {/* expense category */}
          {transaction.type === "expense" && (
            <View style={styles.inputContainer}>
              {/* Name Input */}
              <Typo color={colors.neutral200} size={16}>
                Expense Category
              </Typo>
              <Dropdown
                style={[styles.dropdownContainer, { borderColor: themeColors.border }]}
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
                }}
              />
            </View>
          )}

          {/* date picker */}
          <View style={styles.inputContainer}>
            {/* Name Input */}
            <Typo color={colors.neutral200} size={16}>
              Date
            </Typo>
            {!showDatePicker && (
              <Pressable
                style={[styles.dateInput, { borderColor: themeColors.border }]}
                onPress={() => setShowDatePicker(true)}
              >
                <Typo size={14}>
                  {(transaction.date as Date).toDateString()}
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

          {/* amount of transaction */}
          <View style={styles.inputContainer}>
            {/* Name Input */}
            <Typo color={colors.neutral200} size={16}>
              Amount
            </Typo>
            <Input
              //   placeholder="Salary, Cash, etc."
              keyboardType="numeric"
              value={transaction.amount?.toString()}
              onChangeText={(value: string) =>
                setTransaction({
                  ...transaction,
                  amount: Number(value.replace(/[^0-9]/g, "")),
                })
              }
            />
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
              <Typo color={colors.neutral200} size={16}>
                Description
              </Typo>
              <Typo color={colors.neutral500} size={14}>
                Optional
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
              <Typo color={colors.neutral200} size={16}>
                Receipt
              </Typo>
              <Typo color={colors.neutral500} size={14}>
                (optional)
              </Typo>
            </View>
            <ImageUpload
              file={transaction.image}
              onClear={() => setTransaction({ ...transaction, image: null })}
              onSelect={(file) =>
                setTransaction({ ...transaction, image: file })
              }
              placeholder="Upload Image"
            />
          </View>
        </ScrollView>
      </View>

      {/* footer */}
      <View style={[styles.footer, { borderTopColor: themeColors.border }]}>
        {oldTransaction?.id && !loading && (
          <Button
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
        message="Are you sure you want to delete this transaction?\n\nThis action cannot be undone."
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
    shadowOpacity: 1,
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
