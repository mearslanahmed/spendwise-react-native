import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { colors, radius, spacingX, spacingY } from '@/constants/theme';
import { useTheme } from '@/contexts/themeContext';
import Typo from './Typo';
import { scale, verticalScale } from '@/utils/styling';
import { SubscriptionType } from '@/types';
import * as Icons from "phosphor-react-native";
import { expenseCategories } from '@/constants/data';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/authContext';
import { resolveDate } from '@/utils/dateHelper';

type UpcomingBillsProps = {
  subscriptions: SubscriptionType[];
};

const UpcomingBills = ({ subscriptions }: UpcomingBillsProps) => {
  const { colors: themeColors, isDark } = useTheme();
  const router = useRouter();
  const { user } = useAuth();

  const now = new Date();
  
  // Sort subscriptions by closest billing date
  const sortedSubs = [...subscriptions].sort((a, b) => {
    const aDate = resolveDate(a.nextBillingDate);
    const bDate = resolveDate(b.nextBillingDate);
    return aDate.getTime() - bDate.getTime();
  });

  const getDaysUntil = (dateStr: string | any) => {
    const target = resolveDate(dateStr);
    const diffTime = target.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return "Overdue";
    if (diffDays === 0) return "Due Today";
    if (diffDays === 1) return "Tomorrow";
    return `In ${diffDays} days`;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Typo size={16} fontWeight="600">Upcoming Bills</Typo>
        <TouchableOpacity onPress={() => router.push("/(modals)/subscriptionsListModal" as any)}>
          <Typo size={14} color={colors.primary} fontWeight="600">See All</Typo>
        </TouchableOpacity>
      </View>

      {(!subscriptions || subscriptions.length === 0) ? (
        <TouchableOpacity 
          style={[styles.emptyState, { backgroundColor: themeColors.inputBg, borderColor: themeColors.border }]}
          onPress={() => router.push("/(modals)/manageSubscriptionModal" as any)}
        >
          <Icons.PlusCircle size={verticalScale(24)} color={themeColors.textLighter} weight="duotone" />
          <Typo size={14} color={themeColors.textLighter} style={{ marginTop: spacingY._5 }}>
            Add your first subscription
          </Typo>
        </TouchableOpacity>
      ) : (
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {sortedSubs.map((sub) => {
            const cat = expenseCategories[sub.category];
            const IconComponent = cat?.icon || Icons.Receipt;

            return (
              <TouchableOpacity 
                key={sub.id} 
                style={[
                  styles.billCard, 
                  { 
                    backgroundColor: themeColors.card, 
                    borderColor: isDark ? themeColors.border : "rgba(0,0,0,0.03)",
                    shadowColor: isDark ? "transparent" : "#000",
                  }
                ]}
                onPress={() => router.push("/(modals)/subscriptionsListModal" as any)}
              >
                <View style={[styles.iconContainer, { backgroundColor: cat?.bgColor || colors.neutral500 }]}>
                  <IconComponent size={verticalScale(18)} weight="fill" color={colors.white} />
                </View>
                
                <View style={styles.cardBody}>
                  <Typo size={14} fontWeight="700" textProps={{ numberOfLines: 1 }} color={themeColors.text}>{sub.name}</Typo>
                  <Typo size={12} color={themeColors.textLighter} fontWeight="500" style={{ marginTop: 2 }}>
                    {getDaysUntil(sub.nextBillingDate)}
                  </Typo>
                </View>

                <Typo size={15} fontWeight="800" color={themeColors.text}>{user?.currency || "$"}{sub.amount.toFixed(0)}</Typo>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
};

export default UpcomingBills;

const styles = StyleSheet.create({
  container: {
    marginBottom: spacingY._5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacingX._20,
    marginBottom: spacingY._10,
  },
  scrollContent: {
    paddingHorizontal: spacingX._20,
    gap: spacingX._12,
  },
  billCard: {
    width: scale(160),
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacingX._7,
    paddingRight: spacingX._12,
    borderRadius: radius._20,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 1,
  },
  iconContainer: {
    width: verticalScale(38),
    height: verticalScale(38),
    borderRadius: radius._12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardBody: {
    flex: 1,
    paddingHorizontal: spacingX._10,
  },
  emptyState: {
    marginHorizontal: spacingX._20,
    padding: spacingX._20,
    borderRadius: radius._17,
    borderWidth: 1,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  }
});
