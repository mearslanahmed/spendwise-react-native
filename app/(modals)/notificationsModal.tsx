import { Alert, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import React, { useEffect, useState } from "react";
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
import { deleteNotification, markAllAsRead } from "@/services/notificationService";
import { Timestamp } from "firebase/firestore";

const NotificationsModal = () => {
  const { user } = useAuth();
  const { notifications } = useData();
  const { colors: themeColors, isDark } = useTheme();

  // Mark all as read when the modal opens
  useEffect(() => {
    if (user?.uid) {
      const hasUnread = notifications.some(n => !n.read);
      if (hasUnread) {
        markAllAsRead(user.uid);
      }
    }
  }, [user?.uid, notifications]);

  const handleDelete = async (id?: string) => {
    if (!id) return;
    Alert.alert("Delete", "Are you sure you want to delete this notification?", [
      { text: "Cancel", style: "cancel" },
      { 
        text: "Delete", 
        style: "destructive",
        onPress: async () => {
          await deleteNotification(id);
        }
      }
    ]);
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
          style={{ marginBottom: spacingY._10 }}
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
            notifications.map((item) => (
              <View 
                key={item.id} 
                style={[
                  styles.notificationCard, 
                  { backgroundColor: themeColors.card, borderColor: themeColors.border },
                  !item.read && { borderColor: colors.primary, borderWidth: 1 }
                ]}
              >
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
    </ModalWrapper>
  );
};

export default NotificationsModal;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacingY._20,
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
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'flex-start',
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
    marginLeft: spacingX._10,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: verticalScale(100),
  }
});
