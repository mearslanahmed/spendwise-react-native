import { StyleSheet, TouchableOpacity, View, FlatList, Dimensions } from "react-native";
import React, { useMemo, useState } from "react";
import ScreenWrapper from "@/components/ScreenWrapper";
import { colors, radius, spacingX, spacingY } from "@/constants/theme";
import { scale, verticalScale } from "@/utils/styling";
import Typo from "@/components/Typo";
import * as Icons from "phosphor-react-native";
import { useRouter } from "expo-router";
import { useData } from "@/contexts/dataContext";
import { useTheme } from "@/contexts/themeContext";
import { useAuth } from "@/contexts/authContext";
import Loading from "@/components/Loading";
import { walletPresets } from "@/constants/data";
import { LinearGradient } from "expo-linear-gradient";
import TransactionList from "@/components/TransactionList";
import FilterTabs from "@/components/FilterTabs";
import { Image } from "expo-image";

const { width: screenWidth } = Dimensions.get("window");
const cardWidth = scale(295);
const cardGap = scale(15);
const snapInterval = cardWidth + cardGap;

const Wallet = () => {
  const router = useRouter();
  const { user } = useAuth();
  const { colors: themeColors } = useTheme();

  const { wallets: allWallets, transactions: allUserTransactions, loading: dataLoading } = useData();
  const walletsLoading = dataLoading.wallets;
  const transactionsLoading = dataLoading.transactions;

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isBalanceHidden, setIsBalanceHidden] = useState(false);
  const [activeFilter, setActiveFilter] = useState("All");

  const maskAmount = (val: number) =>
    isBalanceHidden ? "••••" : `${user?.currency || "$"}${val.toFixed(2)}`;

  const wallets = useMemo(() => {
    return [...allWallets].sort((a, b) => {
      const aCreated = a.created as any;
      const bCreated = b.created as any;
      const aTime = aCreated?.toDate ? aCreated.toDate().getTime() : new Date(aCreated || 0).getTime();
      const bTime = bCreated?.toDate ? bCreated.toDate().getTime() : new Date(bCreated || 0).getTime();
      return bTime - aTime;
    });
  }, [allWallets]);

  const activeWallet = wallets.length > 0 ? wallets[selectedIndex] : null;

  const getTotalBalance = () =>
    wallets.reduce((total, item) => total + (item.amount || 0), 0);

  // Filter transactions specifically for the active wallet
  const filteredTransactions = useMemo(() => {
    if (!activeWallet) return [];
    let txs = allUserTransactions.filter((tx) => tx.walletId === activeWallet.id);
    
    if (activeFilter === "Income") {
      txs = txs.filter((tx) => tx.type === "income");
    } else if (activeFilter === "Expense") {
      txs = txs.filter((tx) => tx.type === "expense");
    } else if (activeFilter === "This Week") {
      const now = new Date();
      const day = now.getDay() || 7; 
      const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day + 1).getTime();
      const endOfWeek = startOfWeek + (7 * 24 * 60 * 60 * 1000) - 1;
      
      txs = txs.filter((tx) => {
        const txTime = (tx.date as any)?.toDate ? (tx.date as any).toDate().getTime() : new Date(tx.date as string).getTime();
        return txTime >= startOfWeek && txTime <= endOfWeek;
      });
    } else if (activeFilter === "This Month") {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).getTime();
      
      txs = txs.filter((tx) => {
        const txTime = (tx.date as any)?.toDate ? (tx.date as any).toDate().getTime() : new Date(tx.date as string).getTime();
        return txTime >= startOfMonth && txTime <= endOfMonth;
      });
    }
    
    return txs;
  }, [allUserTransactions, activeWallet, activeFilter]);

  // Compute stats specifically for the active wallet
  const activeWalletStats = useMemo(() => {
    let income = 0;
    let expense = 0;
    filteredTransactions.forEach((tx) => {
      if (tx.type === "income") {
        income += Number(tx.amount) || 0;
      } else if (tx.type === "expense") {
        expense += Number(tx.amount) || 0;
      }
    });
    return { income, expense };
  }, [filteredTransactions]);

  const onScroll = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / snapInterval);
    if (index >= 0 && index < wallets.length && index !== selectedIndex) {
      setSelectedIndex(index);
    }
  };

  const handleEditWallet = () => {
    if (!activeWallet) return;
    router.push({
      pathname: "/(modals)/walletModal",
      params: {
        id: activeWallet.id,
        name: activeWallet.name,
        image: activeWallet.image,
      },
    });
  };

  const handleTransfer = () => {
    if (!activeWallet) return;
    router.push({
      pathname: "/(modals)/transferModal",
      params: { sourceWalletId: activeWallet.id },
    });
  };

  const handleAddTransaction = () => {
    if (!activeWallet) return;
    router.push({
      pathname: "/(modals)/transactionModal",
      params: {
        walletId: activeWallet.id,
      },
    });
  };

  const renderCardItem = ({ item, index }: { item: any; index: number }) => {
    const isPreset = typeof item.image === "string" && item.image.startsWith("preset_");
    const preset = isPreset ? (walletPresets[item.image] || walletPresets.preset_bank) : null;
    const PresetIcon = preset ? preset.icon : null;
    
    // Choose gradient theme
    const cardGradient = (preset ? preset.gradient : ["#374151", "#1f2937"]) as unknown as readonly [string, string, ...string[]];
    const brandBg = preset ? preset.bgColor : colors.neutral700;

    // Mask card number using wallet ID
    const cardIdStr = item.id ? String(item.id).substring(Math.max(0, String(item.id).length - 4)) : "8899";
    const maskedCardNumber = `***   ***   ***   ****`;

    // Colored glow shadow matching the card gradient
    const glowColor = cardGradient[0];

    return (
      <View style={[styles.cardWrapper, { shadowColor: glowColor, shadowOpacity: 0.35, shadowRadius: 14, elevation: 8 }]}>
        <LinearGradient
          colors={cardGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.cardGradient}
        >
          <View style={styles.cardHeader}>
            <View>
              <Typo size={12} color="rgba(255, 255, 255, 0.7)" fontWeight="500">
                BALANCE
              </Typo>
              <Typo size={22} color={colors.white} fontWeight="700" style={{ marginTop: 2 }}>
                {isBalanceHidden ? "••••" : `${user?.currency || "$"}${item.amount?.toFixed(2)}`}
              </Typo>
            </View>
            <View style={[styles.cardLogoContainer, { backgroundColor: brandBg }]}>
              {preset ? (
                <PresetIcon size={verticalScale(18)} color={preset.color} weight="bold" />
              ) : (
                <Image
                  style={styles.cardLogoImage}
                  source={item.image}
                  contentFit="cover"
                  transition={100}
                />
              )}
            </View>
          </View>

          {/* Card chip & Mock info */}
          <View style={styles.cardMiddle}>
            <LinearGradient
              colors={["#FFE082", "#FFB300"]}
              style={styles.cardChip}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />
            <Typo size={14} color="rgba(255, 255, 255, 0.9)" fontWeight="600" style={{ letterSpacing: 2 }}>
              {maskedCardNumber}
            </Typo>
          </View>

          <View style={styles.cardFooter}>
            <View>
              <Typo size={9} color="rgba(255, 255, 255, 0.5)" fontWeight="500">
                CARDHOLDER
              </Typo>
              <Typo size={13} color={colors.white} fontWeight="600" style={{ marginTop: 1 }}>
                {user?.name?.toUpperCase() || "SPENDWISE USER"}
              </Typo>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Typo size={9} color="rgba(255, 255, 255, 0.5)" fontWeight="500">
                ACCOUNT NAME
              </Typo>
              <Typo size={13} color={colors.white} fontWeight="600" style={{ marginTop: 1 }} textProps={{ numberOfLines: 1 }}>
                {item.name}
              </Typo>
            </View>
          </View>
        </LinearGradient>
      </View>
    );
  };

  return (
    <ScreenWrapper style={{ backgroundColor: themeColors.background }}>
      <TransactionList
        data={filteredTransactions}
        title={activeWallet ? "Recent Transactions" : ""}
        loading={transactionsLoading}
        emptyListMessage={activeWallet ? "No transactions found for this wallet." : "Please create a wallet to start adding transactions."}
        titleRightComponent={
          activeWallet ? (
            <FilterTabs 
              filters={["All", "Income", "Expense", "This Week", "This Month"]}
              activeFilter={activeFilter}
              onFilterSelect={setActiveFilter}
              style={{ marginVertical: 0 }}
            />
          ) : null
        }
        horizontalPadding={spacingX._20}
        ListHeaderComponent={
          <View style={styles.headerComponent}>
            {/* Header Dashboard Bar */}
            <View style={styles.dashboardHeader}>
              <View>
                <Typo size={26} fontWeight="700">
                  Wallets
                </Typo>
                <Typo size={13} color={themeColors.textLighter} fontWeight="500" style={{ marginTop: 2 }}>
                  {wallets.length > 0
                    ? <>{wallets.length} {wallets.length === 1 ? "wallet" : "wallets"} {" · "} Net: <Typo size={13} color={colors.primary} fontWeight="700">{isBalanceHidden ? "••••" : `${user?.currency || "$"}${getTotalBalance()?.toFixed(2)}`}</Typo></>
                    : "No wallets yet"
                  }
                </Typo>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: scale(8) }}>
                <TouchableOpacity
                  onPress={() => setIsBalanceHidden((v) => !v)}
                  style={[styles.iconBtn, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}
                >
                  {isBalanceHidden
                    ? <Icons.EyeSlashIcon size={verticalScale(17)} color={themeColors.textLight} weight="bold" />
                    : <Icons.EyeIcon size={verticalScale(17)} color={themeColors.textLight} weight="bold" />
                  }
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => router.push("/(modals)/walletModal")}
                  style={styles.addButton}
                >
                  <Icons.PlusIcon size={verticalScale(15)} color={colors.black} weight="bold" />
                  <Typo size={13} fontWeight="700" color={colors.black}>Add Wallet</Typo>
                </TouchableOpacity>
              </View>
            </View>

            {walletsLoading && wallets.length === 0 ? (
              <View style={styles.loadingContainer}>
                <Loading size="large" />
              </View>
            ) : wallets.length === 0 ? (
              <View style={[styles.emptyContainer, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
                <View style={[styles.emptyIconBox, { backgroundColor: themeColors.inputBg }]}>
                  <Icons.CardholderIcon size={verticalScale(36)} color={themeColors.textLighter} />
                </View>
                <Typo size={15} color={themeColors.textLighter} style={{ textAlign: "center" }}>
                  {"You don't have any wallets set up yet. Add a wallet to track and manage your balances."}
                </Typo>
                <TouchableOpacity
                  onPress={() => router.push("/(modals)/walletModal")}
                  style={styles.emptyAddButton}
                >
                  <Typo size={14} color={colors.primary} fontWeight="bold">
                    + Add New Wallet
                  </Typo>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.swiperSection}>
                {/* Horizontal Snap Swiper */}
                <FlatList
                  data={wallets}
                  renderItem={renderCardItem}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  snapToInterval={snapInterval}
                  decelerationRate="fast"
                  contentContainerStyle={{
                    paddingHorizontal: (screenWidth - cardWidth) / 2,
                    paddingVertical: spacingY._10,
                  }}
                  onScroll={onScroll}
                  scrollEventThrottle={16}
                  keyExtractor={(item) => item.id || ""}
                />

                {/* Swiper Pagination Dots */}
                <View style={styles.dotsRow}>
                  {wallets.map((_, index) => (
                    <View
                      key={index}
                      style={[
                        styles.dot,
                        index === selectedIndex
                          ? [styles.activeDot, { backgroundColor: colors.primary }]
                          : { backgroundColor: themeColors.border },
                      ]}
                    />
                  ))}
                </View>

                {/* Selected Wallet Actions */}
                <View style={styles.actionsContainer}>
                  <TouchableOpacity
                    onPress={handleAddTransaction}
                    style={styles.actionButtonPrimary}
                  >
                    <Icons.PlusCircleIcon size={verticalScale(17)} color={colors.black} weight="bold" />
                    <Typo size={13} fontWeight="700" color={colors.black}>Add</Typo>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handleTransfer}
                    style={[styles.actionButtonSecondary, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}
                  >
                    <Icons.ArrowsLeftRightIcon size={verticalScale(17)} color={colors.primary} weight="bold" />
                    <Typo size={13} fontWeight="600">Transfer</Typo>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handleEditWallet}
                    style={[styles.actionButtonSecondary, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}
                  >
                    <Icons.PencilSimpleIcon size={verticalScale(17)} color={themeColors.textLight} weight="bold" />
                    <Typo size={13} fontWeight="600" color={themeColors.textLight}>Edit</Typo>
                  </TouchableOpacity>
                </View>

                {/* Selected Wallet Stats Card */}
                {(() => {
                  const total = activeWalletStats.income + activeWalletStats.expense;
                  const spendRatio = total > 0 ? Math.min(activeWalletStats.expense / total, 1) : 0;
                  return (
                    <View style={[styles.statsCard, { backgroundColor: themeColors.card }]}>
                      {/* Income + Expense side by side */}
                      <View style={styles.statsRow}>
                        <View style={styles.statsColumn}>
                          <View style={styles.statsHeader}>
                            <View style={[styles.statsIconContainer, { backgroundColor: "rgba(74, 222, 128, 0.15)" }]}>
                              <Icons.ArrowDownIcon size={verticalScale(13)} color={colors.green} weight="bold" />
                            </View>
                            <Typo size={12} color={themeColors.textLighter} fontWeight="500">
                              Total Income
                            </Typo>
                          </View>
                          <Typo size={16} fontWeight="700" color={colors.green} style={{ marginTop: scale(6) }}>
                          {isBalanceHidden ? "••••" : `${user?.currency || "$"}${activeWalletStats.income.toFixed(2)}`}
                        </Typo>
                        </View>

                        <View style={[styles.statsDivider, { backgroundColor: themeColors.border }]} />

                        <View style={styles.statsColumn}>
                          <View style={styles.statsHeader}>
                            <View style={[styles.statsIconContainer, { backgroundColor: "rgba(239, 68, 68, 0.15)" }]}>
                              <Icons.ArrowUpIcon size={verticalScale(13)} color={colors.rose} weight="bold" />
                            </View>
                            <Typo size={12} color={themeColors.textLighter} fontWeight="500">
                              Total Expense
                            </Typo>
                          </View>
                          <Typo size={16} fontWeight="700" color={colors.rose} style={{ marginTop: scale(6) }}>
                          {isBalanceHidden ? "••••" : `${user?.currency || "$"}${activeWalletStats.expense.toFixed(2)}`}
                        </Typo>
                        </View>
                      </View>

                      {/* Spend ratio bar — sits naturally below the stats row */}
                      {total > 0 && (
                        <View style={styles.spendRatioWrapper}>
                          <View style={[styles.spendRatioTrack, { backgroundColor: themeColors.inputBg }]}>
                            <View style={[styles.spendRatioFill, { width: `${spendRatio * 100}%` }]} />
                          </View>
                          <Typo size={11} color={themeColors.textLighter} style={{ marginTop: scale(4) }}>
                            {(spendRatio * 100).toFixed(0)}% of income spent
                          </Typo>
                        </View>
                      )}
                    </View>
                  );
                })()}
              </View>
            )}
          </View>
        }
      />
    </ScreenWrapper>
  );
};

export default Wallet;

const styles = StyleSheet.create({
  headerComponent: {
    paddingBottom: spacingY._15,
  },
  dashboardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacingX._20,
    marginTop: verticalScale(10),
    marginBottom: spacingY._15,
  },
  iconBtn: {
    width: verticalScale(36),
    height: verticalScale(36),
    borderRadius: 100,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(6),
    backgroundColor: colors.primary,
    paddingVertical: spacingY._7,
    paddingHorizontal: spacingX._15,
    borderRadius: radius._30,
  },
  loadingContainer: {
    height: verticalScale(200),
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
    marginHorizontal: spacingX._20,
    padding: spacingY._25,
    borderWidth: 1,
    borderStyle: "dashed",
    borderRadius: radius._20,
    alignItems: "center",
    gap: spacingY._15,
    marginTop: spacingY._20,
  },
  emptyIconBox: {
    width: verticalScale(54),
    height: verticalScale(54),
    borderRadius: radius._15,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyAddButton: {
    paddingVertical: spacingY._5,
    paddingHorizontal: spacingX._15,
  },
  swiperSection: {
    gap: spacingY._15,
  },
  cardWrapper: {
    width: cardWidth,
    height: scale(175),
    marginHorizontal: cardGap / 2,
    borderRadius: radius._20,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
    overflow: "hidden",
  },
  cardGradient: {
    flex: 1,
    padding: spacingY._15,
    justifyContent: "space-between",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  cardLogoContainer: {
    width: verticalScale(36),
    height: verticalScale(36),
    borderRadius: 100,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  cardLogoImage: {
    width: "100%",
    height: "100%",
  },
  cardMiddle: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(12),
  },
  cardChip: {
    width: scale(32),
    height: scale(22),
    borderRadius: 100,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: scale(6),
    marginTop: spacingY._5,
  },
  dot: {
    width: scale(6),
    height: scale(6),
    borderRadius: scale(3),
  },
  activeDot: {
    width: scale(16),
  },
  actionsContainer: {
    flexDirection: "row",
    paddingHorizontal: spacingX._20,
    gap: scale(10),
    marginTop: spacingY._10,
  },
  actionButtonPrimary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: scale(6),
    flex: 1,
    backgroundColor: colors.primary,
    paddingVertical: spacingY._10,
    borderRadius: radius._12,
  },
  actionButtonSecondary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: scale(6),
    flex: 1,
    borderWidth: 1,
    paddingVertical: spacingY._10,
    borderRadius: radius._12,
  },
  statsCard: {
    flexDirection: "column",
    marginHorizontal: spacingX._20,
    padding: spacingY._15,
    borderRadius: radius._15,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
    marginTop: spacingY._5,
    gap: spacingY._12,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  statsColumn: {
    flex: 1,
  },
  statsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(8),
  },
  statsIconContainer: {
    width: verticalScale(22),
    height: verticalScale(22),
    borderRadius: 100,
    justifyContent: "center",
    alignItems: "center",
  },
  statsDivider: {
    width: 1,
    height: "80%",
    marginHorizontal: scale(15),
  },
  spendRatioWrapper: {
    width: '100%',
  },
  spendRatioTrack: {
    height: verticalScale(4),
    borderRadius: 100,
    overflow: 'hidden',
    width: '100%',
  },
  spendRatioFill: {
    height: '100%',
    backgroundColor: colors.rose,
    borderRadius: 100,
  },
});
