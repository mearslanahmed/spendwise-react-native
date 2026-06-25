import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import React, { useEffect, useState } from 'react'
import ScreenWrapper from '@/components/ScreenWrapper'
import { colors, radius, spacingX, spacingY } from '@/constants/theme'
import { scale, verticalScale } from '@/utils/styling'
import Header from '@/components/Header'
import Typo from '@/components/Typo'
import Toast from 'react-native-toast-message';
import SegmentedControlTab from "react-native-segmented-control-tab";
import { BarChart } from "react-native-gifted-charts";
import Loading from '@/components/Loading'
import { useAuth } from '@/contexts/authContext'
import TransactionList from '@/components/TransactionList'
import { BudgetType, TransactionType } from '@/types'
import { Timestamp } from 'firebase/firestore'
import { useTheme } from '@/contexts/themeContext'
import * as Icons from 'phosphor-react-native'
import { useRouter } from 'expo-router'
import { expenseCategories } from '@/constants/data'
import { getLast12Months, getLast7Days, getYearsRange } from '@/utils/common'
import { useData } from '@/contexts/dataContext'


const Statistics = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const {user} = useAuth();
  const { colors: themeColors, isDark } = useTheme();
  const [queryLimit, setQueryLimit] = useState(30);
  const router = useRouter();

  const { transactions: allUserTransactions, budgets, loading } = useData();

  const chartLoading = loading.transactions;
  const transactionLoading = loading.transactions;
  const budgetsLoading = loading.budgets;

  const transactions = React.useMemo(() => {
    let filtered = [...allUserTransactions];
    
    // Sort desc by date
    filtered.sort((a, b) => {
      const aTime = (a.date as Timestamp)?.toDate().getTime() || new Date(a.date as string).getTime();
      const bTime = (b.date as Timestamp)?.toDate().getTime() || new Date(b.date as string).getTime();
      return bTime - aTime;
    });

    const today = new Date();
    if (activeIndex === 0) {
      // Weekly: last 7 days
      const sevenDaysAgo = new Date(today);
      sevenDaysAgo.setDate(today.getDate() - 7);
      const limitTime = sevenDaysAgo.getTime();
      filtered = filtered.filter((tx) => {
        const txTime = (tx.date as Timestamp)?.toDate().getTime() || new Date(tx.date as string).getTime();
        return txTime >= limitTime;
      });
    } else if (activeIndex === 1) {
      // Monthly: last 12 months
      const twelveMonthsAgo = new Date(today);
      twelveMonthsAgo.setMonth(today.getMonth() - 12);
      const limitTime = twelveMonthsAgo.getTime();
      filtered = filtered.filter((tx) => {
        const txTime = (tx.date as Timestamp)?.toDate().getTime() || new Date(tx.date as string).getTime();
        return txTime >= limitTime;
      });
    }
    
    return filtered.slice(0, queryLimit);
  }, [allUserTransactions, activeIndex, queryLimit]);

  const spentByCategory = React.useMemo(() => {
    const totals: { [category: string]: number } = {};
    const now = new Date();
    const startOfMonthTime = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0).getTime();

    allUserTransactions.forEach((tx) => {
      const txTime = (tx.date as Timestamp)?.toDate().getTime() || new Date(tx.date as string).getTime();
      if (txTime >= startOfMonthTime && tx.type === "expense" && tx.category) {
        totals[tx.category] = (totals[tx.category] || 0) + Number(tx.amount);
      }
    });
    return totals;
  }, [allUserTransactions]);

  const chartData = React.useMemo(() => {
    if (activeIndex === 0) {
      const weeklyData = getLast7Days();
      weeklyData.forEach((day) => {
        const [y, m, d] = day.date.split("-").map(Number);
        const dayStart = new Date(y, m - 1, d, 0, 0, 0, 0).getTime();
        const dayEnd = new Date(y, m - 1, d, 23, 59, 59, 999).getTime();

        allUserTransactions.forEach((tx) => {
          const txTime = (tx.date as Timestamp)?.toDate().getTime() || new Date(tx.date as string).getTime();
          if (txTime >= dayStart && txTime <= dayEnd) {
            if (tx.type === "income") {
              day.income += Number(tx.amount) || 0;
            } else if (tx.type === "expense") {
              day.expense += Number(tx.amount) || 0;
            }
          }
        });
      });

      return weeklyData.flatMap((day) => [
        {
          value: day.income,
          label: day.day,
          spacing: scale(4),
          labelWidth: scale(30),
          frontColor: colors.primary,
        },
        {
          value: day.expense,
          frontColor: colors.rose,
        },
      ]);
    } else if (activeIndex === 1) {
      const monthlyData = getLast12Months();
      monthlyData.forEach((month) => {
        const [y, m, d] = month.fullDate.split("-").map(Number);
        const startOfMonth = new Date(y, m - 1, 1, 0, 0, 0, 0).getTime();
        const endOfMonth = new Date(y, m, 0, 23, 59, 59, 999).getTime();

        allUserTransactions.forEach((tx) => {
          const txTime = (tx.date as Timestamp)?.toDate().getTime() || new Date(tx.date as string).getTime();
          if (txTime >= startOfMonth && txTime <= endOfMonth) {
            if (tx.type === "income") {
              month.income += Number(tx.amount) || 0;
            } else if (tx.type === "expense") {
              month.expense += Number(tx.amount) || 0;
            }
          }
        });
      });

      return monthlyData.flatMap((month) => [
        {
          value: month.income,
          label: month.month,
          spacing: scale(4),
          labelWidth: scale(46),
          frontColor: colors.primary,
        },
        {
          value: month.expense,
          frontColor: colors.rose,
        },
      ]);
    } else {
      let firstYear = new Date().getFullYear();
      if (allUserTransactions.length > 0) {
        const sorted = [...allUserTransactions].sort((a, b) => {
          const aTime = (a.date as Timestamp)?.toDate().getTime() || new Date(a.date as string).getTime();
          const bTime = (b.date as Timestamp)?.toDate().getTime() || new Date(b.date as string).getTime();
          return aTime - bTime;
        });
        firstYear = (sorted[0].date as Timestamp)?.toDate().getFullYear() || new Date(sorted[0].date as string).getFullYear();
      }
      const currentYear = new Date().getFullYear();
      const yearsData = getYearsRange(firstYear, currentYear);

      yearsData.forEach((yearObj: any) => {
        const y = parseInt(yearObj.year);
        const startOfYear = new Date(y, 0, 1, 0, 0, 0, 0).getTime();
        const endOfYear = new Date(y, 11, 31, 23, 59, 59, 999).getTime();

        allUserTransactions.forEach((tx) => {
          const txTime = (tx.date as Timestamp)?.toDate().getTime() || new Date(tx.date as string).getTime();
          if (txTime >= startOfYear && txTime <= endOfYear) {
            if (tx.type === "income") {
              yearObj.income += Number(tx.amount) || 0;
            } else if (tx.type === "expense") {
              yearObj.expense += Number(tx.amount) || 0;
            }
          }
        });
      });

      return yearsData.flatMap((year: any) => [
        {
          value: year.income,
          label: year.year,
          spacing: scale(4),
          labelWidth: scale(35),
          frontColor: colors.primary,
        },
        {
          value: year.expense,
          frontColor: colors.rose,
        },
      ]);
    }
  }, [activeIndex, allUserTransactions]);

  const maxValue = React.useMemo(() => {
    const maxVal = chartData.reduce((max, item) => Math.max(max, item.value || 0), 0);
    return maxVal > 0 ? maxVal : 100;
  }, [chartData]);

  const chartKey = React.useMemo(() => {
    const totalAmount = allUserTransactions.reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);
    return `${activeIndex}_${allUserTransactions.length}_${totalAmount}`;
  }, [activeIndex, allUserTransactions]);

  const loadMore = () => {
    if (transactions.length >= queryLimit) {
      setQueryLimit((prev) => prev + 30);
    }
  };

  useEffect(() => {
    setQueryLimit(30);
  }, [activeIndex]);

  if (!user) return null;

  return (
    <ScreenWrapper>
      <View style={styles.container}>
        <View style={styles.header}>
          <Header title="Statistics" />
        </View>

        <TransactionList 
          loading={transactionLoading}
          title='Transactions'
          emptyListMessage='No transaction found'
          data={transactions}
          onEndReached={loadMore}
          ListHeaderComponent={
            <View style={{ gap: spacingY._20, paddingTop: spacingY._5, paddingBottom: spacingY._20 }}>
              <SegmentedControlTab
                values={["Weekly", "Monthly", "Yearly"]}
                selectedIndex={activeIndex}
                onTabPress={setActiveIndex}
                tabsContainerStyle={styles.segmentStyle}
                tabStyle={{ backgroundColor: themeColors.inputBg, borderColor: themeColors.border }}
                activeTabStyle={{ backgroundColor: colors.primary }}
                tabTextStyle={{...styles.segmentFontStyle, color: themeColors.textLight}}
                activeTabTextStyle={{...styles.segmentFontStyle, color: colors.black}}
              />

              <View style={styles.chartContainer}>
                {
                  chartData.length > 0? (
                    <BarChart
                      key={chartKey}
                      data={chartData}
                      barWidth={scale(12)}
                      spacing={[1,2].includes(activeIndex) ? scale(25) : scale(16)}
                      roundedTop
                      roundedBottom
                      hideRules
                      yAxisLabelPrefix={user?.currency || "$"}
                      yAxisThickness={0}
                      xAxisThickness={0}
                      yAxisLabelWidth={[1,2].includes(activeIndex) ? scale(55) : scale(50)}
                      yAxisTextStyle={{ color: themeColors.textLighter }}
                      xAxisLabelTextStyle={{
                        color: themeColors.textLighter,
                        fontSize: verticalScale(12),
                      }}
                      noOfSections={3}
                      minHeight={5}
                      isAnimated={true}
                      maxValue={maxValue}
                    />
                  ):(
                    <View style={[styles.noChart, { backgroundColor: themeColors.inputBg }]}/>
                  )
                }
                {
                  chartLoading && (
                    <View style={styles.chartLoadingContainer}>
                      <Loading color={colors.primary}/>
                    </View>
                  )
                }
              </View>

              {/* Category Budgets Section */}
              <View style={styles.budgetsSection}>
                <View style={styles.budgetsHeader}>
                  <Typo size={20} fontWeight={"500"}>
                    Category Budgets
                  </Typo>
                  <TouchableOpacity
                    style={[styles.manageButton, { borderColor: themeColors.border }]}
                    onPress={() => router.push("/(modals)/budgetModal")}
                  >
                    <Icons.SlidersIcon
                      size={verticalScale(16)}
                      color={themeColors.textLight}
                    />
                    <Typo size={13} color={themeColors.textLight} fontWeight="500">
                      Manage
                    </Typo>
                  </TouchableOpacity>
                </View>

                {budgetsLoading ? (
                  <Loading size="small" />
                ) : budgets.length === 0 ? (
                  <View style={[styles.emptyBudgets, { backgroundColor: themeColors.inputBg, borderColor: themeColors.border }]}>
                    <Typo size={14} color={themeColors.textLighter} style={{ textAlign: "center" }}>
                      No category budgets set. Set one to track your monthly spending.
                    </Typo>
                    <TouchableOpacity
                      style={styles.addBudgetInlineButton}
                      onPress={() => router.push("/(modals)/budgetModal")}
                    >
                      <Typo size={14} color={colors.primary} fontWeight="bold">
                        + Add Budget
                      </Typo>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.budgetsList}>
                    {budgets.map((budget) => {
                      const categoryData = expenseCategories[budget.category];
                      const IconComponent = categoryData?.icon || Icons.QuestionIcon;
                      const spent = spentByCategory[budget.category] || 0;
                      const limit = budget.amount;
                      const percent = limit > 0 ? (spent / limit) * 100 : 0;
                      
                      let progressColor = colors.green;
                      if (percent >= 100) {
                        progressColor = colors.rose;
                      } else if (percent >= 75) {
                        progressColor = "#f97316"; // orange
                      }

                      return (
                        <TouchableOpacity
                          key={budget.id}
                          style={[styles.budgetCard, { backgroundColor: themeColors.card }]}
                          onPress={() =>
                            router.push({
                              pathname: "/(modals)/budgetModal",
                              params: {
                                id: budget.id,
                                category: budget.category,
                                amount: budget.amount.toString(),
                              },
                            })
                          }
                        >
                          <View style={styles.budgetTopRow}>
                            <View style={styles.budgetCategoryInfo}>
                              <View style={[styles.budgetIconContainer, { backgroundColor: categoryData?.bgColor || colors.neutral500 }]}>
                                <IconComponent size={verticalScale(18)} weight="fill" color={colors.white} />
                              </View>
                              <Typo size={15} fontWeight="600">
                                {categoryData?.label || budget.category}
                              </Typo>
                            </View>
                            <Typo size={14} fontWeight="500" color={themeColors.textLight}>
                              {user.currency || "$"}{spent.toFixed(0)} / {user.currency || "$"}{limit.toFixed(0)}
                            </Typo>
                          </View>
                          
                          <View style={[styles.progressBarContainer, { backgroundColor: themeColors.inputBg }]}>
                            <View
                              style={[
                                styles.progressBar,
                                {
                                  width: `${Math.min(percent, 100)}%`,
                                  backgroundColor: progressColor,
                                },
                              ]}
                            />
                          </View>
                          {percent >= 100 && (
                            <Typo size={11} color={colors.rose} style={{ marginTop: 2 }} fontWeight="500">
                              Exceeded by {user.currency || "$"}{(spent - limit).toFixed(0)}!
                            </Typo>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </View>

            </View>
          }
        />
      </View>
    </ScreenWrapper>
  )
}

export default Statistics

const styles = StyleSheet.create({
  chartContainer: {
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
  },
  chartLoadingContainer: {
    position: "absolute",
    width: "100%",
    height: "100%",
    borderRadius: radius._12,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
  },
  header: {},
  noChart: {
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    height: verticalScale(210),
  },
  searchIcon: {
    backgroundColor: colors.neutral700,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 100,
    height: verticalScale(35),
    width: verticalScale(35),
    borderCurve: "continuous",
  },
  segmentStyle: {
    height: scale(37),
  },
  segmentFontStyle: {
    fontSize: verticalScale(13),
    fontWeight: "bold",
    color: colors.black,
  },
  container: {
    paddingHorizontal: spacingX._20,
    paddingVertical: spacingY._5,
    gap: spacingY._10,
    flex: 1,
  },
  budgetsSection: {
    marginTop: spacingY._10,
    gap: spacingY._15,
  },
  budgetsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  manageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(5),
    borderWidth: 1,
    paddingVertical: spacingY._5,
    paddingHorizontal: spacingX._10,
    borderRadius: radius._10,
  },
  emptyBudgets: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: radius._12,
    padding: spacingY._20,
    alignItems: 'center',
    gap: spacingY._10,
  },
  addBudgetInlineButton: {
    paddingVertical: spacingY._5,
    paddingHorizontal: spacingX._15,
  },
  budgetsList: {
    gap: spacingY._12,
  },
  budgetCard: {
    padding: spacingY._12,
    borderRadius: radius._12,
    gap: spacingY._10,
  },
  budgetTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  budgetCategoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(10),
  },
  budgetIconContainer: {
    width: verticalScale(32),
    height: verticalScale(32),
    borderRadius: radius._6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressBarContainer: {
    height: verticalScale(6),
    borderRadius: radius._3,
    width: '100%',
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: radius._3,
  },
})