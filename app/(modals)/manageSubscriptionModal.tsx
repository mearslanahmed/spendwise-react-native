import { View, StyleSheet, ScrollView, Switch, Platform, TouchableOpacity } from 'react-native'
import React, { useState, useRef } from 'react'
import Toast from 'react-native-toast-message'
import ModalWrapper from '@/components/ModalWrapper'
import Header from '@/components/Header'
import BackButton from '@/components/BackButton'
import Typo from '@/components/Typo'
import { colors, radius, spacingX, spacingY } from '@/constants/theme'
import { useAuth } from '@/contexts/authContext'
import { useTheme } from '@/contexts/themeContext'
import { useData } from '@/contexts/dataContext'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { createSubscription, updateSubscription } from '@/services/subscriptionService'
import Input from '@/components/Input'
import Button from '@/components/Button'
import { verticalScale } from '@/utils/styling'
import { expenseCategories } from '@/constants/data'
import DateTimePicker from '@react-native-community/datetimepicker'
import * as Icons from 'phosphor-react-native'
import SegmentedPill from '@/components/SegmentedPill'
import { Timestamp } from 'firebase/firestore'

const ManageSubscriptionModal = () => {
  const { user } = useAuth();
  const { wallets } = useData();
  const { colors: themeColors, isDark } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams();

  const isEditing = !!params.id;

  const [name, setName] = useState(params.name as string || "");
  const [amount, setAmount] = useState(params.amount as string || "");
  const [category, setCategory] = useState(params.category as string || "entertainment");
  const [walletId, setWalletId] = useState(params.walletId as string || (wallets.length > 0 ? wallets[0].id : ""));
  
  const freqOptions = ["weekly", "monthly", "yearly"];
  const [freqIndex, setFreqIndex] = useState(params.frequency ? freqOptions.indexOf(params.frequency as string) : 1);
  
  const [autoDeduct, setAutoDeduct] = useState(params.autoDeduct === "true");
  
  const [date, setDate] = useState(params.nextBillingDate ? new Date(params.nextBillingDate as string) : new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const amountRef = useRef<any>(null);

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowPicker(Platform.OS === 'ios');
    if (selectedDate) setDate(selectedDate);
  };

  const handleSave = async () => {
    if (loading) return;
    if (!user?.uid) {
      Toast.show({ type: "error", text1: "Error", text2: "You must be logged in to do this." });
      return;
    }

    const missing: string[] = [];
    if (!name) missing.push("name");
    if (!amount) missing.push("amount");
    if (!walletId) missing.push("wallet");

    if (missing.length > 0) {
      setMissingFields(missing);
      Toast.show({
        type: "error",
        text1: "Missing Fields",
        text2: "Please fill all the required fields.",
      });
      return;
    }
    
    setMissingFields([]);
    setLoading(true);
    
    const subData = {
      uid: user?.uid as string,
      name,
      amount: parseFloat(amount),
      category,
      walletId: walletId as string,
      frequency: freqOptions[freqIndex] as any,
      nextBillingDate: Timestamp.fromDate(date),
      autoDeduct,
    };

    let res;
    if (isEditing) {
      res = await updateSubscription(params.id as string, subData);
    } else {
      res = await createSubscription({ ...subData, createdAt: Timestamp.fromDate(new Date()) });
    }

    setLoading(false);

    if (res.success) {
      Toast.show({
        type: "success",
        text1: "Success",
        text2: isEditing ? "Subscription updated" : "Subscription added",
      });
      router.back();
    } else {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: res.msg,
      });
    }
  };

  return (
    <ModalWrapper>
      <View style={styles.container}>
        <Header 
          title={isEditing ? "Edit Subscription" : "Add Subscription"} 
          leftIcon={<BackButton />}
          style={{ marginBottom: spacingY._20, marginTop: spacingY._10 }} 
        />

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.inputContainer}>
            <Typo size={14} color={themeColors.textLight} fontWeight="500">Subscription Name</Typo>
            <Input 
              placeholder="e.g. Netflix, Gym"
              value={name}
              onChangeText={setName}
              returnKeyType="next"
              onSubmitEditing={() => amountRef.current?.focus()}
              containerStyle={missingFields.includes("name") ? { borderColor: colors.rose, borderWidth: 1.5 } : {}}
            />
          </View>
          
          <View style={styles.inputContainer}>
            <Typo size={14} color={themeColors.textLight} fontWeight="500">Amount</Typo>
            <Input 
              inputRef={amountRef}
              placeholder="0.00"
              value={amount}
              onChangeText={(val) => setAmount(val.replace(/[^0-9.]/g, '').replace(/(\..*?)\..*/g, '$1'))}
              keyboardType="decimal-pad"
              containerStyle={missingFields.includes("amount") ? { borderColor: colors.rose, borderWidth: 1.5 } : {}}
            />
          </View>

          <View style={styles.inputContainer}>
            <Typo size={14} color={themeColors.textLight} fontWeight="500">Frequency</Typo>
            <SegmentedPill 
              tabs={["Weekly", "Monthly", "Yearly"]}
              activeIndex={freqIndex}
              onChange={setFreqIndex}
              style={{ marginTop: 10 }}
            />
          </View>

          <View style={styles.inputContainer}>
            <Typo size={14} color={themeColors.textLight} fontWeight="500">Next Billing Date</Typo>
            <TouchableOpacity 
              style={[styles.datePickerBtn, { backgroundColor: isDark ? themeColors.inputBg : colors.neutral100, borderColor: themeColors.border }]}
              onPress={() => setShowPicker(true)}
            >
              <Typo size={15}>{date.toLocaleDateString()}</Typo>
              <Icons.Calendar size={verticalScale(18)} color={themeColors.textLight} />
            </TouchableOpacity>
            
            {showPicker && (
              <DateTimePicker
                value={date}
                mode="date"
                display="default"
                onChange={onDateChange}
              />
            )}
          </View>

          <View style={[styles.switchRow, { backgroundColor: isDark ? themeColors.inputBg : colors.neutral100, borderColor: themeColors.border }]}>
            <View style={{ flex: 1 }}>
              <Typo size={15} fontWeight="600">Auto-Deduct</Typo>
              <Typo size={12} color={themeColors.textLighter} style={{ marginTop: 2 }}>
                Automatically deduct from wallet on billing date
              </Typo>
            </View>
            <Switch
              value={autoDeduct}
              onValueChange={setAutoDeduct}
              trackColor={{ false: themeColors.border, true: colors.primary }}
              thumbColor={Platform.OS === 'ios' ? undefined : colors.white}
            />
          </View>

          {/* Wallet Selector (Simplified fallback if Dropdown unavailable) */}
          <View style={styles.inputContainer}>
            <Typo size={14} color={themeColors.textLight} fontWeight="500">Deduct From Wallet</Typo>
            {wallets.length === 0 ? (
              <TouchableOpacity 
                style={{
                  backgroundColor: themeColors.inputBg,
                  borderColor: missingFields.includes("wallet") ? colors.rose : themeColors.border,
                  borderWidth: missingFields.includes("wallet") ? 1.5 : 1,
                  borderRadius: radius._12,
                  padding: spacingY._15,
                  alignItems: 'center',
                  marginTop: 10,
                }}
                onPress={() => router.push("/(modals)/walletModal")}
              >
                <Typo size={15} color={colors.primary} fontWeight="600">
                  + Create a Wallet First
                </Typo>
              </TouchableOpacity>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, marginTop: 10 }}>
                {wallets.map(w => (
                  <TouchableOpacity 
                    key={w.id} 
                    style={[
                      styles.walletPill, 
                      { 
                        backgroundColor: walletId === w.id ? colors.primary : themeColors.inputBg,
                        borderColor: walletId === w.id ? colors.primary : (missingFields.includes("wallet") ? colors.rose : themeColors.border),
                        borderWidth: missingFields.includes("wallet") && walletId !== w.id ? 1.5 : 1
                      }
                    ]}
                    onPress={() => setWalletId(w.id!)}
                  >
                    <Typo size={14} fontWeight="600" color={walletId === w.id ? colors.white : themeColors.text}>
                      {w.name}
                    </Typo>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
          
          <View style={styles.inputContainer}>
            <Typo size={14} color={themeColors.textLight} fontWeight="500">Category</Typo>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, marginTop: 10 }}>
              {Object.keys(expenseCategories).map(catKey => {
                const cat = expenseCategories[catKey];
                const isSelected = category === catKey;
                const IconComp = cat.icon;
                return (
                  <TouchableOpacity 
                    key={catKey} 
                    style={[
                      styles.catPill, 
                      { 
                        backgroundColor: isSelected ? cat.bgColor : themeColors.inputBg,
                        borderColor: isSelected ? cat.bgColor : themeColors.border 
                      }
                    ]}
                    onPress={() => setCategory(catKey)}
                  >
                    <IconComp size={verticalScale(16)} weight={isSelected ? "fill" : "regular"} color={isSelected ? colors.white : themeColors.text} />
                    <Typo size={13} fontWeight="500" color={isSelected ? colors.white : themeColors.text}>
                      {cat.label}
                    </Typo>
                  </TouchableOpacity>
                )
              })}
            </ScrollView>
          </View>

        </ScrollView>

        <View style={styles.footer}>
          <Button onPress={handleSave} loading={loading}>
            <Typo color={colors.black} size={16} fontWeight="700">
              {isEditing ? "Save Changes" : "Create Subscription"}
            </Typo>
          </Button>
        </View>
      </View>
    </ModalWrapper>
  )
}

export default ManageSubscriptionModal

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacingX._20,
  },
  scrollContent: {
    paddingVertical: spacingY._15,
    gap: spacingY._15,
    paddingBottom: verticalScale(100),
  },
  inputContainer: {
    gap: spacingY._5,
  },
  datePickerBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacingX._15,
    borderRadius: radius._15,
    borderWidth: 1,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacingX._15,
    borderRadius: radius._15,
    borderWidth: 1,
  },
  walletPill: {
    paddingHorizontal: spacingX._15,
    paddingVertical: spacingY._10,
    borderRadius: radius._20,
    borderWidth: 1,
  },
  catPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: spacingX._15,
    paddingVertical: spacingY._10,
    borderRadius: radius._20,
    borderWidth: 1,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacingX._20,
    backgroundColor: "transparent",
  }
})
