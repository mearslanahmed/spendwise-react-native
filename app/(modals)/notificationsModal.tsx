import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import React, { useState } from "react";
import { Swipeable } from "react-native-gesture-handler";
import { colors, spacingX, spacingY, radius } from "@/constants/theme";
import { verticalScale } from "@/utils/styling";
import ModalWrapper from "@/components/ModalWrapper";
import Header from "@/components/Header";
import BackButton from "@/components/BackButton";
import * as Icon from "phosphor-react-native";
import Typo from "@/components/Typo";
import { useAuth } from "@/contexts/authContext";
import { useData } from "@/contexts/dataContext";
import { useTheme } from "@/contexts/themeContext";
import { deleteAllNotifications, deleteNotification, markAllAsRead, markAsRead } from "@/services/notificationService";
import CustomAlert from "@/components/CustomAlert";
import { resolveDate, formatDateShort } from "@/utils/dateHelper";

const NotificationsModal = () => {
  const { user } = useAuth();
  const { notifications } = useData();
  const { colors: themeColors } = useTheme();

  // Optionally keep the automatic mark as read, but let's give users a manual button too
  const handleMarkAllAsRead = async () => {
    if (user?.uid) {
      await markAllAsRead(user.uid);
    }
  };

  const formatDate = (date: any) => {
    const d = resolveDate(date);
    
    // Time formatting
    let h = d.getHours();
    const m = String(d.getMinutes()).padStart(2, '0');
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    h = h ? h : 12;
    const timeStr = `${h}:${m} ${ampm}`;

    // Date comparison
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const targetDate = new Date(d);
    targetDate.setHours(0, 0, 0, 0);

    if (targetDate.getTime() === today.getTime()) {
      return timeStr; // Just show time for Today
    } else if (targetDate.getTime() === yesterday.getTime()) {
      return `Yesterday at ${timeStr}`;
    }
    
    const shortDate = formatDateShort(d, false);
    return `${shortDate} at ${timeStr}`;
  };

  const [deleteAlertVisible, setDeleteAlertVisible] = useState(false);
  const [deleteAllAlertVisible, setDeleteAllAlertVisible] = useState(false);
  const [selectedNotificationId, setSelectedNotificationId] = useState<string | null>(null);

  const handleDelete = (id?: string) => {
    if (!id) return;
    setSelectedNotificationId(id);
    setDeleteAlertVisible(true);
  };

  const confirmDelete = async () => {
    if (!selectedNotificationId) return;
    setDeleteAlertVisible(false);
    await deleteNotification(selectedNotificationId);
  };

  const confirmDeleteAll = async () => {
    if (user?.uid) {
      setDeleteAllAlertVisible(false);
      await deleteAllNotifications(user.uid);
    }
  };

  const renderIcon = (type: string) => {
    switch (type) {
      case 'budget_alert':
        return <Icon.WarningCircleIcon size={24} color={colors.rose} weight="fill" />;
      case 'reminder':
        return <Icon.ClockIcon size={24} color={colors.primary} weight="fill" />;
      default:
        return <Icon.InfoIcon size={24} color={themeColors.textLighter} weight="fill" />;
    }
  };

  const renderRightActions = (id: string) => {
    return (
      <TouchableOpacity 
        style={styles.swipeDeleteAction} 
        onPress={() => handleDelete(id)}
      >
        <Icon.TrashIcon size={24} color={colors.white} weight="fill" />
      </TouchableOpacity>
    );
  };

  const groupNotifications = (notifs: any[]) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const lastWeek = new Date(today);
    lastWeek.setDate(lastWeek.getDate() - 7);

    const groups = {
      'Today': [] as any[],
      'Yesterday': [] as any[],
      'This Week': [] as any[],
      'Older': [] as any[]
    };

    notifs.forEach(n => {
      const d = resolveDate(n.createdAt);
      d.setHours(0, 0, 0, 0);
      if (d.getTime() === today.getTime()) {
        groups['Today'].push(n);
      } else if (d.getTime() === yesterday.getTime()) {
        groups['Yesterday'].push(n);
      } else if (d.getTime() > lastWeek.getTime()) {
        groups['This Week'].push(n);
      } else {
        groups['Older'].push(n);
      }
    });

    return Object.entries(groups).filter(([_, items]) => items.length > 0);
  };
  const handleNotificationTap = async (item: any) => {
    if (!item.read && item.id) {
      await markAsRead(item.id);
    }
  };

  return (
    <ModalWrapper>
      <View style={styles.container}>
        <Header
          title="Notifications"
          leftIcon={<BackButton />}
          style={{ marginBottom: spacingY._15, marginTop: spacingY._10 }}
          rightIcon={
            notifications.length > 0 ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                {notifications.some(n => !n.read) && (
                  <TouchableOpacity onPress={handleMarkAllAsRead} style={styles.headerActionBtn}>
                    <Icon.ChecksIcon size={22} color={colors.primary} weight="bold" />
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => setDeleteAllAlertVisible(true)} style={styles.headerActionBtn}>
                  <Icon.TrashIcon size={22} color={themeColors.textLighter} weight="bold" />
                </TouchableOpacity>
              </View>
            ) : null
          }
        />

        <ScrollView contentContainerStyle={styles.listContainer} showsVerticalScrollIndicator={false}>
          {notifications.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Icon.BellZIcon size={verticalScale(50)} color={themeColors.textLighter} weight="light" />
              <Typo size={16} color={themeColors.textLighter} style={{ marginTop: spacingY._10 }}>
                You have no notifications yet!
              </Typo>
            </View>
          ) : (
            groupNotifications(notifications).map(([groupName, items]) => (
              <View key={groupName} style={{ marginBottom: spacingY._20 }}>
                <Typo size={16} fontWeight="700" color={themeColors.text} style={{ marginBottom: spacingY._15 }}>
                  {groupName}
                </Typo>
                <View style={{ gap: spacingY._10 }}>
                  {items.map((item) => (
                    <Swipeable
                      key={item.id}
                      renderRightActions={() => renderRightActions(item.id!)}
                      overshootRight={false}
                      containerStyle={{ width: '100%' }}
                    >
                      <TouchableOpacity 
                        activeOpacity={0.7}
                        onPress={() => handleNotificationTap(item)}
                        style={[
                          styles.notificationCard, 
                          !item.read && styles.unreadCard
                        ]}
                      >
                        <View style={[
                            styles.iconContainer, 
                            { backgroundColor: themeColors.inputBg }
                        ]}>
                          {renderIcon(item.type)}
                        </View>
                        <View style={styles.textContainer}>
                          <View style={styles.titleRow}>
                            <Typo size={16} fontWeight="600" color={themeColors.text} style={{ flex: 1 }}>
                              {item.title}
                            </Typo>
                          </View>
                          <Typo size={12} color={themeColors.textLighter} style={{ marginTop: 2 }}>
                            {formatDate(item.createdAt)}
                          </Typo>
                          <Typo size={14} color={themeColors.textLighter} style={{ marginTop: 6 }}>
                            {item.message}
                          </Typo>
                        </View>
                      </TouchableOpacity>
                    </Swipeable>
                  ))}
                </View>
              </View>
            ))
          )}
        </ScrollView>
      </View>
      
      <CustomAlert
        visible={deleteAlertVisible}
        title="Delete Notification"
        message="Are you sure you want to delete this notification?"
        onCancel={() => setDeleteAlertVisible(false)}
        onConfirm={confirmDelete}
        confirmText="Delete"
      />

      <CustomAlert
        visible={deleteAllAlertVisible}
        title="Clear All Notifications"
        message="Are you sure you want to delete all notifications? This action cannot be undone."
        onCancel={() => setDeleteAllAlertVisible(false)}
        onConfirm={confirmDeleteAll}
        confirmText="Clear All"
      />
    </ModalWrapper>
  );
};

export default NotificationsModal;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacingX._20,
  },
  listContainer: {
    paddingBottom: verticalScale(40),
    marginTop: spacingY._10,
  },
  notificationCard: {
    width: '100%',
    flexDirection: 'row',
    paddingVertical: spacingY._10,
    paddingHorizontal: spacingX._10,
    borderRadius: radius._12,
    alignItems: 'flex-start',
    position: 'relative',
  },
  unreadCard: {
    backgroundColor: "rgba(163, 230, 53, 0.1)",
  },
  unreadDot: {
    // Unused now, keeping for reference
  },
  iconContainer: {
    width: verticalScale(40),
    height: verticalScale(40),
    borderRadius: verticalScale(20),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacingX._12,
  },
  textContainer: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacingX._10,
  },
  deleteBtn: {
    paddingLeft: spacingX._10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  swipeDeleteAction: {
    backgroundColor: colors.rose,
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    borderRadius: radius._15,
    marginVertical: spacingY._5,
    marginLeft: spacingX._10,
  },
  markReadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: "rgba(74, 222, 128, 0.15)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: verticalScale(100),
  },
  headerActionBtn: {
    padding: spacingX._5,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacingY._10,
    marginTop: spacingY._5,
  }
});
