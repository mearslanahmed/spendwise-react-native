import { ImageBackground, StyleSheet, Text, View } from 'react-native'
import React from 'react'
import Typo from './Typo'
import { scale, verticalScale } from '@/utils/styling'
import { colors, spacingX, spacingY } from '@/constants/theme'
import * as Icons from 'phosphor-react-native'
import { WalletType } from '@/types'
import { useData } from '@/contexts/dataContext'
import { useAuth } from '@/contexts/authContext'

const HomeCard = () => {
    const {user} = useAuth();
    const { wallets: allWallets, loading: dataLoading } = useData();
    const walletLoading = dataLoading.wallets;

    const wallets = React.useMemo(() => {
      return [...allWallets].sort((a, b) => {
        const aTime = a.created?.toDate ? a.created.toDate().getTime() : new Date(a.created || 0).getTime();
        const bTime = b.created?.toDate ? b.created.toDate().getTime() : new Date(b.created || 0).getTime();
        return bTime - aTime;
      });
    }, [allWallets]);

      const getTotals = () => {
       return wallets.reduce((totals: any, item: WalletType) => {
            totals.balance = totals.balance + Number (item.amount);
            totals.income = totals.income + Number (item.totalIncome);
            totals.expense = totals.expense + Number (item.totalExpense);
            return totals;
        }, {balance: 0, income: 0, expense: 0});
      }
  return (
    <ImageBackground
        source={require('../assets/images/card.png')}
        resizeMode= 'stretch'
        style={styles.bgImage}
    >
        <View style={styles.container}>
            <View>
                {/* total balance */}
                <View style={styles.totalBalanceRow}>
                    <Typo size={17} color={colors.neutral800} fontWeight={"500"}>
                        Total Balance
                    </Typo>
                </View>
                <Typo size={30} fontWeight={"bold"} color={colors.black}>
                    {user?.currency || "$"}{walletLoading? "----": getTotals()?.balance?.toFixed(2)}
                </Typo>
            </View>

            {/* total expense and income */}
            <View style={styles.stats}>
                {/* income */}
                <View style={{gap: verticalScale(5)}}>
                    <View style={styles.incomeExpense}>
                        <View style={styles.statsIcon}>
                            <Icons.ArrowDownIcon
                                size={verticalScale(15)}
                                color={colors.black}
                                weight="bold"
                            />
                        </View>
                        <Typo size={16} fontWeight={"500"} color={colors.neutral700}>
                            Income
                        </Typo>
                    </View>
                    <View style={{alignSelf: "center"}}>
                        <Typo size={17} fontWeight={"500"} color={colors.green}>
                            {user?.currency || "$"}{walletLoading? "----" : getTotals()?.income?.toFixed(2)}
                        </Typo>
                    </View>
                </View>

                {/* expense */}
                <View style={{gap: verticalScale(5)}}>
                    <View style={styles.incomeExpense}>
                        <View style={styles.statsIcon}>
                            <Icons.ArrowDownIcon
                                size={verticalScale(15)}
                                color={colors.black}
                                weight="bold"
                            />
                        </View>
                        <Typo size={16} fontWeight={"500"} color={colors.neutral700}>
                            Expense
                        </Typo>
                    </View>
                    <View style={{alignSelf: "center"}}>
                        <Typo size={17} fontWeight={"500"} color={colors.rose}>
                            {user?.currency || "$"}{walletLoading? "----" : getTotals()?.expense?.toFixed(2)}
                        </Typo>
                    </View>
                </View>
            </View>
        </View>
    </ImageBackground>
  )
}

export default HomeCard

const styles = StyleSheet.create({
    bgImage: {
        height: scale(210),
        width: '100%',
    },
    container: {
        padding: spacingX._20,
        paddingHorizontal: scale(23),
        height: "87%",
        width: '100%',
        justifyContent: 'space-between',
    },

    totalBalanceRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacingX._5,
    },

    stats: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },

    statsIcon: {
        backgroundColor: colors.neutral350,
        padding: spacingX._5,
        borderRadius: 50,
    },

    incomeExpense: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacingY._7,
    },
});