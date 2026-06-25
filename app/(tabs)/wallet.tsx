import { StyleSheet, Text, TouchableOpacity, View, FlatList } from "react-native";
import React from "react";
import ScreenWrapper from "@/components/ScreenWrapper";
import { colors, radius, spacingX, spacingY } from "@/constants/theme";
import { verticalScale } from "@/utils/styling";
import Typo from "@/components/Typo";
import * as Icons from "phosphor-react-native";
import { useRouter } from "expo-router";
import { useData } from "@/contexts/dataContext";
import { WalletType } from "@/types";
import { useTheme } from "@/contexts/themeContext";
import { useAuth } from "@/contexts/authContext";
import Loading from "@/components/Loading";
import WalletListItem from "@/components/WalletListItem";

const Wallet = () => {
  const router = useRouter();
  const {user} = useAuth();
  const { colors: themeColors } = useTheme();

  const { wallets: allWallets, loading: dataLoading } = useData();
  const loading = dataLoading.wallets;

  const wallets = React.useMemo(() => {
    return [...allWallets].sort((a, b) => {
      const aTime = a.created?.toDate ? a.created.toDate().getTime() : new Date(a.created || 0).getTime();
      const bTime = b.created?.toDate ? b.created.toDate().getTime() : new Date(b.created || 0).getTime();
      return bTime - aTime;
    });
  }, [allWallets]);

  const getTotalBalance = () => 
    wallets.reduce((total, item) => {
      total = total + (item.amount || 0);
      return total;
    },0);

  return (
    <ScreenWrapper style={{ backgroundColor: themeColors.background }}>
      <View style={styles.container}>
        <View style={[styles.balanceView, { backgroundColor: themeColors.background }]}>
          <View style={{ alignItems: "center" }}>
            <Typo size={45} fontWeight={"500"}>
              {user?.currency || "$"}{getTotalBalance()?.toFixed(2)}
            </Typo>
            <Typo size={16} color={colors.neutral300}>
              Total Balance
            </Typo>
          </View>
        </View>

        {/* wallets */}
        <View style={[styles.wallets, { backgroundColor: themeColors.card }]}>
          {/* header */}
          <View style={styles.flexRow}>
            <Typo size={20} fontWeight={"700"}>
              My Wallets
            </Typo>
            <TouchableOpacity onPress={() => router.push("/(modals)/walletModal")}>
              <Icons.PlusCircleIcon size={verticalScale(33)} color={colors.primary} weight="fill" />
            </TouchableOpacity>
          </View>

          {loading && <Loading />}
          <FlatList
            data={wallets}
            renderItem={({item, index})=>{
              return <WalletListItem item={item} index={index} router={router} />
            }}
            contentContainerStyle={styles.listStyle}
          />
        </View>
      </View>
    </ScreenWrapper>
  );
};

export default Wallet;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "space-between",
  },
  balanceView: {
    height: verticalScale(160),
    backgroundColor: colors.black,
    justifyContent: "center",
    alignItems: "center",
  },
  flexRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacingY._10,
  },

  wallets: {
    flex: 1,
    backgroundColor: colors.neutral900,
    borderTopRightRadius: radius._30,
    borderTopLeftRadius: radius._30,
    padding: spacingX._20,
    paddingTop: spacingX._25,
  },

  listStyle: {
    paddingVertical: spacingY._25,
    paddingTop: spacingY._15,
  },
});
