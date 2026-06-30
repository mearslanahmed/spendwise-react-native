import { StyleSheet, View, ScrollView } from "react-native";
import React, { useState } from "react";
import { spacingX, spacingY } from "@/constants/theme";
import ModalWrapper from "@/components/ModalWrapper";
import Header from "@/components/Header";
import BackButton from "@/components/BackButton";
import Input from "@/components/Input";
import { useData } from "@/contexts/dataContext";
import TransactionList from "@/components/TransactionList";

import { useTheme } from "@/contexts/themeContext";
import { resolveTime } from "@/utils/dateHelper";

const SearchModal = () => {
  const [search, setSearch] = useState("");
  const { colors: themeColors } = useTheme();

  const { transactions: allUserTransactions, loading: dataLoading } = useData();
  const transactionLoading = dataLoading.transactions;

  const allTransactions = React.useMemo(() => {
    const sorted = [...allUserTransactions].sort((a, b) => {
      const aTime = resolveTime(a.date);
      const bTime = resolveTime(b.date);
      return bTime - aTime;
    });
    return sorted.slice(0, 30);
  }, [allUserTransactions]);

  const filteredTransactions = allTransactions.filter((item) => {
    if (search.length > 1) {
      if (
        item.category?.toLowerCase()?.includes(search?.toLowerCase()) ||
        item.type?.toLowerCase()?.includes(search?.toLowerCase()) ||
        item.description?.toLowerCase()?.includes(search?.toLowerCase())
      ) {
        return true;
      }
      return false;
    }
    return true;
  });

  return (
    <ModalWrapper>
      <View style={styles.container}>
        <Header
          title="Search"
          leftIcon={<BackButton />}
          style={{ marginBottom: spacingY._15, marginTop: spacingY._10 }}
        />

        {/* form */}
        <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.inputContainer}>
            <Input
              placeholder="shoes..."
              value={search}
              placeholderTextColor={themeColors.textLighter}
              onChangeText={(value: string) => setSearch(value)}
            />
          </View>
          <View>
            <TransactionList
              loading={transactionLoading}
              data={filteredTransactions}
              emptyListMessage="No Transaction added yet!"
              title=""
            />
          </View>
        </ScrollView>
      </View>
    </ModalWrapper>
  );
};

export default SearchModal;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "space-between",
    paddingHorizontal: spacingX._25,
  },
  form: {
    gap: spacingY._30,
    marginTop: spacingY._15,
  },
  avatarContainer: {
    position: "relative",
    alignSelf: "center",
  },
  inputContainer: {
    gap: spacingY._10,
  },
});
