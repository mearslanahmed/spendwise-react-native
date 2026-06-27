import { StyleSheet, TouchableOpacity, View } from "react-native";
import React from "react";
import { colors, radius, spacingX, spacingY } from "@/constants/theme";
import { scale, verticalScale } from "@/utils/styling";
import ModalWrapper from "@/components/ModalWrapper";
import Header from "@/components/Header";
import BackButton from "@/components/BackButton";
import * as Icon from "phosphor-react-native";
import Typo from "@/components/Typo";
import Input from "@/components/Input";
import Button from "@/components/Button";
import { useAuth } from "@/contexts/authContext";
import { useLocalSearchParams, useRouter } from "expo-router";
import Toast from "react-native-toast-message";
import { useData } from "@/contexts/dataContext";
import { useTheme } from "@/contexts/themeContext";
import { walletPresets } from "@/constants/data";
import { createTransfer } from "@/services/transactionService";
import { Dropdown } from "react-native-element-dropdown";

const TransferModal = () => {
  const { user } = useAuth();
  const { colors: themeColors } = useTheme();
  const router = useRouter();
  const { wallets: allWallets } = useData();

  const params = useLocalSearchParams<{ sourceWalletId?: string }>();

  const [sourceWalletId, setSourceWalletId] = React.useState(params.sourceWalletId || "");
  const [destWalletId, setDestWalletId] = React.useState("");
  const [amount, setAmount] = React.useState("");
  const [note, setNote] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  const wallets = React.useMemo(() => {
    return [...allWallets].sort((a, b) => {
      const aCreated = a.created as any;
      const bCreated = b.created as any;
      const aTime = aCreated?.toDate ? aCreated.toDate().getTime() : new Date(aCreated || 0).getTime();
      const bTime = bCreated?.toDate ? bCreated.toDate().getTime() : new Date(bCreated || 0).getTime();
      return bTime - aTime;
    });
  }, [allWallets]);

  const sourceWallet = wallets.find((w) => w.id === sourceWalletId);

  const destOptions = wallets
    .filter((w) => w.id !== sourceWalletId)
    .map((w) => ({ label: w.name, value: w.id }));

  const getPreset = (wallet: any) => {
    if (typeof wallet?.image === "string" && wallet.image.startsWith("preset_")) {
      return walletPresets[wallet.image] || walletPresets.preset_bank;
    }
    return null;
  };

  const sourcePreset = sourceWallet ? getPreset(sourceWallet) : null;
  const SourceIcon = sourcePreset?.icon || Icon.CreditCardIcon;

  const onSubmit = async () => {
    if (!sourceWalletId || !destWalletId) {
      Toast.show({ type: "error", text1: "Transfer", text2: "Please select a destination wallet" });
      return;
    }
    const numAmount = parseFloat(amount);
    if (!amount || isNaN(numAmount) || numAmount <= 0) {
      Toast.show({ type: "error", text1: "Transfer", text2: "Please enter a valid amount" });
      return;
    }

    setLoading(true);
    const res = await createTransfer(sourceWalletId, destWalletId, numAmount, user?.uid || "", note || undefined);
    setLoading(false);

    if (res.success) {
      Toast.show({
        type: "success",
        text1: "Transfer complete!",
        text2: `${user?.currency || "$"}${numAmount.toFixed(2)} transferred successfully.`,
      });
      router.back();
    } else {
      Toast.show({ type: "error", text1: "Transfer failed", text2: res.msg });
    }
  };

  return (
    <ModalWrapper>
      <View style={styles.container}>
        <Header
          title="Transfer Funds"
          leftIcon={<BackButton />}
          style={{ marginBottom: spacingY._15, marginTop: spacingY._10 }}
        />

        <View style={styles.form}>
          {/* FROM */}
          <View style={styles.inputContainer}>
            <Typo size={13} color={themeColors.textLighter} fontWeight="600">FROM</Typo>
            {sourceWallet ? (
              <View style={[styles.walletPill, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
                <View style={[styles.walletPillIcon, { backgroundColor: sourcePreset?.bgColor || colors.neutral700 }]}>
                  <SourceIcon size={verticalScale(16)} color="#fff" weight="bold" />
                </View>
                <View style={{ flex: 1 }}>
                  <Typo size={15} fontWeight="600">{sourceWallet.name}</Typo>
                  <Typo size={12} color={themeColors.textLighter}>
                    Balance: {user?.currency || "$"}{(sourceWallet.amount || 0).toFixed(2)}
                  </Typo>
                </View>
                <Icon.LockSimpleIcon size={verticalScale(15)} color={themeColors.textLighter} />
              </View>
            ) : (
              <Typo color={colors.neutral400}>No source wallet selected</Typo>
            )}
          </View>

          {/* Direction Arrow */}
          <View style={styles.arrowRow}>
            <View style={[styles.arrowLine, { backgroundColor: themeColors.border }]} />
            <View style={[styles.arrowBadge, { backgroundColor: themeColors.inputBg, borderColor: themeColors.border }]}>
              <Icon.ArrowDownIcon size={verticalScale(15)} color={colors.primary} weight="bold" />
            </View>
            <View style={[styles.arrowLine, { backgroundColor: themeColors.border }]} />
          </View>

          {/* TO */}
          <View style={styles.inputContainer}>
            <Typo size={13} color={themeColors.textLighter} fontWeight="600">TO</Typo>
            <Dropdown
              style={[styles.dropdown, { backgroundColor: themeColors.inputBg, borderColor: themeColors.border }]}
              placeholderStyle={[styles.dropdownPlaceholder, { color: themeColors.textLighter }]}
              selectedTextStyle={[styles.dropdownText, { color: themeColors.text }]}
              containerStyle={[styles.dropdownContainer, { backgroundColor: themeColors.card }]}
              itemTextStyle={{ color: themeColors.text }}
              activeColor={themeColors.inputBg}
              data={destOptions}
              maxHeight={200}
              labelField="label"
              valueField="value"
              placeholder="Select destination wallet"
              value={destWalletId}
              onChange={(item) => setDestWalletId(item.value)}
            />
          </View>

          {/* Amount */}
          <View style={styles.inputContainer}>
            <Typo size={13} color={themeColors.textLighter} fontWeight="600">AMOUNT</Typo>
            <Input
              placeholder="0.00"
              value={amount}
              onChangeText={(val) => setAmount(val.replace(/[^0-9.]/g, '').replace(/(\..*?)\..*/g, '$1'))}
              keyboardType="decimal-pad"
              icon={<Typo size={16} fontWeight="600" color={themeColors.textLighter}>{user?.currency || "$"}</Typo>}
            />
          </View>

          {/* Note */}
          <View style={styles.inputContainer}>
            <View style={{ flexDirection: "row", gap: scale(4), alignItems: "center" }}>
              <Typo size={13} color={themeColors.textLighter} fontWeight="600">NOTE</Typo>
              <Typo size={12} color={themeColors.textLighter}>(optional)</Typo>
            </View>
            <Input
              placeholder="e.g. Moving savings to main account"
              value={note}
              onChangeText={setNote}
            />
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        <Button onPress={onSubmit} loading={loading} style={{ flex: 1 }}>
          <Icon.ArrowsLeftRightIcon size={verticalScale(17)} color={colors.black} weight="bold" />
          <Typo color={colors.black} fontWeight="700">Transfer Funds</Typo>
        </Button>
      </View>
    </ModalWrapper>
  );
};

export default TransferModal;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacingX._20,
  },
  form: {
    flex: 1,
    gap: spacingY._20,
    marginTop: spacingY._10,
  },
  inputContainer: {
    gap: spacingY._7,
  },
  footer: {
    flexDirection: "row",
    paddingHorizontal: spacingX._20,
    paddingTop: spacingY._15,
    marginBottom: spacingY._15,
  },
  walletPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(12),
    borderWidth: 1,
    borderRadius: radius._12,
    padding: spacingY._12,
    paddingHorizontal: spacingX._12,
  },
  walletPillIcon: {
    width: verticalScale(38),
    height: verticalScale(38),
    borderRadius: 100,
    justifyContent: "center",
    alignItems: "center",
  },
  arrowRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(10),
    marginVertical: -spacingY._5,
  },
  arrowLine: {
    flex: 1,
    height: 1,
  },
  arrowBadge: {
    width: verticalScale(32),
    height: verticalScale(32),
    borderRadius: 100,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  dropdown: {
    height: verticalScale(50),
    borderWidth: 1,
    borderRadius: radius._12,
    paddingHorizontal: spacingX._15,
  },
  dropdownPlaceholder: {
    fontSize: scale(14),
  },
  dropdownText: {
    fontSize: scale(14),
    fontWeight: "500",
  },
  dropdownContainer: {
    borderRadius: radius._12,
    borderWidth: 0,
    overflow: "hidden",
  },
});
