import {
  StyleSheet,
  View,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import React, { useState } from "react";
import { colors, radius, spacingX, spacingY } from "@/constants/theme";
import { verticalScale } from "@/utils/styling";
import ModalWrapper from "@/components/ModalWrapper";
import Header from "@/components/Header";
import BackButton from "@/components/BackButton";
import Typo from "@/components/Typo";
import Button from "@/components/Button";
import { useAuth } from "@/contexts/authContext";
import Toast from "react-native-toast-message";
import { Dropdown } from "react-native-element-dropdown";
import { useTheme } from "@/contexts/themeContext";
import { cacheDirectory, writeAsStringAsync } from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { collection, getDocs, query, where} from "firebase/firestore";
import { firestore } from "@/config/firebase";
import * as Icon from "phosphor-react-native";

const timeframes = [
  { label: "All Time", value: "all" },
  { label: "This Month", value: "this_month" },
  { label: "Last Month", value: "last_month" },
  { label: "Last 3 Months", value: "last_3_months" },
  { label: "This Year", value: "this_year" },
];

const transactionTypes = [
  { label: "All Types", value: "all" },
  { label: "Expenses Only", value: "expense" },
  { label: "Income Only", value: "income" },
];

const ExportModal = () => {
  const { user } = useAuth();
  const { colors: themeColors } = useTheme();

  const [loading, setLoading] = useState(false);
  const [selectedTimeframe, setSelectedTimeframe] = useState("all");
  const [selectedType, setSelectedType] = useState("all");

  const handleExportCSV = async () => {
    if (loading) return;
    if (!user?.uid) return;
    setLoading(true);
    try {
      let q = query(
        collection(firestore, "transactions"),
        where("uid", "==", user.uid)
      );

      // Type Filter
      if (selectedType !== "all") {
        q = query(q, where("type", "==", selectedType));
      }

      // Date Filter
      if (selectedTimeframe !== "all") {
        const now = new Date();
        let startDate = new Date();
        let endDate = new Date();
        let applyEnd = false;

        if (selectedTimeframe === "this_month") {
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        } else if (selectedTimeframe === "last_month") {
          startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
          applyEnd = true;
        } else if (selectedTimeframe === "last_3_months") {
          startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1);
        } else if (selectedTimeframe === "this_year") {
          startDate = new Date(now.getFullYear(), 0, 1);
        }

        q = query(q, where("date", ">=", startDate));
        if (applyEnd) {
          q = query(q, where("date", "<=", endDate));
        }
      }

      const querySnapshot = await getDocs(q);
      const transactionsData: any[] = [];
      querySnapshot.forEach((doc) => {
        transactionsData.push({ id: doc.id, ...doc.data() });
      });

      if (transactionsData.length === 0) {
        Toast.show({
          type: "info",
          text1: "Export Report",
          text2: "No transactions found for the selected filters.",
        });
        setLoading(false);
        return;
      }

      transactionsData.sort((a, b) => {
        const secA = a.date?.seconds || 0;
        const secB = b.date?.seconds || 0;
        return secB - secA;
      });

      const headers = "Date,Type,Category,Amount,Description\n";
      const rows = transactionsData
        .map((t) => {
          const date = t.date?.seconds
            ? new Date(t.date.seconds * 1000).toLocaleDateString("en-US")
            : "";
          const cleanDesc = t.description ? t.description.replace(/"/g, '""') : "";
          return `"${date}","${t.type}","${t.category}",${t.amount},"${cleanDesc}"`;
        })
        .join("\n");

      const csvContent = headers + rows;
      const fileName = `SpendWise_Transactions_${new Date().toISOString().split("T")[0]}.csv`;

      const fileUri = `${cacheDirectory}${fileName}`;
      await writeAsStringAsync(fileUri, csvContent, { encoding: "utf8" });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: "text/csv",
          dialogTitle: "Export SpendWise Transactions",
          UTI: "public.comma-separated-values-text",
        });
        // router.back(); // optional: go back after successful share
      } else {
        Toast.show({
          type: "error",
          text1: "Sharing Unavailable",
          text2: "Sharing is not supported on this device.",
        });
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

  return (
    <ModalWrapper>
      <View style={styles.container}>
        <Header
          title="Export Data"
          leftIcon={<BackButton />}
          style={{ marginBottom: spacingY._15, marginTop: spacingY._10 }}
        />

        <ScrollView contentContainerStyle={styles.form} showsVerticalScrollIndicator={false}>
          {/* Info banner */}
          <View style={[styles.infoBanner, { backgroundColor: themeColors.card }]}>
             <Icon.FileCsvIcon size={verticalScale(30)} color={colors.primary} weight="duotone" />
             <View style={{ flex: 1 }}>
                <Typo size={15} fontWeight="600" color={themeColors.text}>Export to CSV</Typo>
                <Typo size={13} color={themeColors.textLighter} style={{ marginTop: 2 }}>
                  Download your transactions into a spreadsheet to view them on your computer or share with your accountant.
                </Typo>
             </View>
          </View>

          {/* Timeframe picker */}
          <View style={styles.inputContainer}>
            <Typo color={themeColors.textLighter} size={15}>
              Timeframe
            </Typo>
            <Dropdown
              style={[styles.dropdownContainer, { borderColor: themeColors.border }]}
              activeColor={themeColors.inputBg}
              selectedTextStyle={[styles.dropdownSelectedText, { color: themeColors.text }]}
              iconStyle={[styles.dropdownIcon, { tintColor: themeColors.textLighter }]}
              data={timeframes}
              maxHeight={300}
              labelField="label"
              valueField="value"
              itemTextStyle={[styles.dropdownItemText, { color: themeColors.text }]}
              itemContainerStyle={[styles.dropdownItemContainer, { backgroundColor: themeColors.inputBg }]}
              containerStyle={[
                styles.dropdownListContainer,
                { backgroundColor: themeColors.inputBg, borderColor: themeColors.border },
              ]}
              value={selectedTimeframe}
              onChange={(item) => setSelectedTimeframe(item.value)}
              disable={loading}
            />
          </View>

          {/* Type picker */}
          <View style={styles.inputContainer}>
            <Typo color={themeColors.textLighter} size={15}>
              Transaction Type
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
              containerStyle={[
                styles.dropdownListContainer,
                { backgroundColor: themeColors.inputBg, borderColor: themeColors.border },
              ]}
              value={selectedType}
              onChange={(item) => setSelectedType(item.value)}
              disable={loading}
            />
          </View>

        </ScrollView>

        {/* Footer */}
        <View style={[styles.footer, { borderTopColor: themeColors.border }]}>
          <Button onPress={handleExportCSV} loading={loading} style={{ flex: 1 }}>
            <Typo color={colors.black} fontWeight={"700"}>
              Export Data
            </Typo>
          </Button>
        </View>

        {loading && (
          <View style={styles.loaderOverlay}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        )}
      </View>
    </ModalWrapper>
  );
};

export default ExportModal;

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
  form: {
    gap: spacingY._20,
    paddingVertical: spacingY._15,
  },
  infoBanner: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacingY._15,
    borderRadius: radius._15,
    gap: spacingX._12,
    marginBottom: spacingY._10,
  },
  inputContainer: {
    gap: spacingY._10,
  },
  dropdownContainer: {
    height: verticalScale(54),
    borderWidth: 1,
    paddingHorizontal: spacingX._15,
    borderRadius: radius._15,
    borderCurve: "continuous",
  },
  dropdownItemText: {
    fontSize: verticalScale(14),
  },
  dropdownSelectedText: {
    fontSize: verticalScale(14),
  },
  dropdownListContainer: {
    borderRadius: radius._15,
    borderCurve: "continuous",
    paddingVertical: spacingY._7,
    top: 5,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 1,
    shadowRadius: 15,
    elevation: 5,
  },
  dropdownItemContainer: {
    borderRadius: radius._10,
    marginHorizontal: spacingX._5,
  },
  dropdownIcon: {
    height: verticalScale(20),
  },
  footer: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    paddingVertical: spacingY._15,
    borderTopWidth: 1,
  },
});
