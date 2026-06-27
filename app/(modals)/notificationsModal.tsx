import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import React, { useState } from "react";
import { colors, spacingX, spacingY, radius } from "@/constants/theme";
import { scale, verticalScale } from "@/utils/styling";
import ModalWrapper from "@/components/ModalWrapper";
import Header from "@/components/Header";
import BackButton from "@/components/BackButton";
import * as Icon from "phosphor-react-native";
import Typo from "@/components/Typo";
import { useAuth } from "@/contexts/authContext";
import { useData } from "@/contexts/dataContext";
import { useTheme } from "@/contexts/themeContext";
import { deleteAllNotifications, deleteNotification, markAllAsRead } from "@/services/notificationService";
import { Timestamp } from "firebase/firestore";
import CustomAlert from "@/components/CustomAlert";

const NotificationsModal = () => {
  const { user } = useAuth();
  const { notifications } = useData();
  const { colors: themeColors, isDark } = useTheme();

  // Optionally keep the automatic mark as read, but let's give users a manual button too
  const handleMarkAllAsRead = async () => {
    if (user?.uid) {
      await markAllAsRead(user.uid);
    }
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

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
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
              <TouchableOpacity onPress={() => setDeleteAllAlertVisible(true)} style={styles.headerActionBtn}>
                <Icon.TrashIcon size={22} color={colors.rose} weight="bold" />
              </TouchableOpacity>
            ) : null
          }
        />

        {notifications.length > 0 && notifications.some(n => !n.read) && (
          <View style={styles.listHeader}>
            <Typo size={14} color={themeColors.textLighter}>You have unread notifications</Typo>
            <TouchableOpacity onPress={handleMarkAllAsRead}>
              <Typo size={14} color={colors.primary} fontWeight="600">Mark all as read</Typo>
            </TouchableOpacity>
          </View>
        )}

        <ScrollView contentContainerStyle={styles.listContainer} showsVerticalScrollIndicator={false}>
          {notifications.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Icon.BellZIcon size={verticalScale(50)} color={themeColors.textLighter} weight="light" />
              <Typo size={16} color={themeColors.textLighter} style={{ marginTop: spacingY._10 }}>
                You have no notifications yet!
              </Typo>
            </View>
          ) : (
            notifications.map((item) => (
              <View 
                key={item.id} 
                style={[
                  styles.notificationCard, 
                  { backgroundColor: themeColors.card },
                  !item.read && styles.unreadCard
                ]}
              >
                {!item.read && <View style={styles.unreadDot} />}
                <View style={styles.iconContainer}>
                  {renderIcon(item.type)}
                </View>
                <View style={styles.textContainer}>
                  <View style={styles.titleRow}>
                    <Typo size={16} fontWeight="600" color={themeColors.text} style={{ flex: 1 }}>
                      {item.title}
                    </Typo>
                    <Typo size={12} color={themeColors.textLighter}>
                      {formatDate(item.createdAt)}
                    </Typo>
                  </View>
                  <Typo size={14} color={themeColors.textLighter} style={{ marginTop: 4 }}>
                    {item.message}
                  </Typo>
                </View>
                <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.deleteBtn}>
                  <Icon.TrashIcon size={20} color={colors.rose} />
                </TouchableOpacity>
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
    paddingHorizontal: spacingX._25,
  },
  listContainer: {
    paddingBottom: verticalScale(40),
    gap: spacingY._15,
    marginTop: spacingY._10,
  },
  notificationCard: {
    flexDirection: 'row',
    padding: spacingY._15,
    borderRadius: radius._15,
    alignItems: 'flex-start',
    position: 'relative',
  },
  unreadCard: {
    // Removed background tint to match seen notifications UI
  },
  unreadDot: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  iconContainer: {
    marginRight: spacingX._15,
    marginTop: 2,
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
