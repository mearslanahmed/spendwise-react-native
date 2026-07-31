import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { colors, radius, spacingX, spacingY } from '@/constants/theme';
import { useTheme } from '@/contexts/themeContext';
import Typo from './Typo';
import { scale, verticalScale } from '@/utils/styling';
import { SubscriptionType } from '@/types';
import * as Icons from "phosphor-react-native";
import { expenseCategories, billIcons } from '@/constants/data';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/authContext';
import { resolveDate } from '@/utils/dateHelper';
import { paySubscriptionManually } from '@/services/subscriptionService';
import Toast from 'react-native-toast-message';
import CustomAlert from './CustomAlert';
import Input from './Input';

type UpcomingBillsProps = {
  subscriptions: SubscriptionType[];
};

const UpcomingBills = ({ subscriptions }: UpcomingBillsProps) => {
  const { colors: themeColors, isDark } = useTheme();
  const router = useRouter();
  const { user } = useAuth();

  const now = new Date();
  
  const [alertVisible, setAlertVisible] = useState(false);
  const [selectedSubForPay, setSelectedSubForPay] = useState<{ id: string, name: string, amount: number } | null>(null);
  const [payAmountInput, setPayAmountInput] = useState("");
  const [paying, setPaying] = useState(false);

  const handleConfirmPay = (id: string, name: string, amount: number) => {
    setSelectedSubForPay({ id, name, amount });
    setPayAmountInput(amount.toString());
    setAlertVisible(true);
  };

  const executePayment = async () => {
    if (!selectedSubForPay) return;
    
    const parsedAmount = parseFloat(payAmountInput);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      Toast.show({
        type: 'error',
        text1: 'Invalid Amount',
        text2: 'Please enter a valid bill amount.'
      });
      return;
    }
    
    setPaying(true);
    const res = await paySubscriptionManually(selectedSubForPay.id, parsedAmount);
    setPaying(false);
    setAlertVisible(false);
    if (res.success) {
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: res.msg
      });
    } else {
      Toast.show({
        type: 'error',
        text1: 'Payment Failed',
        text2: res.msg || 'Insufficient funds in the wallet.'
      });
    }
  };
  
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
            const customIcon = sub.subIcon ? billIcons[sub.subIcon] : null;
            const cat = expenseCategories[sub.category];
            const IconComponent = customIcon?.icon || cat?.icon || Icons.Receipt;
            const iconBg = customIcon?.bgColor || cat?.bgColor || colors.neutral500;
            
            const daysUntilStr = getDaysUntil(sub.nextBillingDate);
            const isOverdue = daysUntilStr === "Overdue";

            return (
              <TouchableOpacity 
                key={sub.id} 
                style={[
                  styles.billCard, 
                  { 
                    backgroundColor: themeColors.card, 
                    borderColor: isOverdue ? "rgba(239, 68, 68, 0.4)" : (isDark ? themeColors.border : "rgba(0,0,0,0.03)"),
                    shadowColor: isDark ? "transparent" : "#000",
                    borderWidth: isOverdue ? 1.5 : 1,
                  }
                ]}
                onPress={() => router.push("/(modals)/subscriptionsListModal" as any)}
              >
                <View style={[styles.iconContainer, { backgroundColor: iconBg }]}>
                  <IconComponent size={verticalScale(18)} weight="fill" color={colors.white} />
                </View>
                
                <View style={styles.cardBody}>
                  <Typo size={14} fontWeight="700" textProps={{ numberOfLines: 1 }} color={themeColors.text}>{sub.name}</Typo>
                  <Typo size={12} color={isOverdue ? colors.rose : themeColors.textLighter} fontWeight={isOverdue ? "600" : "500"} style={{ marginTop: 2 }}>
                    {daysUntilStr}
                  </Typo>
                </View>

                <View style={{ alignItems: 'flex-end', justifyContent: 'center' }}>
                  <Typo size={15} fontWeight="800" color={themeColors.text}>{user?.currency || "$"}{sub.amount.toFixed(0)}</Typo>
                  {!sub.autoDeduct && (
                    <TouchableOpacity 
                      style={styles.checkPayBtn}
                      onPress={() => handleConfirmPay(sub.id!, sub.name, sub.amount)}
                    >
                      <Icons.CheckCircle size={verticalScale(18)} color={colors.green} weight="fill" />
                    </TouchableOpacity>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
      <CustomAlert
        visible={alertVisible}
        title="Pay Bill"
        message={`Confirm details to pay ${selectedSubForPay?.name} now:`}
        onCancel={() => setAlertVisible(false)}
        onConfirm={executePayment}
        confirmText="Confirm"
        loading={paying}
      >
        <View style={{ marginBottom: spacingY._15, gap: spacingY._5 }}>
          <Typo size={13} color={themeColors.textLighter} fontWeight="600">BILL AMOUNT ({user?.currency || "$"})</Typo>
          <Input
            keyboardType="decimal-pad"
            value={payAmountInput}
            onChangeText={(val) => setPayAmountInput(val.replace(/[^0-9.]/g, '').replace(/(\..*?)\..*/g, '$1'))}
            placeholder="0.00"
            containerStyle={{ height: verticalScale(45) }}
          />
        </View>
      </CustomAlert>
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
  },
  checkPayBtn: {
    marginTop: scale(3),
    padding: scale(2),
  }
});
