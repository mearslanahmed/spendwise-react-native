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
    const aDate = (a.nextBillingDate as any)?.toDate ? (a.nextBillingDate as any).toDate() : new Date(a.nextBillingDate as string);
    const bDate = (b.nextBillingDate as any)?.toDate ? (b.nextBillingDate as any).toDate() : new Date(b.nextBillingDate as string);
    return aDate.getTime() - bDate.getTime();
  });

  const getDaysUntil = (dateStr: string | any) => {
    const target = dateStr?.toDate ? dateStr.toDate() : new Date(dateStr);
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
                  { backgroundColor: themeColors.card, borderColor: themeColors.border }
                ]}
                onPress={() => router.push("/(modals)/subscriptionsListModal" as any)}
              >
                <View style={styles.cardHeader}>
                  <View style={[styles.iconContainer, { backgroundColor: cat?.bgColor || colors.neutral500 }]}>
                    <IconComponent size={verticalScale(16)} weight="fill" color={colors.white} />
                  </View>
                  <Typo size={14} fontWeight="700">{user?.currency || "$"}{sub.amount.toFixed(0)}</Typo>
                </View>
                
                <View style={styles.cardBody}>
                  <Typo size={14} fontWeight="600" textProps={{ numberOfLines: 1 }}>{sub.name}</Typo>
                  <Typo size={12} color={themeColors.textLighter} style={{ marginTop: 2 }}>
                    {getDaysUntil(sub.nextBillingDate)}
                  </Typo>
                </View>
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
    marginBottom: spacingY._15,
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
    width: scale(130),
    padding: spacingX._12,
    borderRadius: radius._17,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacingY._10,
  },
  iconContainer: {
    width: verticalScale(30),
    height: verticalScale(30),
    borderRadius: radius._10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardBody: {
    marginTop: spacingY._5,
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
