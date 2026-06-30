import { StyleSheet, TouchableOpacity, View } from "react-native";
import React from "react";
import { TransactionItemsProps, TransactionListType, TransactionType } from "@/types";
import { verticalScale } from "@/utils/styling";
import { colors, radius, spacingX, spacingY } from "@/constants/theme";
import Typo from "./Typo";
import { FlashList } from "@shopify/flash-list";
import Loading from "./Loading";
import { expenseCategories, incomeCategory } from "@/constants/data";
import { resolveDate } from "@/utils/dateHelper";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useRouter } from "expo-router";
import { useAuth } from "@/contexts/authContext";
import { useTheme } from "@/contexts/themeContext";

const TransactionList = ({
  data,
  title,
  loading,
  emptyListMessage,
  ListHeaderComponent,
  titleRightComponent,
  onEndReached,
  horizontalPadding = 0,
}: TransactionListType) => {
    const router = useRouter();
  const handleClick = React.useCallback((item: TransactionType) => {
    router.push({
        pathname: '/(modals)/transactionModal',
        params: {
            id: item?.id,
            type: item?.type,
            amount: item?.amount?.toString(),
            category: item?.category,
            date: resolveDate(item.date).toISOString(),
            description: item?.description,
            image: item?.image,
            uid: item?.uid,
            walletId: item?.walletId,
        }
    })
  }, [router]);
  return (
    <View style={styles.container}>
      <View style={styles.list}>
        <FlashList
          data={data}
          ListHeaderComponent={
            <View>
              {ListHeaderComponent as any}
              {(title || titleRightComponent) && (
                <View style={{ 
                  flexDirection: 'row', 
                  alignItems: 'center', 
                  justifyContent: 'space-between', 
                  marginBottom: spacingY._15, 
                  paddingHorizontal: horizontalPadding 
                }}>
                  {title ? (
                    <Typo size={20} fontWeight={"500"}>
                      {title}
                    </Typo>
                  ) : <View />}
                  {titleRightComponent && (
                    <View style={{ flex: 1, alignItems: 'flex-end', marginLeft: 10 }}>
                      {titleRightComponent}
                    </View>
                  )}
                </View>
              )}
            </View>
          }
          {...( { estimatedItemSize: 70 } as any )}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: verticalScale(120) }}
          onEndReached={onEndReached}
          onEndReachedThreshold={0.5}
          ListEmptyComponent={
            !loading ? (
              <Typo
                size={15}
                color={colors.neutral400}
                style={{ textAlign: "center", marginTop: spacingY._15, paddingHorizontal: horizontalPadding }}
              >
                {emptyListMessage}
              </Typo>
            ) : null
          }
          renderItem={({ item, index }: any) => (
            <View style={{ paddingHorizontal: horizontalPadding }}>
              <TransactionItem
                item={item}
                index={index}
                handleClick={handleClick}
              />
            </View>
          )}
        />
      </View>

      {loading && (
        <View style={{ top: verticalScale(100) }}>
          <Loading />
        </View>
      )}
    </View>
  );
};

const TransactionItem = React.memo(({
  item,
  index,
  handleClick,
}: TransactionItemsProps) => {
  const { user } = useAuth();
  const { colors: themeColors } = useTheme();
  let category = 
    item?.type === "income" ? incomeCategory : (expenseCategories[item.category!] || expenseCategories['others']);
  const IconComponent = category?.icon;

  const date = resolveDate(item?.date)?.toLocaleDateString("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  return (
    <Animated.View
        entering={FadeInDown.delay(index * 70).springify().damping(14)}
    >
      <TouchableOpacity style={[styles.row, { backgroundColor: themeColors.card }]} onPress={() => handleClick(item)}>
        <View style={[styles.icon, { backgroundColor: category.bgColor }]}>
          {IconComponent && (
            <IconComponent
              size={verticalScale(25)}
              weight="fill"
              color={colors.white}
            />
          )}
        </View>
        <View style={styles.categoryDes}>
          <Typo size={17}>{category.label}</Typo>
          <Typo
            size={12}
            color={colors.neutral400}
            textProps={{ numberOfLines: 1 }}
          >
            {item.description}
          </Typo>
        </View>

        <View style={styles.amountDate}>
          <Typo fontWeight={"500"} color={item?.type === 'income' ? colors.primary : colors.rose}>
              {`${item?.type === "income" ? `+ ${user?.currency || "$"}` : `- ${user?.currency || "$"}`}${item?.amount}`}
            
          </Typo>
          <Typo size={13} color={colors.neutral400}>
            {date}
          </Typo>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
});

export default TransactionList;

const styles = StyleSheet.create({
  container: {
    gap: spacingY._17,
    flex: 1,
  },
  list: {
    flex: 1,
    minHeight: 3,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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
    borderCurve: "continuous",
  },

  categoryDes: {
    flex: 1,
    gap: 2.5,
  },

  amountDate: {
    alignItems: "flex-end",
    gap: 3,
  },
});
