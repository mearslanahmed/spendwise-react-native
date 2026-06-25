import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import React, { useEffect, useState } from "react";
import { colors, spacingX, spacingY } from "@/constants/theme";
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
import { Timestamp } from "firebase/firestore";
import { useData } from "@/contexts/dataContext";
import TransactionList from "@/components/TransactionList";

import { useTheme } from "@/contexts/themeContext";

const SearchModal = () => {
  const { user, updateUserData } = useAuth();
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const [search, setSearch] = useState("");
  const { colors: themeColors } = useTheme();

  const { transactions: allUserTransactions, loading: dataLoading } = useData();
  const transactionLoading = dataLoading.transactions;

  const allTransactions = React.useMemo(() => {
    const sorted = [...allUserTransactions].sort((a, b) => {
      const aTime = (a.date as Timestamp)?.toDate().getTime() || new Date(a.date as string).getTime();
      const bTime = (b.date as Timestamp)?.toDate().getTime() || new Date(b.date as string).getTime();
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
          style={{ marginBottom: spacingY._10 }}
        />

        {/* form */}
        <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
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
    paddingTop: spacingY._15,
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
