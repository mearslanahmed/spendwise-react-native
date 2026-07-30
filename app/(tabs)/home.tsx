import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native'
import React, { useEffect } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage';
import Button from '@/components/Button'
import Typo from '@/components/Typo'
import { colors, radius, spacingX, spacingY } from '@/constants/theme'
import { useAuth } from '@/contexts/authContext'
import ScreenWrapper from '@/components/ScreenWrapper'
import { scale, verticalScale } from '@/utils/styling'
import * as Icons from 'phosphor-react-native'
import HomeCard from '@/components/HomeCard'
import TransactionList from '@/components/TransactionList'
import FilterTabs from '@/components/FilterTabs'
import { useData } from '@/contexts/dataContext'
import { useRouter } from 'expo-router'
import { expenseCategories } from '@/constants/data'
import { useTheme } from '@/contexts/themeContext'
import { resolveTime } from '@/utils/dateHelper'

const Home = () => {
    const { user } = useAuth();
    const router = useRouter();
    const { colors: themeColors } = useTheme();
    const { transactions, budgets, notifications, loading, wallets } = useData();

    useEffect(() => {
      const checkTutorial = async () => {
        if (!user?.uid) return;
        const hasSeen = await AsyncStorage.getItem(`hasSeenTutorial_${user.uid}`);
        if (!hasSeen) {
          router.push("/(modals)/tutorialModal" as any);
        }
      };
      
      // Delay slightly to ensure layout is mounted
      const timer = setTimeout(checkTutorial, 500);
      return () => clearTimeout(timer);
    }, [router]);

    const unreadCount = React.useMemo(() => {
      return notifications?.filter(n => !n.read).length || 0;
    }, [notifications]);

    const [queryLimit, setQueryLimit] = React.useState(30);
    const [activeFilter, setActiveFilter] = React.useState("All");

    const transactionLoading = loading.transactions;

    const startOfMonth = React.useMemo(() => {
      const d = new Date();
      d.setDate(1);
      d.setHours(0, 0, 0, 0);
      return d;
    }, []);

    const recentTransactions = React.useMemo(() => {
      let filtered = [...transactions];
      
      if (activeFilter === "Income") {
        filtered = filtered.filter(tx => tx.type === "income");
      } else if (activeFilter === "Expense") {
        filtered = filtered.filter(tx => tx.type === "expense");
      } else if (activeFilter === "This Week") {
        const now = new Date();
        const day = now.getDay() || 7; 
        const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day + 1).getTime();
        const endOfWeek = startOfWeek + (7 * 24 * 60 * 60 * 1000) - 1;
        
        filtered = filtered.filter(tx => {
          const txTime = resolveTime(tx.date);
          return txTime >= startOfWeek && txTime <= endOfWeek;
        });
      } else if (activeFilter === "This Month") {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).getTime();
        
        filtered = filtered.filter(tx => {
          const txTime = resolveTime(tx.date);
          return txTime >= startOfMonth && txTime <= endOfMonth;
        });
      }
      
      const sorted = filtered.sort((a, b) => {
        const aTime = resolveTime(a.date);
        const bTime = resolveTime(b.date);
        return bTime - aTime;
      });
      return sorted.slice(0, queryLimit);
    }, [transactions, queryLimit, activeFilter]);

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
        if (tx.type === "expense" && tx.category) {
          totals[tx.category] = (totals[tx.category] || 0) + Number(tx.amount);
        }
      });
      return totals;
    }, [monthTransactions]);

    const warningBudgets = React.useMemo(() => {
      return budgets
        .map((budget) => {
          const spent = spentByCategory[budget.category] || 0;
          const limit = budget.amount;
          const percent = limit > 0 ? (spent / limit) * 100 : 0;
          return {
            ...budget,
            spent,
            percent,
          };
        })
        .filter((b) => b.percent >= 80)
        .sort((a, b) => b.percent - a.percent);
    }, [budgets, spentByCategory]);

    const loadMore = () => {
      if (recentTransactions.length >= queryLimit) {
        setQueryLimit((prev) => prev + 30);
      }
    };

    if (!user) return null;
    
  return (
  <ScreenWrapper>
    <View style={styles.container}>
      {/* header */}
      <View style={styles.header}>
        <View style={{ gap: 4 }}>
          <Typo size={16} color={colors.neutral400}>
            Hello,
          </Typo>
          <Typo size={20} fontWeight={"500"}>
            {user?.name}
          </Typo>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={[styles.searchIcon, { backgroundColor: themeColors.inputBg }]} 
            onPress={() => router.push("/(modals)/searchModal")}
          >
            <Icons.MagnifyingGlassIcon
              size={verticalScale(22)}
              color={themeColors.textLighter}
              weight="bold"
            />
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.searchIcon, { backgroundColor: themeColors.inputBg }]} 
            onPress={() => router.push("/(modals)/notificationsModal" as any)}
          >
            <Icons.BellIcon
              size={verticalScale(22)}
              color={themeColors.textLighter}
              weight={unreadCount > 0 ? "fill" : "bold"}
            />
            {unreadCount > 0 && (
              <View style={[styles.notificationBadge, { borderColor: themeColors.inputBg, borderWidth: 2 }]} />
            )}
          </TouchableOpacity>
        </View>
      </View>

      <View
        style={styles.scrollViewStyle}
      >
        <TransactionList 
          data={recentTransactions}
          loading={transactionLoading}
          emptyListMessage={wallets.length === 0 ? "No wallets found. Tap to create one!" : "No transactions yet. Tap to add one!"}
          onEmptyClick={() => wallets.length === 0 ? router.push("/(modals)/walletModal" as any) : router.push("/(modals)/transactionModal")}
          title="Recent Transactions"
          onEndReached={loadMore}
          titleRightComponent={
            <FilterTabs 
              filters={["All", "Income", "Expense", "This Week", "This Month"]}
              activeFilter={activeFilter}
              onFilterSelect={setActiveFilter}
              style={{ marginVertical: 0 }}
            />
          }
          ListHeaderComponent={
            <View style={{ marginBottom: spacingY._25, gap: spacingY._15 }}>
              <HomeCard />

              {warningBudgets.length > 0 && (
                <View style={styles.warningsSection}>
                  <View style={styles.warningsHeader}>
                    <Typo size={16} fontWeight="600" color={themeColors.text}>
                      Budget Alerts
                    </Typo>
                  </View>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.warningsScrollContainer}
                  >
                    {warningBudgets.map((b) => {
                      const categoryData = expenseCategories[b.category];
                      const IconComponent = categoryData?.icon || Icons.QuestionIcon;
                      const isExceeded = b.percent >= 100;
                      const cardBorderColor = isExceeded ? colors.rose : "#f97316";
                      const cardBg = themeColors.card;

                      return (
                        <TouchableOpacity
                          key={b.id}
                          style={[
                            styles.warningCard,
                            {
                              backgroundColor: cardBg,
                              borderColor: cardBorderColor,
                              borderWidth: 1,
                            },
                          ]}
                          onPress={() =>
                            router.push({
                              pathname: "/(modals)/budgetModal",
                              params: {
                                id: b.id,
                                category: b.category,
                                amount: b.amount.toString(),
                              },
                            })
                          }
                        >
                          <View style={styles.warningCardHeader}>
                            <View
                              style={[
                                styles.warningIconContainer,
                                { backgroundColor: categoryData?.bgColor || colors.neutral500 },
                              ]}
                            >
                              <IconComponent size={verticalScale(16)} weight="fill" color={colors.white} />
                            </View>
                            <View style={{ flex: 1 }}>
                              <Typo size={14} fontWeight="600" textProps={{ numberOfLines: 1 }}>
                                {categoryData?.label || b.category}
                              </Typo>
                              <Typo size={11} color={isExceeded ? colors.rose : "#f97316"} fontWeight="500">
                                {isExceeded ? "Over Budget!" : "Near Limit!"}
                              </Typo>
                            </View>
                          </View>

                          <View style={styles.warningCardProgressRow}>
                            <Typo size={12} color={themeColors.textLighter}>
                              {b.percent.toFixed(0)}% full
                            </Typo>
                            <Typo size={12} fontWeight="500">
                              {user.currency || "$"}{b.spent.toFixed(0)} / {user.currency || "$"}{b.amount.toFixed(0)}
                            </Typo>
                          </View>
                          
                          <View style={[styles.cardProgressBarContainer, { backgroundColor: themeColors.inputBg }]}>
                            <View
                              style={[
                                styles.cardProgressBar,
                                {
                                  width: `${Math.min(b.percent, 100)}%`,
                                  backgroundColor: isExceeded ? colors.rose : "#f97316",
                                },
                              ]}
                            />
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              )}

            </View>
          } 
        />
      </View>

      <Button 
        style={styles.floatingButton} 
        onPress={()=> router.push("/(modals)/transactionModal")}
      >
        <Icons.PlusIcon
          size={verticalScale(24)}
          color={colors.black}
          weight="bold"
        />
      </Button>
    </View>
  </ScreenWrapper>
);
}

export default Home

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacingX._20,
    marginTop: verticalScale(8),
  },

  // Header Styles
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacingY._10,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(10),
  },
  notificationBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.rose,
  },
  searchIcon: {
    backgroundColor: colors.neutral700,
    padding: spacingX._10,
    borderRadius: 50,
  },

  // Floating Action Button
  floatingButton: {
    height: verticalScale(50),
    width: verticalScale(50),
    borderRadius: 100,
    position: "absolute",
    bottom: verticalScale(100),
    right: verticalScale(20),
    zIndex: 999,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
  },

  // ScrollView Layout
  scrollViewStyle: {
    flex: 1,
    marginTop: spacingY._10,
    gap: spacingY._25,
  },

  // List Item Container (Renamed from 'container' to avoid conflict)
  itemContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: verticalScale(17),
    // padding: spacingX._15,
  },

  // List Item Image
  imageContainer: {
    height: verticalScale(45),
    width: verticalScale(45),
    borderWidth: 1,
    borderColor: colors.neutral600,
    borderRadius: radius._12,
    borderCurve: "continuous",
    overflow: "hidden",
  },

  // List Item Text Area
  nameContainer: {
    flex: 1,
    gap: 2,
    marginLeft: spacingX._10,
  },
  warningsSection: {
    marginTop: spacingY._5,
    gap: spacingY._10,
  },
  warningsHeader: {
    paddingHorizontal: 2,
  },
  warningsScrollContainer: {
    gap: scale(12),
    paddingBottom: spacingY._5,
  },
  warningCard: {
    width: scale(160),
    padding: spacingY._12,
    borderRadius: radius._15,
    gap: scale(8),
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  warningCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
  },
  warningIconContainer: {
    width: verticalScale(28),
    height: verticalScale(28),
    borderRadius: radius._6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  warningCardProgressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardProgressBarContainer: {
    height: verticalScale(4),
    borderRadius: radius._3,
    width: '100%',
    overflow: 'hidden',
  },
  cardProgressBar: {
    height: '100%',
    borderRadius: radius._3,
  },
});