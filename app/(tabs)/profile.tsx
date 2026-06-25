import {
  Alert,
  StyleSheet,
  Text,
  Touchable,
  TouchableOpacity,
  View,
  ScrollView,
} from "react-native";
import React from "react";
import ScreenWrapper from "@/components/ScreenWrapper";
import { colors, radius, spacingX, spacingY } from "@/constants/theme";
import { verticalScale, scale } from "@/utils/styling";
import Header from "@/components/Header";
import Typo from "@/components/Typo";
import { useAuth } from "@/contexts/authContext";
import Toast from 'react-native-toast-message';
import CustomAlert from "@/components/CustomAlert";
import { Image } from "expo-image";
import { getProfileImage } from "@/services/imageService";
import { accountOptionType } from "@/types";
import * as Icons from "phosphor-react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { signOut } from "firebase/auth";
import { auth } from "@/config/firebase";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { updateUser } from "@/services/userService";
const Profile = () => {
  const { user, updateUserData } = useAuth();
  const router = useRouter();
  const [logoutAlertVisible, setLogoutAlertVisible] = React.useState(false);

  const accountOptions: accountOptionType[] = [
    {
      title: "Edit Profile",
      icon: <Icons.UserIcon size={26} color={colors.white} weight="fill" />,
      routeName: "/(modals)/profileModal",
      bgColor: "#6366f1",
    },

    {
      title: "Settings",
      icon: <Icons.GearSixIcon size={26} color={colors.white} weight="fill" />,
      routeName: "/(modals)/settingsModal",
      bgColor: "#6366f1",
    },

    {
      title: "Manage Subscriptions",
      icon: <Icons.Receipt size={26} color={colors.white} weight="fill" />,
      routeName: "/(modals)/subscriptionsListModal",
      bgColor: "#059669",
    },

    {
      title: "Privacy Policy",
      icon: <Icons.LockIcon size={26} color={colors.white} weight="fill" />,
      routeName: "/(modals)/privacyPolicyModal",
      bgColor: colors.neutral600,
    },

    {
      title: "Terms of Service",
      icon: <Icons.FileTextIcon size={26} color={colors.white} weight="fill" />,
      routeName: "/(modals)/termsOfServiceModal",
      bgColor: colors.neutral600,
    },

    {
      title: "Logout",
      icon: <Icons.SignOutIcon size={26} color={colors.white} weight="fill" />,
      bgColor: "#e11d48",
    },
  ];

  const handleLogout = async () => {
    Toast.show({ type: 'success', text1: 'Logged out', text2: 'You have been successfully logged out.' });
    await signOut(auth);
  };

  const handleImagePick = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled && user?.uid) {
      const selectedImage = result.assets[0];
      const res = await updateUser(user.uid, { ...user, image: selectedImage as any } as any);
      if (res.success) {
        Toast.show({ type: "success", text1: "Avatar updated", text2: "Your profile picture has been changed." });
        updateUserData(user.uid);
      } else {
        Toast.show({ type: "error", text1: "Update failed", text2: res.msg });
      }
    }
  };

  const showLogoutAlert = () => {
    setLogoutAlertVisible(true);
  };

  const confirmLogout = () => {
    setLogoutAlertVisible(false);
    handleLogout();
  }

  const handlePress = (item: accountOptionType) => {
    if (item.title === "Logout") {
      showLogoutAlert();
    }

    if (item.routeName) router.push(item.routeName);
  };

  return (
    <ScreenWrapper>
      <ScrollView 
        contentContainerStyle={[styles.container, { paddingBottom: verticalScale(120) }]}
        showsVerticalScrollIndicator={false}
      >
        <Header title="Profile" style={{ marginVertical: spacingY._10 }} />

        {/* user info */}
        <View style={styles.userInfo}>
          {/* avatar */}
          <TouchableOpacity onPress={handleImagePick} style={styles.avatarContainer}>
            {/* user image */}
            <Image
              source={getProfileImage(user?.image)}
              style={styles.avatar}
              contentFit="cover"
              transition={100}
            />
            <View style={styles.editIcon}>
              <Icons.CameraIcon size={20} color={colors.black} weight="fill" />
            </View>
          </TouchableOpacity>

          {/* name & email */}
          <View style={styles.nameContainer}>
            <Typo size={24} fontWeight={"600"} color={colors.neutral100}>
              {user?.name || "User Name"}
            </Typo>

            <Typo size={15} color={colors.neutral400}>
              {user?.email || "user@example.com"}
            </Typo>
          </View>
        </View>

        {/* account options */}
        <View style={styles.accountOptions}>
          {accountOptions.map((item, index) => {
            return (
              <Animated.View
                entering={FadeInDown.delay(index * 50)
                  .springify()
                  .damping(14)}
                key={index.toString()}
                style={styles.listItem}
              >
                <TouchableOpacity
                  style={styles.flexRow}
                  onPress={() => handlePress(item)}
                >
                  {/* icon */}
                  <View
                    style={[
                      styles.listIcon,
                      {
                        backgroundColor: item?.bgColor,
                      },
                    ]}
                  >
                    {item.icon && item.icon}
                  </View>
                  <Typo size={16} style={{ flex: 1 }} fontWeight={"500"}>
                    {item.title}
                  </Typo>
                  <Icons.CaretRightIcon
                    size={verticalScale(20)}
                    weight="bold"
                    color={colors.white}
                  />
                </TouchableOpacity>
              </Animated.View>
            );
          })}
        </View>

        {/* app version */}
        <View style={styles.versionContainer}>
          <Typo size={12} color={colors.neutral500} style={{ textAlign: "center" }}>
            SpendWise v1.0.0
          </Typo>
        </View>
      </ScrollView>

      <CustomAlert
        visible={logoutAlertVisible}
        title="Confirm Logout"
        message="Are you sure you want to logout?"
        onCancel={() => setLogoutAlertVisible(false)}
        onConfirm={confirmLogout}
        confirmText="Logout"
      />
    </ScreenWrapper>
  );
};

export default Profile;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacingX._20,
  },

  userInfo: {
    marginTop: verticalScale(10),
    alignItems: "center",
    gap: spacingY._15,
  },

  avatarContainer: {
    position: "relative",
    alignSelf: "center",
  },

  avatar: {
    alignSelf: "center",
    backgroundColor: colors.neutral300,
    height: verticalScale(135),
    width: verticalScale(135),
    borderRadius: 200,
  },

  editIcon: {
    position: "absolute",
    bottom: 5,
    right: 8,
    borderRadius: 50,
    backgroundColor: colors.neutral100,
    shadowColor: colors.black,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
    padding: 5,
  },

  nameContainer: {
    gap: verticalScale(4),
    alignItems: "center",
  },

  listIcon: {
    height: verticalScale(44),
    width: verticalScale(44),
    backgroundColor: colors.neutral500,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius._15,
    borderCurve: "continuous",
  },

  listItem: {
    marginBottom: verticalScale(17),
  },

  accountOptions: {
    marginTop: spacingY._35,
  },

  flexRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacingX._10,
  },
  versionContainer: {
    marginTop: spacingY._30,
    marginBottom: spacingY._10,
    alignItems: "center",
  },
});