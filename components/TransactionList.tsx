import { StyleSheet, Text, View } from 'react-native'
import React from 'react'
import { TransactionListType } from '@/types'
import { verticalScale } from '@/utils/styling'
import { colors, radius, spacingX, spacingY } from '@/constants/theme'

const TransactionList = ({
    data,
    title,
    loading,
    emptyListMessage,
}: TransactionListType) => {
  return (
    <View>
      <Text>TransactionList</Text>
    </View>
  )
}

export default TransactionList

const styles = StyleSheet.create({
    container: {
        gap: spacingY._17,
        // flex: 1,
        // backgroundColor: colors.red,
    },
    list:{
        minHeight: 3,
    },

    row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: spacingX._12,
        marginBottom: spacingY._12,

        // list with background
        backgroundColor: colors.neutral800,
        padding: spacingY._10,
        paddingHorizontal: spacingY._10,
        borderRadius: radius._17,
    },

    icon: {
        height: verticalScale(44),
        aspectRatio: 1,
        justifyContent: "center",
        alignItems: "center",
        borderRadius: radius._12,
        borderCurve: "continuous" ,
    },

    categoryDes: {
        flex: 1,
        gap: 2.5
    },

    amountDate: {
        alignItems: 'flex-end',
        gap: 3,
    }
})