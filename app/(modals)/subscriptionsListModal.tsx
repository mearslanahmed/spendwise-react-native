import { View, StyleSheet, ScrollView, TouchableOpacity, Alert, Switch, Platform } from 'react-native'
import React, { useState } from 'react'
import ModalWrapper from '@/components/ModalWrapper'
import Header from '@/components/Header'
import BackButton from '@/components/BackButton'
import Typo from '@/components/Typo'
import { colors, radius, spacingX, spacingY } from '@/constants/theme'
import { useData } from '@/contexts/dataContext'
import Button from '@/components/Button'
import Input from '@/components/Input'
import { useTheme } from '@/contexts/themeContext'
import * as Icons from 'phosphor-react-native'
import { scale, verticalScale } from '@/utils/styling'
import { expenseCategories } from '@/constants/data'
import { useRouter } from 'expo-router'
import { deleteSubscription, paySubscriptionManually, updateSubscription } from '@/services/subscriptionService'
import { useAuth } from '@/contexts/authContext'
import { resolveDate } from '@/utils/dateHelper'
import CustomAlert from '@/components/CustomAlert'
import { billIcons } from '@/constants/data'
import Toast from 'react-native-toast-message'
import SegmentedPill from '@/components/SegmentedPill'

const SubscriptionsListModal = () => {
  const { subscriptions } = useData();
  const { colors: themeColors } = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  
  const [deleteAlertVisible, setDeleteAlertVisible] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState<{id: string, name: string} | null>(null);

  const [payAlertVisible, setPayAlertVisible] = useState(false);
  const [selectedPaySub, setSelectedPaySub] = useState<{ id: string, name: string, amount: number } | null>(null);
  const [payAmountInput, setPayAmountInput] = useState("");
  const [payLoading, setPayLoading] = useState(false);
  
  const filterTabs = ["All", "Auto-Pay", "Manual"];
  const [filterIndex, setFilterIndex] = useState(0);

  const handleDelete = (id: string, name: string) => {
    setSelectedSubscription({ id, name });
    setDeleteAlertVisible(true);
  };

  const confirmDelete = async () => {
    if (!selectedSubscription) return;
    setDeleteAlertVisible(false);
    const res = await deleteSubscription(selectedSubscription.id);
    if (!res.success) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: res.msg || 'Failed to delete subscription.'
      });
    }
  };

  const handlePayNow = (id: string, name: string, amount: number) => {
    setSelectedPaySub({ id, name, amount });
    setPayAmountInput(amount.toString());
    setPayAlertVisible(true);
  };

  const confirmPayment = async () => {
    if (!selectedPaySub) return;
    
    const parsedAmount = parseFloat(payAmountInput);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      Toast.show({
        type: 'error',
        text1: 'Invalid Amount',
        text2: 'Please enter a valid bill amount.'
      });
      return;
    }
    
    setPayLoading(true);
    const res = await paySubscriptionManually(selectedPaySub.id, parsedAmount);
    setPayLoading(false);
    setPayAlertVisible(false);
    if (res.success) {
      Toast.show({
        type: 'success',
        text1: 'Subscription Paid',
        text2: res.msg,
      });
    } else {
      Toast.show({
        type: 'error',
        text1: 'Payment Failed',
        text2: res.msg || 'Insufficient funds in the wallet.'
      });
    }
  };

  const monthlyTotal = React.useMemo(() => {
    return subscriptions.reduce((total, sub) => {
      let monthlyAmt = sub.amount;
      if (sub.frequency === "weekly") {
        monthlyAmt = sub.amount * 4.33;
      } else if (sub.frequency === "yearly") {
        monthlyAmt = sub.amount / 12;
      }
      return total + monthlyAmt;
    }, 0);
  }, [subscriptions]);

  const autoDeductCount = subscriptions.filter(s => s.autoDeduct).length;
  const manualCount = subscriptions.length - autoDeductCount;

  const getDaysUntil = (dateStr: string | any) => {
    const target = resolveDate(dateStr);
    const now = new Date();
    const diffTime = target.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return "Overdue";
    if (diffDays === 0) return "Due Today";
    if (diffDays === 1) return "Tomorrow";
    return `In ${diffDays} days`;
  };

  return (
    <ModalWrapper>
      <View style={styles.container}>
        <Header 
          title="Bills & Subscriptions" 
          leftIcon={<BackButton />}
          style={{ marginBottom: spacingY._20, marginTop: spacingY._10 }}
        />
        
        <ScrollView contentContainerStyle={styles.listContainer} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {subscriptions.length > 0 && (
            <View style={[styles.statsCard, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
              <View style={styles.statsLeft}>
                <Typo size={12} color={themeColors.textLighter} fontWeight="600">TOTAL MONTHLY BILLS</Typo>
                <Typo size={28} fontWeight="800" style={{ marginTop: 4 }}>
                  {user?.currency || "$"}{monthlyTotal.toFixed(2)}
                </Typo>
              </View>
              <View style={styles.statsDivider} />
              <View style={styles.statsRight}>
                <View style={styles.statsRow}>
                  <Icons.ArrowsClockwise size={verticalScale(14)} color={colors.green} weight="bold" />
                  <Typo size={12} color={themeColors.textLight} fontWeight="600">
                    {autoDeductCount} Auto-Pay
                  </Typo>
                </View>
                <View style={[styles.statsRow, { marginTop: 6 }]}>
                  <Icons.Receipt size={verticalScale(14)} color={themeColors.textLighter} weight="bold" />
                  <Typo size={12} color={themeColors.textLight} fontWeight="600">
                    {manualCount} Manual
                  </Typo>
                </View>
              </View>
            </View>
          )}

          {/* Segmented Filter */}
          {subscriptions.length > 0 && (
            <SegmentedPill 
              tabs={filterTabs}
              activeIndex={filterIndex}
              onChange={setFilterIndex}
              style={{ marginBottom: spacingY._12 }}
            />
          )}

          {subscriptions.length === 0 ? (
            <View style={styles.emptyState}>
              <Icons.Receipt size={verticalScale(50)} color={themeColors.textLighter} weight="duotone" />
              <Typo size={16} color={themeColors.textLight} style={{ marginTop: 10, textAlign: 'center' }}>
                You have no active subscriptions. Add one to track your recurring bills automatically!
              </Typo>
            </View>
          ) : (
            subscriptions
              .filter(sub => {
                if (filterIndex === 1) return sub.autoDeduct;
                if (filterIndex === 2) return !sub.autoDeduct;
                return true;
              })
              .map(sub => {
                const customIcon = sub.subIcon ? billIcons[sub.subIcon] : null;
                const cat = expenseCategories[sub.category];
                const IconComponent = customIcon?.icon || cat?.icon || Icons.Receipt;
                const iconBgColor = customIcon?.bgColor || cat?.bgColor || colors.neutral500;
                
                const daysUntilStr = getDaysUntil(sub.nextBillingDate);
                const isOverdue = daysUntilStr === "Overdue";

                return (
                  <View 
                    key={sub.id} 
                    style={[
                      styles.card, 
                      { 
                        backgroundColor: themeColors.card, 
                        borderColor: isOverdue ? "rgba(239, 68, 68, 0.4)" : themeColors.border,
                        borderWidth: isOverdue ? 1.5 : 1
                      }
                    ]}
                  >
                    <View style={styles.cardHeader}>
                      <View style={styles.cardLeft}>
                        <View style={[styles.iconContainer, { backgroundColor: iconBgColor }]}>
                          <IconComponent size={verticalScale(20)} weight="fill" color={colors.white} />
                        </View>
                        <View>
                          <Typo size={16} fontWeight="600">{sub.name}</Typo>
                          <Typo size={12} color={isOverdue ? colors.rose : themeColors.textLighter} fontWeight={isOverdue ? "600" : "400"} style={{ marginTop: 2 }}>
                            {sub.frequency.charAt(0).toUpperCase() + sub.frequency.slice(1)} • {daysUntilStr}
                          </Typo>
                        </View>
                      </View>
                      <Typo size={16} fontWeight="700">{user?.currency || "$"}{sub.amount.toFixed(2)}</Typo>
                    </View>

                    <View style={styles.cardFooter}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Switch
                          value={sub.autoDeduct}
                          onValueChange={async (val) => {
                            const res = await updateSubscription(sub.id!, { autoDeduct: val });
                            if (!res.success) {
                              Toast.show({
                                type: 'error',
                                text1: 'Error',
                                text2: res.msg || 'Failed to update auto-deduct state.'
                              });
                            } else {
                              Toast.show({
                                type: 'success',
                                text1: 'Auto-Pay Updated',
                                text2: `${sub.name} is now ${val ? "Auto-Pay" : "Manual Pay"}.`
                              });
                            }
                          }}
                          trackColor={{ false: themeColors.border, true: colors.green }}
                          thumbColor={Platform.OS === 'ios' ? undefined : colors.white}
                          style={{ transform: [{ scaleX: 0.85 }, { scaleY: 0.85 }] }}
                        />
                        <Typo size={12} color={sub.autoDeduct ? colors.green : themeColors.textLighter} fontWeight="600">
                          {sub.autoDeduct ? "Auto-Pay" : "Manual"}
                        </Typo>
                      </View>
                      <View style={styles.actions}>
                        {!sub.autoDeduct && (
                          <TouchableOpacity 
                            style={[styles.payBtn, { backgroundColor: "rgba(22, 163, 74, 0.15)" }]}
                            onPress={() => handlePayNow(sub.id!, sub.name, sub.amount)}
                          >
                            <Typo size={12} color={colors.green} fontWeight="700">Pay Now</Typo>
                          </TouchableOpacity>
                        )}
                      <TouchableOpacity 
                        style={[styles.actionBtn, { backgroundColor: themeColors.inputBg }]}
                        onPress={() => router.push({
                          pathname: "/(modals)/manageSubscriptionModal",
                          params: {
                            id: sub.id,
                            name: sub.name,
                            amount: sub.amount.toString(),
                            category: sub.category,
                            walletId: sub.walletId,
                            frequency: sub.frequency,
                            autoDeduct: sub.autoDeduct ? "true" : "false",
                            nextBillingDate: resolveDate(sub.nextBillingDate).toISOString(),
                            subIcon: sub.subIcon || "others"
                          }
                        })}
                      >
                        <Icons.PencilSimple size={verticalScale(16)} color={themeColors.textLight} />
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={[styles.actionBtn, { backgroundColor: "rgba(239, 68, 68, 0.1)" }]}
                        onPress={() => handleDelete(sub.id!, sub.name)}
                      >
                        <Icons.Trash size={verticalScale(16)} color={colors.rose} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              )
            })
          )}
        </ScrollView>
      </View>

      <Button style={styles.floatingButton} onPress={()=> router.push("/(modals)/manageSubscriptionModal" as any)}>
        <Icons.Plus size={verticalScale(24)} color={colors.black} weight="bold" />
      </Button>
      
      <CustomAlert
        visible={deleteAlertVisible}
        title="Cancel Subscription"
        message={`Are you sure you want to cancel tracking for ${selectedSubscription?.name}?`}
        onCancel={() => setDeleteAlertVisible(false)}
        onConfirm={confirmDelete}
        confirmText="Yes, Cancel"
      />

      <CustomAlert
        visible={payAlertVisible}
        title="Pay Bill"
        message={`Confirm details to pay ${selectedPaySub?.name} now:`}
        onCancel={() => setPayAlertVisible(false)}
        onConfirm={confirmPayment}
        confirmText="Confirm"
        loading={payLoading}
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
    </ModalWrapper>
  )
}

export default SubscriptionsListModal

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacingX._20,
  },
  listContainer: {
    paddingVertical: spacingY._15,
    gap: spacingY._15,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacingX._20,
    marginTop: verticalScale(50),
  },
  card: {
    padding: spacingX._12,
    borderRadius: radius._15,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacingY._10,
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacingX._10,
  },
  iconContainer: {
    width: verticalScale(36),
    height: verticalScale(36),
    borderRadius: radius._10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacingY._7,
    borderTopWidth: 1,
    borderTopColor: "rgba(150, 150, 150, 0.1)",
  },
  actions: {
    flexDirection: 'row',
    gap: spacingX._7,
  },
  actionBtn: {
    width: verticalScale(30),
    height: verticalScale(30),
    borderRadius: radius._10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  floatingButton: {
    height: verticalScale(50),
    width: verticalScale(50),
    borderRadius: 100,
    position: "absolute",
    bottom: verticalScale(30),
    right: verticalScale(20),
  },
  statsCard: {
    padding: spacingX._15,
    borderRadius: radius._20,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacingY._5,
  },
  statsLeft: {
    flex: 1.2,
  },
  statsDivider: {
    width: 1,
    height: '80%',
    backgroundColor: 'rgba(150, 150, 150, 0.2)',
    marginHorizontal: spacingX._15,
  },
  statsRight: {
    flex: 0.8,
    justifyContent: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  payBtn: {
    paddingVertical: scale(5),
    paddingHorizontal: scale(10),
    borderRadius: radius._10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: scale(3),
  },
  filterContainer: {
    flexDirection: 'row',
    borderRadius: radius._12,
    padding: 4,
    marginBottom: spacingY._5,
  },
  filterTab: {
    flex: 1,
    paddingVertical: verticalScale(8),
    alignItems: 'center',
    borderRadius: radius._10,
  },
})
