import { StyleSheet, View, ScrollView } from "react-native";
import React, { useEffect, useState } from "react";
import { colors, radius, spacingX, spacingY } from "@/constants/theme";
import { scale, verticalScale } from "@/utils/styling";
import ModalWrapper from "@/components/ModalWrapper";
import Header from "@/components/Header";
import BackButton from "@/components/BackButton";
import Typo from "@/components/Typo";
import Input from "@/components/Input";
import Button from "@/components/Button";
import { useAuth } from "@/contexts/authContext";
import { useLocalSearchParams, useRouter } from "expo-router";
import Toast from "react-native-toast-message";
import CustomAlert from "@/components/CustomAlert";
import { useTheme } from "@/contexts/themeContext";
import { Dropdown } from "react-native-element-dropdown";
import { expenseCategories } from "@/constants/data";
import { BudgetType } from "@/types";
import { createOrUpdateBudget, deleteBudget } from "@/services/budgetService";
import { useData } from "@/contexts/dataContext";
import * as Icon from "phosphor-react-native";

const BudgetModal = () => {
  const { user } = useAuth();
  const { colors: themeColors } = useTheme();
  const router = useRouter();

  const [budget, setBudget] = useState<Partial<BudgetType>>({
    category: "",
    amount: 0,
    uid: user?.uid || "",
  });

  const [loading, setLoading] = useState(false);
  const [deleteAlertVisible, setDeleteAlertVisible] = useState(false);
  const [missingFields, setMissingFields] = useState<string[]>([]);

  const { budgets: existingBudgets } = useData();

  // Filter category dropdown data so users don't select a category that already has a budget
  const availableCategories = React.useMemo(() => {
    const categories = Object.values(expenseCategories);
    if (oldBudget?.id) {
      return categories;
    }
    return categories.filter(cat => !existingBudgets.some(b => b.category === cat.value));
  }, [existingBudgets, oldBudget?.id]);

  const oldBudget = useLocalSearchParams<{ id?: string; category?: string; amount?: string }>();

  useEffect(() => {
    if (oldBudget?.id) {
      setBudget({
        id: oldBudget.id,
        category: oldBudget.category || "",
        amount: Number(oldBudget.amount) || 0,
        uid: user?.uid || "",
      });
    } else if (oldBudget?.category) {
      const match = existingBudgets.find((b) => b.category === oldBudget.category);
      setBudget({
        id: match?.id,
        category: oldBudget.category,
        amount: match ? match.amount : (oldBudget.amount ? Number(oldBudget.amount) : 0),
        uid: user?.uid || "",
      });
    }
  }, [oldBudget.id, oldBudget.category, oldBudget.amount, existingBudgets, user?.uid]);

  const handleCategoryChange = (categoryValue: string) => {
    const match = existingBudgets.find((b) => b.category === categoryValue);
    setBudget((prev) => ({
      ...prev,
      id: match?.id,
      category: categoryValue,
      amount: match ? match.amount : prev.amount || 0,
    }));
    setMissingFields((prev) => prev.filter((f) => f !== 'category'));
  };

  const onSubmit = async () => {
    if (loading) return;
    if (!user?.uid) {
      Toast.show({ type: "error", text1: "Error", text2: "You must be logged in to do this." });
      return;
    }

    const { category, amount } = budget;
    
    const missing: string[] = [];
    if (!category) missing.push("category");
    if (amount === undefined || amount <= 0) missing.push("amount");

    if (missing.length > 0) {
      setMissingFields(missing);
      Toast.show({
        type: "error",
        text1: "Budget",
        text2: "Please select a category and enter a valid budget limit",
      });
      return;
    }
    setMissingFields([]);

    const data: BudgetType = {
      category,
      amount: Number(amount),
      uid: user.uid,
    };

    if (budget.id) data.id = budget.id;

    setLoading(true);
    
    // Fast fail for offline mode
    const timeoutPromise = new Promise<{success: boolean, msg: string, offline?: boolean}>((resolve) => 
      setTimeout(() => resolve({ success: true, msg: "Saved offline. Connect to internet to sync.", offline: true }), 3000)
    );
    
    const res = await Promise.race([ createOrUpdateBudget(data) as Promise<any>, timeoutPromise ]);
    setLoading(false);

    if (res?.success) {
      if (res.offline) {
        Toast.show({ type: 'info', text1: 'Offline Mode', text2: res.msg });
      } else {
        Toast.show({
          type: "success",
          text1: "Budget",
          text2: budget.id ? "Budget updated successfully" : "Budget created successfully",
        });
      }
      router.back();
    } else {
      Toast.show({
        type: "error",
        text1: "Budget",
        text2: res?.msg || "Failed to create budget",
      });
    }
  };

  const onDelete = async () => {
    if (!budget.id || loading) return;
    setDeleteAlertVisible(false);
    setLoading(true);
    const res = await deleteBudget(budget.id);
    setLoading(false);

    if (res.success) {
      Toast.show({
        type: "success",
        text1: "Budget",
        text2: "Budget deleted successfully",
      });
      router.back();
    } else {
      Toast.show({
        type: "error",
        text1: "Budget",
        text2: res.msg || "Failed to delete budget",
      });
    }
  };

  return (
    <ModalWrapper>
      <View style={styles.container}>
        <Header
          title={budget.id ? "Update Budget" : "New Budget"}
          leftIcon={<BackButton />}
          style={{ marginBottom: spacingY._15, marginTop: spacingY._10 }}
        />

        <ScrollView contentContainerStyle={styles.form} showsVerticalScrollIndicator={false}>
          {/* Category Selector */}
          <View style={styles.inputContainer}>
            <Typo color={colors.neutral200} size={16}>
              Category
            </Typo>
            <Dropdown
              style={[
                styles.dropdownContainer, 
                { borderColor: missingFields.includes("category") ? colors.rose : themeColors.border, borderWidth: missingFields.includes("category") ? 1.5 : 1 }
              ]}
              activeColor={themeColors.inputBg}
              placeholderStyle={[styles.dropdownPlaceholder, { color: themeColors.textLighter }]}
              selectedTextStyle={[styles.dropdownSelectedText, { color: themeColors.text }]}
              iconStyle={[styles.dropdownIcon, { tintColor: themeColors.textLighter }]}
              data={availableCategories}
              maxHeight={300}
              labelField="label"
              valueField="value"
              itemTextStyle={[styles.dropdownItemText, { color: themeColors.text }]}
              itemContainerStyle={[styles.dropdownItemContainer, { backgroundColor: themeColors.inputBg }]}
              containerStyle={[styles.dropdownListContainer, { backgroundColor: themeColors.inputBg, borderColor: themeColors.border }]}
              placeholder={"Select Category"}
              value={budget.category}
              onChange={(item) => handleCategoryChange(item.value || "")}
              disable={!!oldBudget?.id} // Disable changing category if editing an existing budget
            />
          </View>

          {/* Amount Input */}
          <View style={styles.inputContainer}>
            <Typo color={colors.neutral200} size={16}>
              Monthly Budget Limit ({user?.currency || "$"})
            </Typo>
            <Input
              keyboardType="decimal-pad"
              placeholder="e.g. 500"
              value={budget.amount ? budget.amount.toString() : ""}
              onChangeText={(value: string) => {
                setBudget({ ...budget, amount: value.replace(/[^0-9.]/g, "").replace(/(\..*?)\..*/g, '$1') as any });
                setMissingFields((prev) => prev.filter((f) => f !== 'amount'));
              }}
              containerStyle={missingFields.includes("amount") ? { borderColor: colors.rose, borderWidth: 1.5 } : {}}
            />
          </View>

          {/* Info Banner about Monthly Reset */}
          <View style={[styles.infoBanner, { backgroundColor: themeColors.inputBg, borderColor: themeColors.border }]}>
            <Icon.InfoIcon size={scale(18)} color={colors.primary} weight="bold" />
            <View style={{ flex: 1 }}>
              <Typo size={12} color={themeColors.textLighter} style={{ lineHeight: 16 }}>
                Category budgets reset automatically on the 1st of every month.
              </Typo>
            </View>
          </View>
        </ScrollView>
      </View>

      {/* Footer Buttons */}
      <View style={[styles.footer, { borderTopColor: themeColors.border }]}>
        {budget.id && !loading && (
          <Button
            onPress={() => setDeleteAlertVisible(true)}
            style={{
              backgroundColor: colors.rose,
              paddingHorizontal: spacingX._15,
            }}
          >
            <Icon.TrashIcon size={verticalScale(24)} color={colors.white} weight="bold" />
          </Button>
        )}
        <Button onPress={onSubmit} loading={loading} style={{ flex: 1 }}>
          <Typo color={colors.black} fontWeight={"700"}>
            {budget.id ? "Update Budget" : "Add Budget"}
          </Typo>
        </Button>
      </View>

      <CustomAlert
        visible={deleteAlertVisible}
        title="Delete Budget Limit?"
        message="Are you sure you want to delete this monthly budget limit?"
        onCancel={() => setDeleteAlertVisible(false)}
        onConfirm={onDelete}
        confirmText="Delete"
        loading={loading}
      />
    </ModalWrapper>
  );
};

export default BudgetModal;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacingY._20,
  },
  form: {
    gap: spacingY._20,
    paddingVertical: spacingY._15,
  },
  inputContainer: {
    gap: spacingY._10,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(10),
    padding: scale(12),
    borderRadius: radius._12,
    borderWidth: 1,
    marginTop: spacingY._10,
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
