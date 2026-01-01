import { Alert, Platform, Pressable, StyleSheet, Text, TouchableOpacity, View } from "react-native";
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
import { TransactionType, UserDataType, WalletType } from "@/types";
import Button from "@/components/Button";
import { useAuth } from "@/contexts/authContext";
import { updateUser } from "@/services/userService";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import ImageUpload from "@/components/ImageUpload";
import { CreateOrUpdateWallet, deleteWallet } from "@/services/walletService";
import { Dropdown } from "react-native-element-dropdown";
import { expenseCategories, transactionTypes } from "@/constants/data";
import useFetchData from "@/hooks/useFetchData";
import { orderBy, where } from "firebase/firestore";
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';

const TransactionModal = () => {
  const { user } = useAuth();
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
  const router = useRouter();
  const [showDatePicker, setShowDatePicker] = useState(false);

  const {
    data: wallets,
    error: walletsError,
    loading: walletsLoading,
  } = useFetchData<WalletType>("wallets", [
    where("uid", "==", user?.uid),
    orderBy("created", "desc"),
  ]);

  const oldTransaction: { name: string; image: string; id: string } =
    useLocalSearchParams();

    const onDateChange = (event: any, date: any

    ) => {
        const currentDate = date || transaction.date;
        setTransaction({...transaction, date: currentDate});
        setShowDatePicker(Platform.OS === 'ios' ? true : false);
};
  // console.log("Old Wallet:", oldWallet);

  // useEffect(() => {
  //     if (oldTransaction?.id) {
  //       setTransaction({
  //         name: oldTransaction?.name,
  //         image: oldTransaction?.image,
  //       });
  //     }
  // },[])

  const onSubmit = async () => {
   const {type, amount, description, category, date, walletId, image} = transaction;

   if(!walletId || !date || !amount || (type == 'expense' && !category)){
    Alert.alert("Transaction", "Please fill all the required fields");
    return;
   }

   console.log("Submitting transaction:", transaction);
   let transactionData: TransactionType = {
    type,
    amount,
    description,
    category,
    date,
    walletId,
    image,
    uid: user?.uid || "",
   };
   console.log("Transaction Data to submit:", transactionData);
  };

  const onDelete = async () => {
    // if (!oldTransaction?.id) return;
    // setLoading(true);
    // const res = await deleteTransaction(oldTransaction?.id);
    // setLoading(false);
    // if (res.success) {
    //   router.back();
    // } else {
    //   Alert.alert("Transaction", res.msg);
    // }
  };

  const showDeleteAlert = () => {
    Alert.alert(
      "Delete Transaction?",
      "This action will permanently delete this transaction.",
      [
        {
          text: "Cancel",
          onPress: () => console.log("cancel delete"),
          style: "cancel",
        },
        {
          text: "Delete",
          onPress: () => onDelete(),
          style: "destructive",
        },
      ]
    );
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
            <Typo color={colors.neutral200} size={16}>Type</Typo>
            <Dropdown
              style={styles.dropdownContainer}
              activeColor={colors.neutral700}
              //   placeholderStyle={styles.dropdownPlaceholder}
              selectedTextStyle={styles.dropdownSelectedText}
              iconStyle={styles.dropdownIcon}
              data={transactionTypes}
              maxHeight={300}
              labelField="label"
              valueField="value"
              itemTextStyle={styles.dropdownItemText}
              itemContainerStyle={styles.dropdownItemContainer}
              containerStyle={styles.dropdownListContainer}
              //   placeholder={!isFocus ? 'Select item' : '...'}
              //   searchPlaceholder="Search..."
              value={transaction.type}
              //   onFocus={() => setIsFocus(true)}
              //   onBlur={() => setIsFocus(false)}
              onChange={(item) => {
                setTransaction({ ...transaction, type: item.value });
              }}
            />
          </View>

          {/* wallets category*/}
          <View style={styles.inputContainer}>
            {/* Name Input */}
            <Typo color={colors.neutral200} size={16}>Wallet</Typo>
            <Dropdown
              style={styles.dropdownContainer}
              activeColor={colors.neutral700}
              //   placeholderStyle={styles.dropdownPlaceholder}
              selectedTextStyle={styles.dropdownSelectedText}
              iconStyle={styles.dropdownIcon}
              data={wallets.map((wallet) => ({
                label: `${wallet?.name} ($${wallet.amount})`,
                value: wallet.id,
              }))}
              maxHeight={300}
              labelField="label"
              valueField="value"
              itemTextStyle={styles.dropdownItemText}
              itemContainerStyle={styles.dropdownItemContainer}
              containerStyle={styles.dropdownListContainer}
              placeholder={"Select Wallet"}
              //   searchPlaceholder="Search..."
              value={transaction.walletId}
              //   onFocus={() => setIsFocus(true)}
              //   onBlur={() => setIsFocus(false)}
              onChange={(item) => {
                setTransaction({ ...transaction, walletId: item.value || "" });
              }}
            />
          </View>

          {/* expense category */}
          {transaction.type === "expense" && (
            <View style={styles.inputContainer}>
              {/* Name Input */}
              <Typo color={colors.neutral200} size={16}>Expense Category</Typo>
              <Dropdown
                style={styles.dropdownContainer}
                activeColor={colors.neutral700}
                //   placeholderStyle={styles.dropdownPlaceholder}
                selectedTextStyle={styles.dropdownSelectedText}
                iconStyle={styles.dropdownIcon}
                data={Object.values(expenseCategories)}
                maxHeight={300}
                labelField="label"
                valueField="value"
                itemTextStyle={styles.dropdownItemText}
                itemContainerStyle={styles.dropdownItemContainer}
                containerStyle={styles.dropdownListContainer}
                placeholder={"Select Wallet"}
                //   searchPlaceholder="Search..."
                value={transaction.category}
                //   onFocus={() => setIsFocus(true)}
                //   onBlur={() => setIsFocus(false)}
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
            <Typo color={colors.neutral200} size={16}>Date</Typo>
                {
                    !showDatePicker && (
                        <Pressable
                            style={styles.dateInput}
                            onPress={() => setShowDatePicker(true)}
                        >
                            <Typo size={14}>
                                {(transaction.date as Date).toDateString()}
                                </Typo>
                        </Pressable>
                    )
                }

                {
                    showDatePicker && (
                        <View style={Platform.OS === 'ios' ? styles.iosDatePicker : {} }>
                            <DateTimePicker
                                themeVariant="dark"
                                value={transaction.date as Date}
                                textColor={colors.white}
                                mode="date"
                                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                onChange={onDateChange}
                            />
                            {
                                Platform.OS === 'ios' && (
                                    <TouchableOpacity
                                        style={styles.datePickerButton}
                                        onPress={() => setShowDatePicker(false)}
                                    >
                                        <Typo size={15} fontWeight={"500"}>OK</Typo>
                                    </TouchableOpacity>
                                )
                            }
                        </View>
                    )
                }
          </View>

          {/* amount of transaction */}
                <View style={styles.inputContainer}>
            {/* Name Input */}
            <Typo color={colors.neutral200} size={16}>Amount</Typo>
            <Input
            //   placeholder="Salary, Cash, etc."
            keyboardType="numeric"
              value={transaction.amount?.toString()}
              onChangeText={(value: string) =>
                setTransaction({ ...transaction, amount: Number(value.replace(/[^0-9]/g, '')) })
              }
            />
          </View>

              {/* transaction description */}
          <View style={styles.inputContainer}>
            <View style={styles.flexRow}>
                <Typo color={colors.neutral200} size={16}>Description</Typo>
                <Typo color={colors.neutral500} size={14}>Optional</Typo>
            </View>
            
            <Input
            //   placeholder="Salary, Cash, etc."
              value={transaction.description}
              multiline
              containerStyle={{
                flexDirection: 'row',
                height: verticalScale(100),
                alignItems: 'flex-start',
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
                <Typo color={colors.neutral200} size={16}>Receipt</Typo>
                <Typo color={colors.neutral500} size={14}>(optional)</Typo>
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
      <View style={styles.footer}>
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
});
