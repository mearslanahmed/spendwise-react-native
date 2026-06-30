import { View, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native'
import React, { useState } from 'react'
import ModalWrapper from '@/components/ModalWrapper'
import Header from '@/components/Header'
import BackButton from '@/components/BackButton'
import Typo from '@/components/Typo'
import { colors, radius, spacingX, spacingY } from '@/constants/theme'
import { useData } from '@/contexts/dataContext'
import Button from '@/components/Button'
import { useTheme } from '@/contexts/themeContext'
import * as Icons from 'phosphor-react-native'
import { verticalScale } from '@/utils/styling'
import { expenseCategories } from '@/constants/data'
import { useRouter } from 'expo-router'
import { deleteSubscription } from '@/services/subscriptionService'
import { useAuth } from '@/contexts/authContext'
import { resolveDate } from '@/utils/dateHelper'
import CustomAlert from '@/components/CustomAlert'

const SubscriptionsListModal = () => {
  const { subscriptions } = useData();
  const { colors: themeColors } = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  
  const [deleteAlertVisible, setDeleteAlertVisible] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState<{id: string, name: string} | null>(null);

  const handleDelete = (id: string, name: string) => {
    setSelectedSubscription({ id, name });
    setDeleteAlertVisible(true);
  };

  const confirmDelete = async () => {
    if (!selectedSubscription) return;
    setDeleteAlertVisible(false);
    const res = await deleteSubscription(selectedSubscription.id);
    if (!res.success) {
      Alert.alert("Error", res.msg);
    }
  };

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
          title="My Subscriptions" 
          leftIcon={<BackButton />}
          style={{ marginBottom: spacingY._20, marginTop: spacingY._10 }}
        />
        
        <ScrollView contentContainerStyle={styles.listContainer} showsVerticalScrollIndicator={false}>
          {subscriptions.length === 0 ? (
            <View style={styles.emptyState}>
              <Icons.Receipt size={verticalScale(50)} color={themeColors.textLighter} weight="duotone" />
              <Typo size={16} color={themeColors.textLight} style={{ marginTop: 10, textAlign: 'center' }}>
                You have no active subscriptions. Add one to track your recurring bills automatically!
              </Typo>
            </View>
          ) : (
            subscriptions.map(sub => {
              const cat = expenseCategories[sub.category];
              const IconComponent = cat?.icon || Icons.Receipt;

              return (
                <View 
                  key={sub.id} 
                  style={[styles.card, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}
                >
                  <View style={styles.cardHeader}>
                    <View style={styles.cardLeft}>
                      <View style={[styles.iconContainer, { backgroundColor: cat?.bgColor || colors.neutral500 }]}>
                        <IconComponent size={verticalScale(20)} weight="fill" color={colors.white} />
                      </View>
                      <View>
                        <Typo size={16} fontWeight="600">{sub.name}</Typo>
                        <Typo size={12} color={themeColors.textLighter} style={{ marginTop: 2 }}>
                          {sub.frequency.charAt(0).toUpperCase() + sub.frequency.slice(1)} • {getDaysUntil(sub.nextBillingDate)}
                        </Typo>
                      </View>
                    </View>
                    <Typo size={16} fontWeight="700">{user?.currency || "$"}{sub.amount.toFixed(2)}</Typo>
                  </View>

                  <View style={styles.cardFooter}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                      <Icons.ArrowsClockwise size={verticalScale(14)} color={sub.autoDeduct ? colors.green : themeColors.textLighter} weight={sub.autoDeduct ? "bold" : "regular"} />
                      <Typo size={12} color={sub.autoDeduct ? colors.green : themeColors.textLighter} fontWeight="500">
                        {sub.autoDeduct ? "Auto-Deduct ON" : "Auto-Deduct OFF"}
                      </Typo>
                    </View>
                    <View style={styles.actions}>
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
                            nextBillingDate: resolveDate(sub.nextBillingDate).toISOString()
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
    padding: spacingX._15,
    borderRadius: radius._17,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacingY._15,
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacingX._10,
  },
  iconContainer: {
    width: verticalScale(40),
    height: verticalScale(40),
    borderRadius: radius._12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacingY._10,
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
})
