import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native'
import React, { useEffect, useState } from 'react'
import ScreenWrapper from '@/components/ScreenWrapper'
import { colors, radius, spacingX, spacingY } from '@/constants/theme'
import { scale, verticalScale } from '@/utils/styling'
import Header from '@/components/Header'
import SegmentedControlTab from "react-native-segmented-control-tab";
import { BarChart } from "react-native-gifted-charts";
import Loading from '@/components/Loading'
import { fetchMonthlyStats, fetchWeeklyStats } from '@/services/transactionService'
import { useAuth } from '@/contexts/authContext'
import TransactionList from '@/components/TransactionList'


const Statistics = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const {user} = useAuth();
  const [chartData, setChartData] = useState([]);
  const [chartLoading, setChartLoading] = useState(false);
  const [transactions, setTransactions] = useState([]);

  useEffect(()=>{
    if(activeIndex==0){
      getWeeklyStats();
    }
    if(activeIndex==1){
      getMonthlyStats();
    }
    if(activeIndex==2){
      getYearlyStats();
    }
  },[activeIndex]);

  const getWeeklyStats = async ()=>{
    setChartLoading(true);
    let res = await fetchWeeklyStats(user?.uid as string);
    setChartLoading(false);
    if(res.success){
      setChartData(res?.data?.stats);
      setTransactions(res?.data?.transactions);
    }else{
      Alert.alert("Error", res.msg);
    }
  }
  const getMonthlyStats = async ()=> {
    setChartLoading(true);
    let res = await fetchMonthlyStats(user?.uid as string);
    setChartLoading(false);
    if(res.success){
      setChartData(res?.data?.stats);
      setTransactions(res?.data?.transactions);
    }else{
      Alert.alert("Error", res.msg);
    }
  }
  const getYearlyStats = async ()=> {
    // getYearly stats
  }
  return (
    <ScreenWrapper>
      <View style={styles.container}>
        <View style={styles.header}>
          <Header title="Statistics" />
        </View>

        <ScrollView
          contentContainerStyle={{
            gap: spacingY._20,
            paddingTop: spacingY._5,
            paddingBottom: verticalScale(100),
          }}
          showsVerticalScrollIndicator={false}
          >
            <SegmentedControlTab
          values={["Weekly", "Monthly", "Yearly"]}
          selectedIndex={activeIndex}
          onTabPress={setActiveIndex}
          // styling
          tabsContainerStyle={styles.segmentStyle}
          tabStyle={{ backgroundColor: colors.neutral800, borderColor: colors.neutral700 }}
          activeTabStyle={{ backgroundColor: colors.neutral200 }}
          tabTextStyle={{...styles.segmentFontStyle, color: colors.white}}
          activeTabTextStyle={{...styles.segmentFontStyle, color: colors.black}}
        />

        <View style={styles.chartContainer}>
          {
            chartData.length > 0? (
              <BarChart
                data={chartData}
                barWidth={scale(12)}
                spacing={[1,2].includes(activeIndex) ? scale(25) : scale(16)}
                roundedTop
                roundedBottom
                hideRules
                yAxisLabelPrefix="5"
                yAxisThickness={0}
                xAxisThickness={0}
                yAxisLabelWidth={[1,2].includes(activeIndex) ? scale(38) : scale(35)}
                yAxisTextStyle={{ color: colors.neutral350}}
                xAxisLabelTextStyle={{
                  color: colors.neutral350,
                  fontSize: verticalScale(12),
                }}
                noOfSections={3}
                minHeight={5}
                isAnimated={true}
                // maxValue={100}
                />
            ):(
              <View style={styles.noChart}/>
            )
          }
          {
            chartLoading && (
              <View style={styles.chartLoadingContainer}>
                <Loading color={colors.white}/>
              </View>
            )
          }
        </View>

        {/* transaction */}
        <View>
          <TransactionList 
            loading={chartLoading}
            title='Transactions'
            emptyListMessage='No transaction found'
            data={transactions}
          />
        </View>
          </ScrollView>
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
  },
})