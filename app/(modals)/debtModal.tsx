import React, { useState, useMemo, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Switch,
  Platform,
  TouchableOpacity,
  Pressable,
} from 'react-native';
import Toast from 'react-native-toast-message';
import ModalWrapper from '@/components/ModalWrapper';
import Header from '@/components/Header';
import BackButton from '@/components/BackButton';
import Typo from '@/components/Typo';
import { colors, radius, spacingX, spacingY } from '@/constants/theme';
import { useAuth } from '@/contexts/authContext';
import { useTheme } from '@/contexts/themeContext';
import { useData } from '@/contexts/dataContext';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Input from '@/components/Input';
import Button from '@/components/Button';
import { scale, verticalScale } from '@/utils/styling';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Icons from 'phosphor-react-native';
import SegmentedPill from '@/components/SegmentedPill';
import { Dropdown } from 'react-native-element-dropdown';
import ImageUpload from '@/components/ImageUpload';
import { createOrUpdateDebt } from '@/services/debtService';
import { formatDateShort, resolveDate } from '@/utils/dateHelper';
import { DebtItemType } from '@/types';
import { sanitizeErrorMessage } from '@/utils/common';

const DebtModal = () => {
  const { user } = useAuth();
  const { wallets, debts } = useData();
  const { colors: themeColors, isDark } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams();

  const isEditing = !!params.id;

  const directionTabs = ['I Lent (To Collect)', 'I Borrowed (To Pay)'];
  const [typeIndex, setTypeIndex] = useState(params.type === 'borrowed' ? 1 : 0);

  const [personName, setPersonName] = useState((params.personName as string) || '');
  const [amount, setAmount] = useState((params.amount as string) || '');
  const [description, setDescription] = useState((params.description as string) || '');
  const [image, setImage] = useState<any>(params.image || null);

  // Wallet Sync
  const [syncWithWallet, setSyncWithWallet] = useState(
    params.syncWithWallet === 'true' || (!isEditing && wallets.length > 0)
  );
  const [walletId, setWalletId] = useState<string>(
    (params.walletId as string) || (wallets.length > 0 ? wallets[0].id || '' : '')
  );

  // Due Date
  const [hasDueDate, setHasDueDate] = useState(!!params.dueDate);
  const [dueDate, setDueDate] = useState<Date>(
    params.dueDate ? resolveDate(params.dueDate) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  );
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [loading, setLoading] = useState(false);
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const amountRef = useRef<any>(null);

  // Extract unique previous names from user's debts for instant autocomplete with live filtering
  const suggestedNames = useMemo(() => {
    const namesSet = new Set<string>();
    debts.forEach((d) => {
      if (d.personName && d.personName.trim()) {
        namesSet.add(d.personName.trim());
      }
    });
    const all = Array.from(namesSet);
    const query = personName.trim().toLowerCase();
    if (!query) {
      return all.slice(0, 8);
    }
    return all.filter((n) => n.toLowerCase().includes(query) && n.toLowerCase() !== query).slice(0, 6);
  }, [debts, personName]);

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) setDueDate(selectedDate);
  };

  const setPresetDays = (days: number) => {
    setHasDueDate(true);
    const target = new Date();
    target.setDate(target.getDate() + days);
    setDueDate(target);
  };

  const handleSave = async () => {
    if (loading) return;
    if (!user?.uid) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'You must be logged in to do this.' });
      return;
    }

    const missing: string[] = [];
    if (!personName.trim()) missing.push('personName');
    if (!amount.trim() || isNaN(Number(amount)) || Number(amount) <= 0) missing.push('amount');
    if (syncWithWallet && !walletId) missing.push('wallet');

    if (missing.length > 0) {
      setMissingFields(missing);
      Toast.show({
        type: 'error',
        text1: 'Missing Information',
        text2: 'Please fill in the required fields highlighted in red.',
      });
      return;
    }

    const isLent = typeIndex === 0;
    const parsedAmount = parseFloat(amount);

    // Prevent negative wallet balance when lending
    if (isLent && syncWithWallet && walletId) {
      const selectedWallet = wallets.find((w) => w.id === walletId);
      const currentBalance = Number(selectedWallet?.amount || 0);
      if (selectedWallet && currentBalance < parsedAmount) {
        Toast.show({
          type: 'error',
          text1: 'Insufficient Balance',
          text2: `${selectedWallet.name} only has ${currency}${currentBalance.toFixed(2)}. You cannot lend more than your wallet balance.`,
        });
        return;
      }
    }

    setLoading(true);

    const payload: Partial<DebtItemType> = {
      id: isEditing ? (params.id as string) : undefined,
      uid: user.uid,
      personName: personName.trim(),
      type: isLent ? 'lent' : 'borrowed',
      amount: parsedAmount,
      description: description.trim() || '',
      syncWithWallet,
    };

    payload.dueDate = hasDueDate && dueDate ? dueDate : null;

    if (syncWithWallet && walletId) {
      payload.walletId = walletId;
    }

    if (image) {
      payload.image = image;
    }

    const res = await createOrUpdateDebt(payload);
    setLoading(false);

    if (res.success) {
      Toast.show({
        type: 'success',
        text1: isEditing ? 'Updated' : 'Debt Logged',
        text2: isEditing
          ? 'Record updated successfully.'
          : `${isLent ? 'Lent to' : 'Borrowed from'} ${personName.trim()} recorded.`,
      });
      router.back();
    } else {
      Toast.show({
        type: 'error',
        text1: 'Save Failed',
        text2: sanitizeErrorMessage(res.msg, 'Failed to save record. Please check the details and try again.'),
      });
    }
  };

  const isLent = typeIndex === 0;
  const currency = user?.currency || '$';

  return (
    <ModalWrapper>
      <View style={styles.container}>
        <Header
          title={isEditing ? 'Edit Debt' : 'Add Lent / Borrowed'}
          leftIcon={<BackButton />}
        />

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: verticalScale(60) }}
        >
          {/* Direction Pill (I Lent vs I Borrowed) or Edit Mode Badge */}
          {!isEditing ? (
            <View style={{ marginVertical: spacingY._15 }}>
              <SegmentedPill
                tabs={directionTabs}
                activeIndex={typeIndex}
                onChange={(index: number) => setTypeIndex(index)}
              />
            </View>
          ) : (
            <View
              style={{
                marginVertical: spacingY._15,
                paddingVertical: scale(8),
                paddingHorizontal: scale(14),
                borderRadius: radius._10,
                backgroundColor: isLent ? 'rgba(74, 222, 128, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                borderWidth: 1,
                borderColor: isLent ? 'rgba(74, 222, 128, 0.3)' : 'rgba(239, 68, 68, 0.3)',
                flexDirection: 'row',
                alignItems: 'center',
                gap: scale(8),
              }}
            >
              {isLent ? (
                <Icons.ArrowDownLeft size={verticalScale(16)} color={colors.green} weight="bold" />
              ) : (
                <Icons.ArrowUpRight size={verticalScale(16)} color={colors.rose} weight="bold" />
              )}
              <Typo size={13} fontWeight="600" color={isLent ? colors.green : colors.rose}>
                {isLent ? 'Editing Lent Record (Money to Collect)' : 'Editing Borrowed Record (Money to Pay)'}
              </Typo>
            </View>
          )}

          {/* Person Name Input */}
          <View style={styles.inputGroup}>
            <Typo size={15} fontWeight="600" color={themeColors.text}>
              Person / Contact Name *
            </Typo>
            <Input
              value={personName}
              onChangeText={(text) => {
                setPersonName(text);
                setMissingFields((prev) => prev.filter((f) => f !== 'personName'));
              }}
              placeholder="e.g. Alex, Mom, Landlord..."
              icon={<Icons.UserIcon size={verticalScale(18)} color={themeColors.textLighter} />}
              containerStyle={{
                borderColor: missingFields.includes('personName') ? colors.rose : themeColors.border,
                borderWidth: missingFields.includes('personName') ? 1.5 : 1,
              }}
            />

            {/* Quick Suggestions Chips */}
            {suggestedNames.length > 0 && !isEditing && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: scale(6) }}>
                <View style={{ flexDirection: 'row', gap: scale(6) }}>
                  {suggestedNames.map((name) => (
                    <TouchableOpacity
                      key={name}
                      onPress={() => {
                        setPersonName(name);
                        setMissingFields((prev) => prev.filter((f) => f !== 'personName'));
                      }}
                      style={[
                        styles.chip,
                        {
                          backgroundColor: personName === name ? colors.primary : themeColors.inputBg,
                          borderColor: themeColors.border,
                        },
                      ]}
                    >
                      <Typo
                        size={12}
                        fontWeight="600"
                        color={personName === name ? colors.neutral900 : themeColors.textLight}
                      >
                        {name}
                      </Typo>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            )}
          </View>

          {/* Amount Input */}
          <View style={styles.inputGroup}>
            <Typo size={15} fontWeight="600" color={themeColors.text}>
              Amount *
            </Typo>
            <Input
              inputRef={amountRef}
              value={amount}
              onChangeText={(text) => {
                setAmount(text);
                setMissingFields((prev) => prev.filter((f) => f !== 'amount'));
              }}
              keyboardType="numeric"
              placeholder="0.00"
              icon={
                <Typo size={17} fontWeight="700" color={isLent ? colors.green : colors.rose}>
                  {currency}
                </Typo>
              }
              containerStyle={{
                borderColor: missingFields.includes('amount') ? colors.rose : themeColors.border,
                borderWidth: missingFields.includes('amount') ? 1.5 : 1,
              }}
            />
          </View>

          {/* Due Date Section */}
          <View style={styles.inputGroup}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typo size={15} fontWeight="600" color={themeColors.text}>
                Repayment Due Date (Optional)
              </Typo>
              <Switch
                value={hasDueDate}
                onValueChange={(val) => setHasDueDate(val)}
                trackColor={{ false: themeColors.inputBg, true: colors.primary }}
              />
            </View>

            {hasDueDate && (
              <View style={{ marginTop: spacingY._10 }}>
                {/* Preset Chips */}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: scale(6), marginBottom: spacingY._10 }}>
                  <TouchableOpacity
                    onPress={() => setPresetDays(7)}
                    style={[styles.chip, { backgroundColor: themeColors.inputBg, borderColor: themeColors.border }]}
                  >
                    <Typo size={12} color={themeColors.textLight}>In 7 Days</Typo>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setPresetDays(14)}
                    style={[styles.chip, { backgroundColor: themeColors.inputBg, borderColor: themeColors.border }]}
                  >
                    <Typo size={12} color={themeColors.textLight}>In 14 Days</Typo>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setPresetDays(30)}
                    style={[styles.chip, { backgroundColor: themeColors.inputBg, borderColor: themeColors.border }]}
                  >
                    <Typo size={12} color={themeColors.textLight}>In 30 Days</Typo>
                  </TouchableOpacity>
                </View>

                {/* Custom Date Field */}
                {!showDatePicker && (
                  <Pressable
                    style={[styles.dateButton, { backgroundColor: themeColors.inputBg, borderColor: themeColors.border }]}
                    onPress={() => setShowDatePicker(true)}
                  >
                    <Icons.CalendarBlank size={verticalScale(18)} color={themeColors.textLighter} />
                    <Typo size={14} color={themeColors.text}>
                      {formatDateShort(dueDate, true)}
                    </Typo>
                  </Pressable>
                )}

                {showDatePicker && (
                  <View style={Platform.OS === 'ios' ? styles.iosDatePicker : {}}>
                    <DateTimePicker
                      themeVariant={isDark ? 'dark' : 'light'}
                      value={dueDate}
                      textColor={themeColors.text}
                      mode="date"
                      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                      onChange={onDateChange}
                    />
                    {Platform.OS === 'ios' && (
                      <TouchableOpacity
                        style={[styles.datePickerOkBtn, { backgroundColor: themeColors.border }]}
                        onPress={() => setShowDatePicker(false)}
                      >
                        <Typo size={14} fontWeight="600">Done</Typo>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>
            )}
          </View>

          {/* Affect Wallet Balance Toggle */}
          {!isEditing && (
            <View style={[styles.walletSyncCard, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flex: 1, paddingRight: scale(10) }}>
                  <Typo size={15} fontWeight="600" color={themeColors.text}>
                    Affect Wallet Balance
                  </Typo>
                  <Typo size={12} color={themeColors.textLighter} style={{ marginTop: 2 }}>
                    {isLent
                      ? 'Deduct this amount from your wallet right now'
                      : 'Add this amount to your wallet balance'}
                  </Typo>
                </View>
                <Switch
                  value={syncWithWallet}
                  onValueChange={(val) => setSyncWithWallet(val)}
                  trackColor={{ false: themeColors.inputBg, true: colors.primary }}
                />
              </View>

              {syncWithWallet && (
                <View style={{ marginTop: spacingY._12 }}>
                  <Typo size={13} fontWeight="500" color={themeColors.textLighter} style={{ marginBottom: scale(6) }}>
                    Select Wallet
                  </Typo>
                  {wallets.length > 0 ? (
                    <Dropdown
                      style={[
                        styles.dropdownContainer,
                        {
                          borderColor: missingFields.includes('wallet') ? colors.rose : themeColors.border,
                          backgroundColor: themeColors.inputBg,
                        },
                      ]}
                      activeColor={isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)'}
                      placeholderStyle={{ color: themeColors.textLighter, fontSize: verticalScale(14) }}
                      selectedTextStyle={{ color: themeColors.text, fontSize: verticalScale(14) }}
                      iconStyle={{ tintColor: themeColors.textLighter }}
                      data={wallets.map((w) => ({ label: `${w.name} (${currency}${Number(w.amount || 0).toFixed(2)})`, value: w.id }))}
                      maxHeight={250}
                      labelField="label"
                      valueField="value"
                      itemTextStyle={{ color: themeColors.text }}
                      itemContainerStyle={{ backgroundColor: themeColors.inputBg }}
                      containerStyle={{ backgroundColor: themeColors.inputBg, borderColor: themeColors.border }}
                      placeholder="Select Wallet"
                      value={walletId}
                      onChange={(item) => {
                        setWalletId(item.value || '');
                        setMissingFields((prev) => prev.filter((f) => f !== 'wallet'));
                      }}
                    />
                  ) : (
                    <Typo size={13} color={colors.rose}>
                      No wallets found. Create a wallet first to sync balances.
                    </Typo>
                  )}

                  {isLent && syncWithWallet && walletId && (() => {
                    const selW = wallets.find((w) => w.id === walletId);
                    const bal = Number(selW?.amount || 0);
                    const numAmount = parseFloat(amount || '0');
                    if (selW && !isNaN(numAmount) && numAmount > 0 && bal < numAmount) {
                      return (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale(4), marginTop: scale(6) }}>
                          <Icons.WarningCircle size={verticalScale(14)} color={colors.rose} weight="fill" />
                          <Typo size={12} color={colors.rose} fontWeight="500">
                            Insufficient balance in {selW.name} ({currency}{bal.toFixed(2)} available)
                          </Typo>
                        </View>
                      );
                    }
                    return null;
                  })()}
                </View>
              )}
            </View>
          )}

          {/* Description / Notes */}
          <View style={styles.inputGroup}>
            <Typo size={15} fontWeight="600" color={themeColors.text}>
              Notes / Description (Optional)
            </Typo>
            <Input
              value={description}
              onChangeText={setDescription}
              placeholder="e.g. Dinner bill, Trip tickets, Emergency loan..."
              icon={<Icons.NoteIcon size={verticalScale(18)} color={themeColors.textLighter} />}
            />
          </View>

          {/* Receipt / Proof Upload */}
          <View style={styles.inputGroup}>
            <Typo size={15} fontWeight="600" color={themeColors.text} style={{ marginBottom: scale(6) }}>
              Attach Receipt / Proof (Optional)
            </Typo>
            <ImageUpload
              file={image}
              onSelect={(file) => setImage(file)}
              onClear={() => setImage(null)}
              placeholder="Upload receipt image"
            />
          </View>
        </ScrollView>

        {/* Footer Submit Button */}
        <View style={styles.footer}>
          <Button loading={loading} onPress={handleSave}>
            <Typo size={16} fontWeight="700" color={colors.neutral900}>
              {isEditing ? 'Save Changes' : isLent ? 'Record Lent Money' : 'Record Borrowed Money'}
            </Typo>
          </Button>
        </View>
      </View>
    </ModalWrapper>
  );
};

export default DebtModal;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacingX._20,
    marginTop: verticalScale(10),
  },
  inputGroup: {
    marginBottom: spacingY._15,
    gap: spacingY._7,
  },
  chip: {
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(6),
    borderRadius: radius._10,
    borderWidth: 1,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(10),
    padding: spacingX._12,
    borderRadius: radius._10,
    borderWidth: 1,
  },
  iosDatePicker: {
    padding: spacingX._10,
    borderRadius: radius._12,
  },
  datePickerOkBtn: {
    alignSelf: 'flex-end',
    paddingVertical: verticalScale(6),
    paddingHorizontal: scale(16),
    borderRadius: radius._6,
    marginTop: scale(6),
  },
  walletSyncCard: {
    padding: spacingX._15,
    borderRadius: radius._15,
    borderWidth: 1,
    marginBottom: spacingY._15,
  },
  dropdownContainer: {
    height: verticalScale(48),
    borderRadius: radius._10,
    paddingHorizontal: spacingX._12,
    borderWidth: 1,
  },
  footer: {
    paddingVertical: spacingY._15,
  },
});
