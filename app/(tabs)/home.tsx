import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import React from 'react'
import Button from '@/components/Button'
import Typo from '@/components/Typo'
import { colors, radius, spacingX, spacingY } from '@/constants/theme'
import { useAuth } from '@/contexts/authContext'
import ScreenWrapper from '@/components/ScreenWrapper'
import { verticalScale } from '@/utils/styling'
import * as Icons from 'phosphor-react-native'
import HomeCard from '@/components/HomeCard'
import TransactionList from '@/components/TransactionList'
import useFetchData from '@/hooks/useFetchData'
import { TransactionType } from '@/types'
import { limit, orderBy, where } from 'firebase/firestore'
import { useRouter } from 'expo-router'


const Home = () => {
    const {user} = useAuth();
    const router = useRouter();

    const constraints = [
      where("uid", "==", user?.uid),
      orderBy("date", "desc"),
      limit(30),
    ];

    const {
                data: recentTransactions,
                error,
                loading: transactionLoading,
            } = useFetchData<TransactionType>("transactions", constraints);
    
    // console.log("Recent transactions:", recentTransactions?.length, recentTransactions);
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
        <TouchableOpacity style={styles.searchIcon} onPress={() => router.push("/(modals)/searchModal")}>
          <Icons.MagnifyingGlassIcon
            size={verticalScale(22)}
            color={colors.neutral200}
            weight="bold"
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollViewStyle}
        showsVerticalScrollIndicator={false}
      >
        {/* card */}
        <View>
          <HomeCard/>
        </View>

        <TransactionList 
          data={recentTransactions}
          loading={transactionLoading}
          emptyListMessage="No Transaction added yet!"
          title="Recent Transactions" 
        />

      </ScrollView>

      <Button style={styles.floatingButton} onPress={()=> router.push("/(modals)/transactionModal")}>
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
    bottom: verticalScale(30),
    right: verticalScale(30),
  },

  // ScrollView Layout
  scrollViewStyle: {
    marginTop: spacingY._10,
    paddingBottom: verticalScale(100),
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
});