import React, { useState, useMemo, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Share,
  Switch,
  Modal,
  PanResponder,
  Animated,
} from 'react-native';
import { Dropdown } from 'react-native-element-dropdown';
import { Image } from 'expo-image';
import ModalWrapper from '@/components/ModalWrapper';
import Header from '@/components/Header';
import BackButton from '@/components/BackButton';
import Typo from '@/components/Typo';
import { colors, radius, spacingX, spacingY } from '@/constants/theme';
import { useData } from '@/contexts/dataContext';
import Button from '@/components/Button';
import Input from '@/components/Input';
import { useTheme } from '@/contexts/themeContext';
import * as Icons from 'phosphor-react-native';
import { scale, verticalScale } from '@/utils/styling';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/authContext';
import { resolveDate, formatDateShort } from '@/utils/dateHelper';
import CustomAlert from '@/components/CustomAlert';
import Toast from 'react-native-toast-message';
import SegmentedPill from '@/components/SegmentedPill';
import { deleteDebt, settleDebt } from '@/services/debtService';
import { DebtItemType } from '@/types';
import { sanitizeErrorMessage } from '@/utils/common';

const DebtsListModal = () => {
  const { debts, wallets, setDebts, setWallets } = useData();
  const { colors: themeColors, isDark } = useTheme();
  const router = useRouter();
  const { user } = useAuth();

  const [filterIndex, setFilterIndex] = useState(0);
  const filterTabs = ['All', 'To Collect', 'To Pay', 'Settled'];

  const [searchQuery, setSearchQuery] = useState('');

  // Settle Modal State
  const [settleAlertVisible, setSettleAlertVisible] = useState(false);
  const [selectedDebtForSettle, setSelectedDebtForSettle] = useState<DebtItemType | null>(null);
  const [settleAmountInput, setSettleAmountInput] = useState('');
  const [settleWalletId, setSettleWalletId] = useState<string>('');
  const [syncSettleWallet, setSyncSettleWallet] = useState(true);
  const [settleNotes, setSettleNotes] = useState('');

  // Delete Alert State
  const [deleteAlertVisible, setDeleteAlertVisible] = useState(false);
  const [selectedDebtForDelete, setSelectedDebtForDelete] = useState<DebtItemType | null>(null);
  const [refundWalletOnDelete, setRefundWalletOnDelete] = useState(true);

  // Details Modal State
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [selectedDebtForDetails, setSelectedDebtForDetails] = useState<DebtItemType | null>(null);
  const [previewReceiptUrl, setPreviewReceiptUrl] = useState<string | null>(null);

  // Swipe-to-dismiss for detail sheet (PanResponder)
  const sheetTranslateY = useRef(new Animated.Value(0)).current;
  const sheetPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gs) => gs.dy > 5,
      onPanResponderMove: (_, gs) => {
        if (gs.dy > 0) sheetTranslateY.setValue(gs.dy);
      },
      onPanResponderRelease: (_, gs) => {
        if (gs.dy > 100) {
          Animated.timing(sheetTranslateY, {
            toValue: 600,
            duration: 220,
            useNativeDriver: true,
          }).start(() => {
            sheetTranslateY.setValue(0);
            setDetailsModalVisible(false);
          });
        } else {
          Animated.spring(sheetTranslateY, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 4,
          }).start();
        }
      },
    })
  ).current;

  // Live selected debt synchronizer (ensures modal reflects edits/settlements instantly)
  const liveSelectedDebt = useMemo(() => {
    if (!selectedDebtForDetails?.id) return null;
    return debts.find((d) => d.id === selectedDebtForDetails.id) || selectedDebtForDetails;
  }, [debts, selectedDebtForDetails]);

  // Wallet Name Lookup
  const getWalletName = (walletId?: string) => {
    if (!walletId) return null;
    const w = wallets.find((w) => w.id === walletId);
    return w ? w.name : 'Linked Wallet';
  };

  // Summary Calculations
  const { totalToCollect, totalToPay, netPosition } = useMemo(() => {
    let collect = 0;
    let pay = 0;

    debts.forEach((debt) => {
      const remaining = Number(debt.remainingAmount || 0);
      if (debt.status === 'pending' && remaining > 0) {
        if (debt.type === 'lent') {
          collect += remaining;
        } else {
          pay += remaining;
        }
      }
    });

    const roundedCollect = Math.round(collect * 100) / 100;
    const roundedPay = Math.round(pay * 100) / 100;
    const roundedNet = Math.round((roundedCollect - roundedPay) * 100) / 100;

    return {
      totalToCollect: roundedCollect,
      totalToPay: roundedPay,
      netPosition: roundedNet,
    };
  }, [debts]);

  // Filtered & Searched Debts
  const filteredDebts = useMemo(() => {
    return debts.filter((debt) => {
      // Tab filter
      if (filterIndex === 1 && (debt.type !== 'lent' || debt.status === 'settled')) return false;
      if (filterIndex === 2 && (debt.type !== 'borrowed' || debt.status === 'settled')) return false;
      if (filterIndex === 3 && debt.status !== 'settled') return false;

      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const nameMatch = debt.personName?.toLowerCase().includes(query);
        const descMatch = debt.description?.toLowerCase().includes(query);
        if (!nameMatch && !descMatch) return false;
      }

      return true;
    });
  }, [debts, filterIndex, searchQuery]);

  // Due date helper
  const getDueStatus = (dueDateVal?: any) => {
    if (!dueDateVal) return null;
    const target = resolveDate(dueDateVal);
    const now = new Date();
    const diffTime = target.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { text: `Overdue by ${Math.abs(diffDays)}d`, isOverdue: true };
    }
    if (diffDays === 0) return { text: 'Due Today', isOverdue: false, isNear: true };
    if (diffDays === 1) return { text: 'Due Tomorrow', isOverdue: false, isNear: true };
    return { text: `Due in ${diffDays}d`, isOverdue: false };
  };

  // 1-Tap Share Reminder (Zero permissions, native Share Sheet)
  const handleShareReminder = async (debt: DebtItemType) => {
    const currency = user?.currency || '$';
    const remaining = Number(debt.remainingAmount || 0).toFixed(2);
    const isLent = debt.type === 'lent';
    const firstName = debt.personName?.trim().split(' ')[0] || debt.personName?.trim() || 'there';
    const forDesc = debt.description?.trim() ? ` for "${debt.description.trim()}"` : '';

    const message = isLent
      ? `Hey ${firstName}! Hope you're doing well 😊\n\nJust a gentle, friendly reminder about the ${currency}${remaining}${forDesc} whenever you get a chance. No rush at all, just wanted to check in. Let me know whenever convenient! Thanks a bunch 🙌`
      : `Hey ${firstName}! Hope you're having a great day 😊\n\nJust wanted to check in about the ${currency}${remaining}${forDesc} that I owe you. Let me know the easiest way or account to send it over to you. Thanks so much! 🙌`;

    try {
      await Share.share({
        message,
        title: isLent ? 'Friendly Reminder' : 'Settlement Check-in',
      });
    } catch (err: any) {
      console.error('Error sharing reminder:', err);
      Toast.show({
        type: 'error',
        text1: 'Share Failed',
        text2: 'Could not open share options. Please try again.',
      });
    }
  };

  // Open Details Modal
  const handleOpenDetails = (debt: DebtItemType) => {
    setSelectedDebtForDetails(debt);
    setDetailsModalVisible(true);
  };

  // Open Settle Modal
  const handleOpenSettle = (debt: DebtItemType) => {
    setSelectedDebtForSettle(debt);
    setSettleAmountInput(Number(debt.remainingAmount || 0).toString());
    setSettleNotes('');
    setSyncSettleWallet(!!debt.syncWithWallet && wallets.length > 0);
    setSettleWalletId(debt.walletId || (wallets.length > 0 ? wallets[0].id || '' : ''));
    setSettleAlertVisible(true);
  };

  // Submit Settlement with Optimistic UI Update (Instant 0ms Feedback)
  const handleConfirmSettle = async () => {
    if (!selectedDebtForSettle?.id) return;

    const parsedAmount = parseFloat(settleAmountInput);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      Toast.show({
        type: 'error',
        text1: 'Invalid Amount',
        text2: 'Please enter a valid repayment amount.',
      });
      return;
    }

    if (syncSettleWallet && !settleWalletId) {
      Toast.show({
        type: 'error',
        text1: 'Select Wallet',
        text2: 'Please select a wallet for this repayment.',
      });
      return;
    }

    // Prevent negative wallet balance when repaying borrowed money
    if (selectedDebtForSettle.type === 'borrowed' && syncSettleWallet && settleWalletId) {
      const targetWallet = wallets.find((w) => w.id === settleWalletId);
      const currentBalance = Number(targetWallet?.amount || 0);
      if (targetWallet && currentBalance < parsedAmount) {
        Toast.show({
          type: 'error',
          text1: 'Insufficient Balance',
          text2: `${targetWallet.name} only has ${user?.currency || '$'}${currentBalance.toFixed(2)}. You cannot repay more than your wallet balance.`,
        });
        return;
      }
    }

    // Save previous states for rollback if background sync fails
    const previousDebts = [...debts];
    const previousWallets = [...wallets];
    const debtId = selectedDebtForSettle.id;
    const isLent = selectedDebtForSettle.type === 'lent';
    const remaining = Math.round(Number(selectedDebtForSettle.remainingAmount || 0) * 100) / 100;
    const effectiveAmount = Math.min(parsedAmount, remaining);
    const newSettledAmount = Math.round((Number(selectedDebtForSettle.settledAmount || 0) + effectiveAmount) * 100) / 100;
    const rawRemaining = remaining - effectiveAmount;
    const newRemaining = rawRemaining <= 0.005 ? 0 : Math.round(rawRemaining * 100) / 100;
    const newStatus = newRemaining <= 0 ? 'settled' : 'pending';

    const optimisticSettlementEntry = {
      id: `temp_${Date.now()}`,
      amount: effectiveAmount,
      date: new Date(),
      walletId: syncSettleWallet ? settleWalletId : undefined,
      notes: settleNotes.trim() || undefined,
    };

    // 1. INSTANTLY close modal & clear inputs (0ms delay for user)
    setSettleAlertVisible(false);

    // 2. INSTANTLY apply optimistic state updates
    setDebts((prevDebts) =>
      prevDebts.map((d) => {
        if (d.id === debtId) {
          return {
            ...d,
            remainingAmount: newRemaining,
            settledAmount: newSettledAmount,
            status: newStatus,
            settlements: [...(d.settlements || []), optimisticSettlementEntry],
          };
        }
        return d;
      })
    );

    if (syncSettleWallet && settleWalletId) {
      setWallets((prevWallets) =>
        prevWallets.map((w) => {
          if (w.id === settleWalletId) {
            const currentAmount = Number(w.amount || 0);
            return {
              ...w,
              amount: isLent ? currentAmount + effectiveAmount : currentAmount - effectiveAmount,
            };
          }
          return w;
        })
      );
    }

    // 3. User feedback toast
    Toast.show({
      type: 'success',
      text1: 'Payment Recorded',
      text2: `Successfully recorded repayment of ${user?.currency || '$'}${effectiveAmount.toFixed(2)}.`,
    });

    // 4. Background Server Sync with Sanitized Error Handling
    try {
      const res = await settleDebt(
        debtId,
        parsedAmount,
        syncSettleWallet ? settleWalletId : undefined,
        syncSettleWallet,
        settleNotes
      );

      if (!res.success) {
        // Rollback state on failure
        setDebts(previousDebts);
        setWallets(previousWallets);
        Toast.show({
          type: 'error',
          text1: 'Settlement Failed',
          text2: sanitizeErrorMessage(res.msg, 'Could not complete settlement. Changes were rolled back.'),
        });
      }
    } catch (err: any) {
      // Rollback state on unhandled exception
      setDebts(previousDebts);
      setWallets(previousWallets);
      Toast.show({
        type: 'error',
        text1: 'Network Error',
        text2: sanitizeErrorMessage(err, 'Unable to sync settlement with the server. Please check your connection.'),
      });
    }
  };

  // Delete Handlers
  const handleOpenDelete = (debt: DebtItemType) => {
    setSelectedDebtForDelete(debt);
    setRefundWalletOnDelete(!!debt.syncWithWallet && !!debt.walletId);
    setDeleteAlertVisible(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedDebtForDelete?.id) return;
    const debtId = selectedDebtForDelete.id;
    const debtToDelete = selectedDebtForDelete;
    const previousDebts = [...debts];
    const previousWallets = [...wallets];

    // 1. Instantly close dialogs
    setDeleteAlertVisible(false);
    if (detailsModalVisible) setDetailsModalVisible(false);

    // 2. Instantly remove from local list
    setDebts((prevDebts) => prevDebts.filter((d) => d.id !== debtId));

    // Optimistically revert wallet if requested
    if (refundWalletOnDelete && debtToDelete.syncWithWallet && debtToDelete.walletId) {
      const amountToRevert = Number(debtToDelete.remainingAmount || 0);
      setWallets((prevWallets) =>
        prevWallets.map((w) => {
          if (w.id === debtToDelete.walletId) {
            const currentAmount = Number(w.amount || 0);
            return {
              ...w,
              amount:
                debtToDelete.type === 'lent'
                  ? currentAmount + amountToRevert
                  : currentAmount - amountToRevert,
            };
          }
          return w;
        })
      );
    }

    Toast.show({
      type: 'success',
      text1: 'Deleted',
      text2: refundWalletOnDelete
        ? 'Debt deleted and linked wallet balance adjusted.'
        : 'Debt record has been deleted.',
    });

    // 3. Background server sync with sanitized error handling
    try {
      const res = await deleteDebt(debtId, refundWalletOnDelete);
      if (!res.success) {
        setDebts(previousDebts);
        setWallets(previousWallets);
        Toast.show({
          type: 'error',
          text1: 'Delete Failed',
          text2: sanitizeErrorMessage(res.msg, 'Failed to delete record on the server. Record restored.'),
        });
      }
    } catch (err: any) {
      setDebts(previousDebts);
      setWallets(previousWallets);
      Toast.show({
        type: 'error',
        text1: 'Network Error',
        text2: sanitizeErrorMessage(err, 'Failed to connect to the server. Record restored.'),
      });
    }
  };

  // Navigate to Edit Modal
  const handleNavigateToEdit = (debt: DebtItemType) => {
    setDetailsModalVisible(false);
    router.push({
      pathname: '/(modals)/debtModal',
      params: {
        id: debt.id,
        personName: debt.personName,
        type: debt.type,
        amount: String(debt.amount),
        description: debt.description || '',
        dueDate: debt.dueDate ? resolveDate(debt.dueDate).toISOString() : '',
        walletId: debt.walletId || '',
        syncWithWallet: debt.syncWithWallet ? 'true' : 'false',
        image: debt.image || '',
      },
    });
  };

  const currency = user?.currency || '$';

  return (
    <ModalWrapper>
      <View style={styles.container}>
        {/* Header */}
        <Header
          title="Lent & Borrowed"
          leftIcon={<BackButton />}
        />

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: verticalScale(50) }}
        >
          {/* Summary Card */}
          <View style={[styles.summaryCard, { backgroundColor: themeColors.card }]}>
            <View style={styles.summaryRow}>
              {/* To Collect (Lent) */}
              <View style={styles.summaryCol}>
                <View style={styles.summaryTag}>
                  <Icons.ArrowDownLeft
                    size={verticalScale(14)}
                    color={colors.green}
                    weight="bold"
                  />
                  <Typo size={12} color={themeColors.textLighter} fontWeight="500">
                    To Collect
                  </Typo>
                </View>
                <Typo size={18} fontWeight="700" color={colors.green} style={{ marginTop: scale(4) }}>
                  {currency}{totalToCollect.toFixed(2)}
                </Typo>
              </View>

              <View style={[styles.summaryDivider, { backgroundColor: themeColors.border }]} />

              {/* To Pay (Borrowed) */}
              <View style={styles.summaryCol}>
                <View style={styles.summaryTag}>
                  <Icons.ArrowUpRight
                    size={verticalScale(14)}
                    color={colors.rose}
                    weight="bold"
                  />
                  <Typo size={12} color={themeColors.textLighter} fontWeight="500">
                    To Pay
                  </Typo>
                </View>
                <Typo size={18} fontWeight="700" color={colors.rose} style={{ marginTop: scale(4) }}>
                  {currency}{totalToPay.toFixed(2)}
                </Typo>
              </View>
            </View>

            {/* Net Position Banner */}
            <View
              style={[
                styles.netBanner,
                {
                  backgroundColor:
                    netPosition > 0
                      ? 'rgba(74, 222, 128, 0.1)'
                      : netPosition < 0
                      ? 'rgba(239, 68, 68, 0.1)'
                      : themeColors.inputBg,
                },
              ]}
            >
              <Typo
                size={12}
                fontWeight="600"
                color={
                  netPosition > 0
                    ? colors.green
                    : netPosition < 0
                    ? colors.rose
                    : themeColors.textLight
                }
              >
                Net Position: {netPosition > 0 ? '+' : ''}{currency}{netPosition.toFixed(2)} ({netPosition > 0 ? "You're owed more than you owe" : netPosition < 0 ? 'You owe more than you are owed' : 'All balances are settled / even'})
              </Typo>
            </View>
          </View>

          {/* Segmented Filter Pills */}
          <View style={{ marginVertical: spacingY._15 }}>
            <SegmentedPill
              tabs={filterTabs}
              activeIndex={filterIndex}
              onChange={(index: number) => setFilterIndex(index)}
            />
          </View>

          {/* Search Input */}
          <View style={{ marginBottom: spacingY._15 }}>
            <Input
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search by name or note..."
              icon={<Icons.MagnifyingGlassIcon size={verticalScale(18)} color={themeColors.textLighter} />}
            />
          </View>

          {/* Debts List */}
          {filteredDebts.length === 0 ? (
            <View style={[styles.emptyContainer, { backgroundColor: themeColors.card }]}>
              <View style={[styles.emptyIconBox, { backgroundColor: themeColors.inputBg }]}>
                <Icons.HandCoins size={verticalScale(28)} color={colors.primary} weight="duotone" />
              </View>
              <Typo size={15} fontWeight="600" color={themeColors.text} style={{ marginTop: spacingY._7 }}>
                No records found
              </Typo>
              <Typo size={12} color={themeColors.textLighter} style={{ textAlign: 'center', marginTop: scale(2) }}>
                {searchQuery.trim()
                  ? 'No debts match your search filter.'
                  : filterIndex === 0
                  ? 'You have not recorded any lent or borrowed cash yet.'
                  : `No ${filterTabs[filterIndex].toLowerCase()} debts right now.`}
              </Typo>
              <TouchableOpacity
                onPress={() => router.push('/(modals)/debtModal')}
                style={[styles.emptyAddBtn, { backgroundColor: colors.primary }]}
              >
                <Typo size={14} fontWeight="700" color={colors.neutral900}>
                  Add Lent / Borrowed
                </Typo>
              </TouchableOpacity>
            </View>
          ) : (
            filteredDebts.map((debt) => {
              const isLent = debt.type === 'lent';
              const isSettled = debt.status === 'settled';
              const remaining = Number(debt.remainingAmount || 0);
              const total = Number(debt.amount || 0);
              const dueInfo = getDueStatus(debt.dueDate);

              const initial = debt.personName ? debt.personName.charAt(0).toUpperCase() : '?';

              return (
                <TouchableOpacity
                  key={debt.id}
                  activeOpacity={0.75}
                  onPress={() => handleOpenDetails(debt)}
                  style={[
                    styles.debtCard,
                    {
                      backgroundColor: themeColors.card,
                      borderColor: isSettled ? themeColors.border : isLent ? 'rgba(74, 222, 128, 0.25)' : 'rgba(239, 68, 68, 0.25)',
                    },
                  ]}
                >
                  <View style={styles.cardTopRow}>
                    {/* Avatar & Person Info */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale(10), flex: 1 }}>
                      <View
                        style={[
                          styles.avatar,
                          {
                            backgroundColor: isSettled
                              ? themeColors.inputBg
                              : isLent
                              ? 'rgba(74, 222, 128, 0.15)'
                              : 'rgba(239, 68, 68, 0.15)',
                          },
                        ]}
                      >
                        <Typo
                          size={16}
                          fontWeight="700"
                          color={isSettled ? themeColors.textLighter : isLent ? colors.green : colors.rose}
                        >
                          {initial}
                        </Typo>
                      </View>

                      <View style={{ flex: 1 }}>
                        <Typo size={15} fontWeight="600" color={themeColors.text} textProps={{ numberOfLines: 1 }}>
                          {debt.personName}
                        </Typo>
                        {/* Badge row with micro-icon and refined alignment */}
                        <View style={[styles.typeBadge, {
                          marginTop: scale(4),
                          alignSelf: 'flex-start',
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: scale(4),
                          backgroundColor: isSettled
                            ? 'rgba(74, 222, 128, 0.12)'
                            : isLent
                            ? 'rgba(74, 222, 128, 0.12)'
                            : 'rgba(239, 68, 68, 0.12)',
                          borderColor: isSettled
                            ? 'rgba(74, 222, 128, 0.25)'
                            : isLent
                            ? 'rgba(74, 222, 128, 0.25)'
                            : 'rgba(239, 68, 68, 0.25)',
                          borderWidth: 1,
                        }]}>
                          {isSettled ? (
                            <Icons.CheckCircle size={verticalScale(11)} color={colors.green} weight="bold" />
                          ) : isLent ? (
                            <Icons.ArrowDownLeft size={verticalScale(11)} color={colors.green} weight="bold" />
                          ) : (
                            <Icons.ArrowUpRight size={verticalScale(11)} color={colors.rose} weight="bold" />
                          )}
                          <Typo
                            size={10}
                            fontWeight="700"
                            color={isSettled ? colors.green : isLent ? colors.green : colors.rose}
                          >
                            {isSettled ? 'SETTLED' : isLent ? 'YOU LENT' : 'YOU BORROWED'}
                          </Typo>
                        </View>
                        {/* Description on its own line, constrained */}
                        {debt.description ? (
                          <Typo size={12} color={themeColors.textLighter} style={{ marginTop: 2 }} textProps={{ numberOfLines: 1 }}>
                            {debt.description}
                          </Typo>
                        ) : null}
                      </View>
                    </View>

                    {/* Amount + chevron */}
                    <View style={{ alignItems: 'flex-end', gap: scale(2) }}>
                      <Typo
                        size={17}
                        fontWeight="700"
                        color={isSettled ? themeColors.textLighter : isLent ? colors.green : colors.rose}
                      >
                        {isSettled
                          ? `${currency}${total.toFixed(2)}`
                          : `${isLent ? '+' : '-'}${currency}${remaining.toFixed(2)}`}
                      </Typo>
                      {isSettled ? (
                        <Typo size={11} color={colors.green} fontWeight="600">
                          ✓ Fully Settled
                        </Typo>
                      ) : remaining !== total ? (
                        <Typo size={11} color={themeColors.textLighter}>
                          of {currency}{total.toFixed(2)}
                        </Typo>
                      ) : null}
                      <Icons.CaretRight size={verticalScale(14)} color={themeColors.textLighter} weight="bold" />
                    </View>
                  </View>

                  {/* Mini progress bar for partial repayments */}
                  {!isSettled && remaining !== total && total > 0 && (
                    <View style={[styles.miniProgressTrack, { backgroundColor: themeColors.inputBg, marginTop: spacingY._7 }]}>
                      <View
                        style={[
                          styles.miniProgressFill,
                          {
                            backgroundColor: isLent ? colors.green : colors.rose,
                            width: `${Math.min(100, Math.round(((total - remaining) / total) * 100))}%`,
                          },
                        ]}
                      />
                    </View>
                  )}

                  {/* Due Date Indicator */}
                  {dueInfo && !isSettled && (
                    <View style={styles.dueRow}>
                      <Icons.ClockIcon
                        size={verticalScale(12)}
                        color={dueInfo.isOverdue ? colors.rose : colors.neutral400}
                        weight="bold"
                      />
                      <Typo
                        size={11}
                        fontWeight="500"
                        color={dueInfo.isOverdue ? colors.rose : themeColors.textLighter}
                      >
                        {dueInfo.text}
                      </Typo>
                    </View>
                  )}

                  {/* Card Bottom Actions */}
                  <View style={[styles.cardActionsRow, { borderTopColor: themeColors.border }]}>
                    {/* Share / Remind — hidden on settled */}
                    {!isSettled && (
                      <TouchableOpacity
                        onPress={(e) => {
                          e.stopPropagation();
                          handleShareReminder(debt);
                        }}
                        style={[styles.actionBtn, { backgroundColor: themeColors.inputBg }]}
                      >
                        <Icons.ShareNetwork
                          size={verticalScale(14)}
                          color={themeColors.textLight}
                          weight="bold"
                        />
                        <Typo size={12} fontWeight="600" color={themeColors.textLight}>
                          Remind
                        </Typo>
                      </TouchableOpacity>
                    )}

                    {/* Settle Action — hidden on settled */}
                    {!isSettled && (
                      <TouchableOpacity
                        onPress={(e) => {
                          e.stopPropagation();
                          handleOpenSettle(debt);
                        }}
                        style={[
                          styles.actionBtn,
                          {
                            backgroundColor: isLent ? 'rgba(74, 222, 128, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                          },
                        ]}
                      >
                        <Icons.CheckCircleIcon
                          size={verticalScale(14)}
                          color={isLent ? colors.green : colors.rose}
                          weight="bold"
                        />
                        <Typo
                          size={12}
                          fontWeight="600"
                          color={isLent ? colors.green : colors.rose}
                        >
                          Settle
                        </Typo>
                      </TouchableOpacity>
                    )}

                    {/* Edit — muted on settled */}
                    <TouchableOpacity
                      onPress={(e) => {
                        e.stopPropagation();
                        handleNavigateToEdit(debt);
                      }}
                      style={[styles.actionBtn, {
                        backgroundColor: themeColors.inputBg,
                        opacity: isSettled ? 0.5 : 1,
                      }]}
                    >
                      <Icons.PencilSimpleIcon size={verticalScale(14)} color={themeColors.textLight} />
                      <Typo size={12} fontWeight="600" color={themeColors.textLight}>
                        Edit
                      </Typo>
                    </TouchableOpacity>

                    {/* Delete — always clearly rose-tinted */}
                    <TouchableOpacity
                      onPress={(e) => {
                        e.stopPropagation();
                        handleOpenDelete(debt);
                      }}
                      style={[styles.actionBtn, { backgroundColor: 'rgba(239, 68, 68, 0.12)' }]}
                    >
                      <Icons.TrashIcon size={verticalScale(14)} color={colors.rose} />
                      <Typo size={12} fontWeight="600" color={colors.rose}>
                        Delete
                      </Typo>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>

        {/* Custom Confirmation Alert for Delete */}
        <CustomAlert
          visible={deleteAlertVisible}
          title="Delete Record"
          message={`Are you sure you want to delete the debt record for "${selectedDebtForDelete?.personName}"?`}
          messageStyle={{ marginBottom: spacingY._10 }}
          onCancel={() => setDeleteAlertVisible(false)}
          onConfirm={handleConfirmDelete}
          confirmText="Delete"
        >
          {selectedDebtForDelete?.syncWithWallet && selectedDebtForDelete?.walletId && (
            <View style={[styles.deleteRefundBox, { backgroundColor: themeColors.inputBg, marginTop: 0, marginBottom: spacingY._15 }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flex: 1, paddingRight: scale(10) }}>
                  <Typo size={13} fontWeight="600" color={themeColors.text}>
                    {selectedDebtForDelete.type === 'lent' ? 'Revert Wallet Balance' : 'Refund Wallet Balance'}
                  </Typo>
                  <Typo size={11} color={themeColors.textLighter} style={{ marginTop: 2 }}>
                    {selectedDebtForDelete.type === 'lent'
                      ? `Add back ${currency}${Number(selectedDebtForDelete.amount || 0).toFixed(2)} to ${getWalletName(selectedDebtForDelete.walletId)}`
                      : `Deduct ${currency}${Number(selectedDebtForDelete.amount || 0).toFixed(2)} from ${getWalletName(selectedDebtForDelete.walletId)}`}
                  </Typo>
                </View>
                <Switch
                  value={refundWalletOnDelete}
                  onValueChange={setRefundWalletOnDelete}
                  trackColor={{ false: themeColors.card, true: colors.primary }}
                />
              </View>
            </View>
          )}
        </CustomAlert>

        {/* Custom Settle Modal with Wallet Selector & Toggle */}
        <CustomAlert
          visible={settleAlertVisible}
          title={`Settle with ${selectedDebtForSettle?.personName || ''}`}
          message={`Remaining balance: ${currency}${Number(selectedDebtForSettle?.remainingAmount || 0).toFixed(2)}\nEnter repayment amount:`}
          onCancel={() => setSettleAlertVisible(false)}
          onConfirm={handleConfirmSettle}
          confirmText="Confirm Settle"
        >
          <View style={{ marginTop: spacingY._10, gap: spacingY._10 }}>
            <Input
              value={settleAmountInput}
              onChangeText={setSettleAmountInput}
              keyboardType="numeric"
              placeholder="0.00"
              icon={<Typo size={16} fontWeight="700" color={colors.primary}>{currency}</Typo>}
            />
            <Input
              value={settleNotes}
              onChangeText={setSettleNotes}
              placeholder="Optional note (e.g. Bank Transfer)..."
            />

            {/* Wallet Integration Toggle & Selector */}
            {wallets.length > 0 && (
              <View style={[styles.settleWalletBox, { backgroundColor: themeColors.inputBg }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View style={{ flex: 1, paddingRight: scale(8) }}>
                    <Typo size={13} fontWeight="600" color={themeColors.text}>
                      {selectedDebtForSettle?.type === 'lent' ? 'Deposit into Wallet' : 'Deduct from Wallet'}
                    </Typo>
                    <Typo size={11} color={themeColors.textLighter}>
                      {selectedDebtForSettle?.type === 'lent'
                        ? 'Add repaid money to your wallet'
                        : 'Deduct repaid money from your wallet'}
                    </Typo>
                  </View>
                  <Switch
                    value={syncSettleWallet}
                    onValueChange={setSyncSettleWallet}
                    trackColor={{ false: themeColors.card, true: colors.primary }}
                  />
                </View>

                {syncSettleWallet && (
                  <View style={{ marginTop: spacingY._10 }}>
                    <Dropdown
                      style={[
                        styles.dropdownContainer,
                        { backgroundColor: themeColors.inputBg, borderColor: themeColors.border },
                      ]}
                      activeColor={isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)'}
                      placeholderStyle={{ color: themeColors.textLighter, fontSize: verticalScale(13) }}
                      selectedTextStyle={{ color: themeColors.text, fontSize: verticalScale(13) }}
                      iconStyle={{ tintColor: themeColors.textLighter }}
                      data={wallets.map((w) => ({
                        label: `${w.name} (${currency}${Number(w.amount || 0).toFixed(2)})`,
                        value: w.id || '',
                      }))}
                      maxHeight={200}
                      labelField="label"
                      valueField="value"
                      itemTextStyle={{ color: themeColors.text, fontSize: verticalScale(13) }}
                      itemContainerStyle={{ backgroundColor: themeColors.inputBg }}
                      containerStyle={{ backgroundColor: themeColors.inputBg, borderColor: themeColors.border }}
                      value={settleWalletId}
                      onChange={(item) => setSettleWalletId(item.value)}
                      placeholder="Select Destination Wallet"
                    />

                    {selectedDebtForSettle?.type === 'borrowed' && syncSettleWallet && settleWalletId && (() => {
                      const targetW = wallets.find((w) => w.id === settleWalletId);
                      const bal = Number(targetW?.amount || 0);
                      const numAmount = parseFloat(settleAmountInput || '0');
                      if (targetW && !isNaN(numAmount) && numAmount > 0 && bal < numAmount) {
                        return (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale(4), marginTop: scale(6) }}>
                            <Icons.WarningCircle size={verticalScale(14)} color={colors.rose} weight="fill" />
                            <Typo size={12} color={colors.rose} fontWeight="500">
                              Insufficient balance in {targetW.name} ({currency}{bal.toFixed(2)} available)
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
          </View>
        </CustomAlert>

        {/* Debt Details & Settlement History Modal */}
        <Modal
          visible={detailsModalVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setDetailsModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <Animated.View
              style={[
                styles.detailsSheet,
                { backgroundColor: themeColors.card, borderColor: themeColors.border },
                { transform: [{ translateY: sheetTranslateY }] },
              ]}
            >
              {/* Drag handle — swipe down to dismiss */}
              <View {...sheetPanResponder.panHandlers} style={styles.dragHandleArea}>
                <View style={[styles.dragHandle, { backgroundColor: themeColors.border }]} />
              </View>

              {/* Sheet Header */}
              <View style={styles.sheetHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale(8) }}>
                  <View
                    style={[
                      styles.typeBadge,
                      {
                        backgroundColor:
                          liveSelectedDebt?.status === 'settled'
                            ? themeColors.inputBg
                            : liveSelectedDebt?.type === 'lent'
                            ? 'rgba(74, 222, 128, 0.15)'
                            : 'rgba(239, 68, 68, 0.15)',
                      },
                    ]}
                  >
                    <Typo
                      size={11}
                      fontWeight="700"
                      color={
                        liveSelectedDebt?.status === 'settled'
                          ? themeColors.textLighter
                          : liveSelectedDebt?.type === 'lent'
                          ? colors.green
                          : colors.rose
                      }
                    >
                      {liveSelectedDebt?.status === 'settled'
                        ? 'SETTLED'
                        : liveSelectedDebt?.type === 'lent'
                        ? 'YOU LENT'
                        : 'YOU BORROWED'}
                    </Typo>
                  </View>

                  {liveSelectedDebt?.syncWithWallet && (
                    <View
                      style={[
                        styles.typeBadge,
                        { backgroundColor: 'rgba(2, 132, 199, 0.15)' },
                      ]}
                    >
                      <Typo size={11} fontWeight="600" color="#0284c7">
                        WALLET SYNCED
                      </Typo>
                    </View>
                  )}
                </View>

                <TouchableOpacity
                  onPress={() => setDetailsModalVisible(false)}
                  style={[styles.closeBtn, { backgroundColor: themeColors.inputBg }]}
                >
                  <Icons.X size={verticalScale(18)} color={themeColors.textLight} weight="bold" />
                </TouchableOpacity>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: verticalScale(20) }}
              >
                {/* Person & Avatar */}
                <View style={styles.personHeader}>
                  <View
                    style={[
                      styles.largeAvatar,
                      {
                        backgroundColor:
                          liveSelectedDebt?.status === 'settled'
                            ? themeColors.inputBg
                            : liveSelectedDebt?.type === 'lent'
                            ? 'rgba(74, 222, 128, 0.15)'
                            : 'rgba(239, 68, 68, 0.15)',
                      },
                    ]}
                  >
                    <Typo
                      size={24}
                      fontWeight="700"
                      color={
                        liveSelectedDebt?.status === 'settled'
                          ? themeColors.textLighter
                          : liveSelectedDebt?.type === 'lent'
                          ? colors.green
                          : colors.rose
                      }
                    >
                      {liveSelectedDebt?.personName?.charAt(0).toUpperCase() || '?'}
                    </Typo>
                  </View>
                  <Typo size={20} fontWeight="700" color={themeColors.text} style={{ marginTop: scale(8) }}>
                    {liveSelectedDebt?.personName}
                  </Typo>
                  {liveSelectedDebt?.date && (
                    <Typo size={12} color={themeColors.textLighter} style={{ marginTop: 2 }}>
                      Recorded on {formatDateShort(liveSelectedDebt.date, true)}
                    </Typo>
                  )}
                </View>

                {/* Balance Progress Box */}
                <View style={[styles.balanceCard, { backgroundColor: themeColors.inputBg }]}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                    <View>
                      <Typo size={12} color={themeColors.textLighter} fontWeight="500">
                        Remaining Balance
                      </Typo>
                      <Typo
                        size={22}
                        fontWeight="700"
                        color={
                          liveSelectedDebt?.status === 'settled'
                            ? themeColors.textLighter
                            : liveSelectedDebt?.type === 'lent'
                            ? colors.green
                            : colors.rose
                        }
                      >
                        {currency}
                        {Number(liveSelectedDebt?.remainingAmount || 0).toFixed(2)}
                      </Typo>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Typo size={12} color={themeColors.textLighter}>
                        Total: {currency}{Number(liveSelectedDebt?.amount || 0).toFixed(2)}
                      </Typo>
                      <Typo size={12} color={colors.green} fontWeight="600">
                        Settled: {currency}{Number(liveSelectedDebt?.settledAmount || 0).toFixed(2)}
                      </Typo>
                    </View>
                  </View>

                  {/* Progress Bar */}
                  <View style={[styles.progressTrack, { backgroundColor: themeColors.card }]}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          backgroundColor:
                            liveSelectedDebt?.status === 'settled'
                              ? colors.green
                              : liveSelectedDebt?.type === 'lent'
                              ? colors.green
                              : colors.rose,
                          width: `${Math.min(
                            100,
                            Math.round(
                              ((Number(liveSelectedDebt?.settledAmount || 0)) /
                                Math.max(1, Number(liveSelectedDebt?.amount || 1))) *
                                100
                            )
                          )}%`,
                        },
                      ]}
                    />
                  </View>
                </View>

                {/* Details Meta Info */}
                <View style={[styles.metaSection, { borderColor: themeColors.border }]}>
                  {liveSelectedDebt?.dueDate && (
                    <View style={styles.metaRow}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale(8) }}>
                        <Icons.CalendarBlank size={verticalScale(16)} color={themeColors.textLighter} />
                        <Typo size={14} color={themeColors.textLight}>Due Date</Typo>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale(6) }}>
                        <Typo size={14} fontWeight="600" color={themeColors.text}>
                          {formatDateShort(liveSelectedDebt.dueDate)}
                        </Typo>
                        {getDueStatus(liveSelectedDebt.dueDate) && (
                          <Typo
                            size={11}
                            fontWeight="600"
                            color={getDueStatus(liveSelectedDebt.dueDate)?.isOverdue ? colors.rose : colors.primary}
                          >
                            ({getDueStatus(liveSelectedDebt.dueDate)?.text})
                          </Typo>
                        )}
                      </View>
                    </View>
                  )}

                  {liveSelectedDebt?.walletId && (
                    <View style={styles.metaRow}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale(8) }}>
                        <Icons.Wallet size={verticalScale(16)} color={themeColors.textLighter} />
                        <Typo size={14} color={themeColors.textLight}>Linked Wallet</Typo>
                      </View>
                      <Typo size={14} fontWeight="600" color={themeColors.text}>
                        {getWalletName(liveSelectedDebt.walletId)}
                      </Typo>
                    </View>
                  )}

                  {liveSelectedDebt?.description ? (
                    <View style={styles.metaRow}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale(8) }}>
                        <Icons.Note size={verticalScale(16)} color={themeColors.textLighter} />
                        <Typo size={14} color={themeColors.textLight}>Note / Purpose</Typo>
                      </View>
                      <Typo size={14} fontWeight="500" color={themeColors.text} style={{ maxWidth: '60%', textAlign: 'right' }}>
                        {liveSelectedDebt.description}
                      </Typo>
                    </View>
                  ) : null}
                </View>

                {/* Attached Receipt Image */}
                {liveSelectedDebt?.image ? (
                  <View style={{ marginTop: spacingY._15 }}>
                    <Typo size={14} fontWeight="600" color={themeColors.text} style={{ marginBottom: spacingY._7 }}>
                      Attached Receipt
                    </Typo>
                    <TouchableOpacity
                      onPress={() => setPreviewReceiptUrl(liveSelectedDebt.image)}
                      activeOpacity={0.8}
                      style={[styles.receiptBox, { backgroundColor: themeColors.inputBg, borderColor: themeColors.border }]}
                    >
                      <Image
                        source={{ uri: liveSelectedDebt.image }}
                        style={styles.receiptThumb}
                        contentFit="cover"
                      />
                      <View style={{ flex: 1, paddingLeft: scale(12) }}>
                        <Typo size={14} fontWeight="600" color={themeColors.text}>
                          Receipt Image
                        </Typo>
                        <Typo size={12} color={colors.primary} style={{ marginTop: 2 }}>
                          Tap to view full screen
                        </Typo>
                      </View>
                      <Icons.MagnifyingGlassPlus size={verticalScale(20)} color={colors.primary} />
                    </TouchableOpacity>
                  </View>
                ) : null}

                {/* Repayment History Timeline */}
                <View style={{ marginTop: spacingY._17 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacingY._10 }}>
                    <Typo size={15} fontWeight="700" color={themeColors.text}>
                      Repayment History
                    </Typo>
                    <Typo size={12} color={themeColors.textLighter}>
                      {(liveSelectedDebt?.settlements || []).length} payment{(liveSelectedDebt?.settlements || []).length === 1 ? '' : 's'}
                    </Typo>
                  </View>

                  {(!liveSelectedDebt?.settlements || liveSelectedDebt.settlements.length === 0) ? (
                    <View style={[styles.emptyHistoryBox, { backgroundColor: themeColors.inputBg }]}>
                      <Icons.ClockCounterClockwise size={verticalScale(24)} color={themeColors.textLighter} />
                      <Typo size={13} color={themeColors.textLighter} style={{ marginTop: scale(6) }}>
                        No repayments recorded yet.
                      </Typo>
                    </View>
                  ) : (
                    liveSelectedDebt.settlements.map((settle, sIdx) => (
                      <View
                        key={settle.id || String(sIdx)}
                        style={[styles.historyRow, { backgroundColor: themeColors.inputBg, borderColor: themeColors.border }]}
                      >
                        <View style={[styles.historyIconBox, {
                          backgroundColor: liveSelectedDebt?.type === 'lent'
                            ? 'rgba(74, 222, 128, 0.15)'
                            : 'rgba(239, 68, 68, 0.15)',
                        }]}>
                          <Icons.CheckCircle
                            size={verticalScale(16)}
                            color={liveSelectedDebt?.type === 'lent' ? colors.green : colors.rose}
                            weight="bold"
                          />
                        </View>
                        <View style={{ flex: 1, paddingLeft: scale(10) }}>
                          <Typo size={14} fontWeight="600" color={themeColors.text}>
                            {liveSelectedDebt?.type === 'lent' ? '+' : '-'}{currency}{Number(settle.amount || 0).toFixed(2)}
                          </Typo>
                          <Typo size={11} color={themeColors.textLighter}>
                            {formatDateShort(settle.date, true)}
                            {settle.walletId ? ` · ${getWalletName(settle.walletId)}` : ''}
                          </Typo>
                          {settle.notes ? (
                            <Typo size={12} color={themeColors.textLight} style={{ marginTop: 2, fontStyle: 'italic' }}>
                              {settle.notes}
                            </Typo>
                          ) : null}
                        </View>
                      </View>
                    ))
                  )}
                </View>
              </ScrollView>

              {/* Action Buttons in Sheet Footer */}
              <View style={[styles.sheetFooter, { borderTopColor: themeColors.border }]}>
                {liveSelectedDebt?.status !== 'settled' && (
                  <TouchableOpacity
                    onPress={() => {
                      if (!liveSelectedDebt) return;
                      handleOpenSettle(liveSelectedDebt);
                    }}
                    style={[styles.primaryActionBtn, { backgroundColor: colors.primary }]}
                  >
                    <Icons.CheckCircleIcon size={verticalScale(16)} color={colors.neutral900} weight="bold" />
                    <Typo size={14} fontWeight="700" color={colors.neutral900}>
                      Settle Repayment
                    </Typo>
                  </TouchableOpacity>
                )}

                {/* Secondary row: always full-width regardless of settled state */}
                <View style={{ flexDirection: 'row', gap: scale(8) }}>
                  {liveSelectedDebt?.status !== 'settled' && (
                    <TouchableOpacity
                      onPress={() => {
                        if (!liveSelectedDebt) return;
                        handleShareReminder(liveSelectedDebt);
                      }}
                      style={[styles.secondaryActionBtn, { flex: 1, backgroundColor: themeColors.inputBg }]}
                    >
                      <Icons.ShareNetwork size={verticalScale(16)} color={themeColors.textLight} weight="bold" />
                      <Typo size={13} fontWeight="600" color={themeColors.textLight}>
                        Remind
                      </Typo>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    onPress={() => {
                      if (!liveSelectedDebt) return;
                      handleNavigateToEdit(liveSelectedDebt);
                    }}
                    style={[styles.secondaryActionBtn, { flex: 1, backgroundColor: themeColors.inputBg }]}
                  >
                    <Icons.PencilSimpleIcon size={verticalScale(16)} color={themeColors.textLight} weight="bold" />
                    <Typo size={13} fontWeight="600" color={themeColors.textLight}>
                      Edit
                    </Typo>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => {
                      if (!liveSelectedDebt) return;
                      handleOpenDelete(liveSelectedDebt);
                    }}
                    style={[styles.secondaryActionBtn, { flex: 1, backgroundColor: 'rgba(239, 68, 68, 0.12)' }]}
                  >
                    <Icons.TrashIcon size={verticalScale(16)} color={colors.rose} weight="bold" />
                    <Typo size={13} fontWeight="600" color={colors.rose}>
                      Delete
                    </Typo>
                  </TouchableOpacity>
                </View>
              </View>
            </Animated.View>
          </View>
        </Modal>

        {/* Full Screen Image Preview Modal */}
        <Modal
          visible={!!previewReceiptUrl}
          transparent
          animationType="fade"
          onRequestClose={() => setPreviewReceiptUrl(null)}
        >
          <View style={styles.imageViewerOverlay}>
            <TouchableOpacity
              style={styles.imageViewerCloseBtn}
              onPress={() => setPreviewReceiptUrl(null)}
            >
              <Icons.X size={verticalScale(24)} color={colors.white} weight="bold" />
            </TouchableOpacity>
            {previewReceiptUrl && (
              <Image
                source={{ uri: previewReceiptUrl }}
                style={styles.fullScreenImage}
                contentFit="contain"
              />
            )}
          </View>
        </Modal>
      </View>

      {/* Floating Action Button — thumb-friendly bottom-right */}
      <Button
        style={styles.floatingButton}
        onPress={() => router.push('/(modals)/debtModal')}
      >
        <Icons.PlusIcon size={verticalScale(24)} color={colors.black} weight="bold" />
      </Button>
    </ModalWrapper>
  );
};

export default DebtsListModal;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacingX._20,
    marginTop: verticalScale(10),
  },
  floatingButton: {
    height: verticalScale(50),
    width: verticalScale(50),
    borderRadius: 100,
    position: 'absolute',
    bottom: verticalScale(30),
    right: verticalScale(20),
    zIndex: 999,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
  },
  summaryCard: {
    padding: spacingX._15,
    borderRadius: radius._15,
    marginTop: spacingY._10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryCol: {
    flex: 1,
  },
  summaryTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
  },
  summaryDivider: {
    width: 1,
    height: verticalScale(35),
    marginHorizontal: scale(15),
  },
  netBanner: {
    marginTop: spacingY._12,
    paddingVertical: verticalScale(6),
    paddingHorizontal: scale(10),
    borderRadius: radius._6,
    alignItems: 'center',
  },
  debtCard: {
    padding: spacingX._15,
    borderRadius: radius._15,
    marginBottom: spacingY._12,
    borderWidth: 1,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  avatar: {
    width: verticalScale(38),
    height: verticalScale(38),
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  typeBadge: {
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(3),
    borderRadius: radius._6,
  },
  dueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
    marginTop: spacingY._7,
    paddingLeft: scale(48),
  },
  cardActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: scale(8),
    marginTop: spacingY._12,
    paddingTop: spacingY._10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(5),
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(6),
    borderRadius: radius._10,
  },
  iconActionBtn: {
    width: verticalScale(30),
    height: verticalScale(30),
    borderRadius: radius._10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  miniProgressTrack: {
    height: 3,
    borderRadius: 2,
    overflow: 'hidden',
  },
  miniProgressFill: {
    height: 3,
    borderRadius: 2,
  },
  emptyContainer: {
    paddingVertical: spacingY._20,
    paddingHorizontal: spacingX._20,
    borderRadius: radius._17,
    alignItems: 'center',
    marginTop: spacingY._15,
  },
  emptyIconBox: {
    width: verticalScale(54),
    height: verticalScale(54),
    borderRadius: 27,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyAddBtn: {
    marginTop: spacingY._15,
    paddingVertical: verticalScale(10),
    paddingHorizontal: scale(20),
    borderRadius: radius._12,
  },
  deleteRefundBox: {
    marginTop: spacingY._10,
    padding: spacingY._10,
    borderRadius: radius._10,
  },
  settleWalletBox: {
    padding: spacingY._10,
    borderRadius: radius._10,
    marginTop: spacingY._5,
  },
  dropdownContainer: {
    height: verticalScale(40),
    borderWidth: 1,
    borderRadius: radius._10,
    paddingHorizontal: spacingX._10,
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  detailsSheet: {
    maxHeight: '88%',
    minHeight: '40%',
    borderTopLeftRadius: radius._20,
    borderTopRightRadius: radius._20,
    borderTopWidth: 1,
    paddingHorizontal: spacingX._20,
    paddingTop: spacingY._5,
  },
  dragHandleArea: {
    alignItems: 'center',
    paddingVertical: spacingY._7,
  },
  dragHandle: {
    width: scale(40),
    height: 4,
    borderRadius: 2,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacingY._10,
  },
  closeBtn: {
    width: verticalScale(32),
    height: verticalScale(32),
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  personHeader: {
    alignItems: 'center',
    marginVertical: spacingY._10,
  },
  largeAvatar: {
    width: verticalScale(55),
    height: verticalScale(55),
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  balanceCard: {
    padding: spacingX._15,
    borderRadius: radius._15,
    marginVertical: spacingY._10,
  },
  progressTrack: {
    height: verticalScale(6),
    borderRadius: 3,
    marginTop: spacingY._12,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  metaSection: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: spacingY._10,
    gap: spacingY._10,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  receiptBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacingX._10,
    borderRadius: radius._12,
    borderWidth: 1,
  },
  receiptThumb: {
    width: verticalScale(45),
    height: verticalScale(45),
    borderRadius: radius._10,
  },
  emptyHistoryBox: {
    padding: spacingY._20,
    borderRadius: radius._12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacingX._12,
    borderRadius: radius._12,
    borderWidth: 1,
    marginBottom: spacingY._7,
  },
  historyIconBox: {
    width: verticalScale(32),
    height: verticalScale(32),
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sheetFooter: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: spacingY._12,
    paddingBottom: spacingY._15,
    gap: spacingY._7,
  },
  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(6),
    height: verticalScale(44),
    borderRadius: radius._12,
  },
  secondaryActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(5),
    height: verticalScale(40),
    borderRadius: radius._12,
  },
  imageViewerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageViewerCloseBtn: {
    position: 'absolute',
    top: verticalScale(50),
    right: spacingX._20,
    zIndex: 10,
    width: verticalScale(40),
    height: verticalScale(40),
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenImage: {
    width: '90%',
    height: '75%',
  },
});
