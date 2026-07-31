import {
  StyleSheet,
  TouchableOpacity,
  View,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import React from "react";
import ScreenWrapper from "@/components/ScreenWrapper";
import { colors, radius, spacingX, spacingY } from "@/constants/theme";
import { verticalScale } from "@/utils/styling";
import Header from "@/components/Header";
import Typo from "@/components/Typo";
import { useAuth } from "@/contexts/authContext";
import { useTheme } from "@/contexts/themeContext";
import Toast from 'react-native-toast-message';
import CustomAlert from "@/components/CustomAlert";
import { Image } from "expo-image";
import { getProfileImage } from "@/services/imageService";
import { accountOptionType } from "@/types";
import * as Icons from "phosphor-react-native";
import Constants from 'expo-constants';
import Animated, { FadeInDown } from "react-native-reanimated";
import { signOut } from "firebase/auth";
import { auth } from "@/config/firebase";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { updateUser } from "@/services/userService";
import * as WebBrowser from 'expo-web-browser';
import * as Network from 'expo-network';

let GoogleSignin: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  GoogleSignin = require('@react-native-google-signin/google-signin').GoogleSignin;
} catch {}
const Profile = () => {
  const { user, updateUserData } = useAuth();
  const { colors: themeColors } = useTheme();
  const router = useRouter();
  const [logoutAlertVisible, setLogoutAlertVisible] = React.useState(false);

  const [loading] = React.useState(false);

  const accountGroup: accountOptionType[] = [
    { title: "Edit Profile", icon: <Icons.UserIcon size={24} color={colors.black} weight="fill" />, routeName: "/(modals)/profileModal", bgColor: colors.primary },
    { title: "Settings", icon: <Icons.GearSixIcon size={24} color={colors.black} weight="fill" />, routeName: "/(modals)/settingsModal", bgColor: colors.primary },
  ];

  const financeGroup: accountOptionType[] = [
    { title: "Bills & Subscriptions", icon: <Icons.Receipt size={24} color={colors.white} weight="fill" />, routeName: "/(modals)/subscriptionsListModal", bgColor: "#059669" },
  ];

  const supportGroup: accountOptionType[] = [
    { title: "Help Center", icon: <Icons.Question size={24} color={colors.white} weight="fill" />, routeName: "/(modals)/helpCenterModal", bgColor: colors.neutral500 },
    { title: "Contact Us", icon: <Icons.Headset size={24} color={colors.white} weight="fill" />, url: "mailto:spendwiseofficial@gmail.com", bgColor: colors.neutral500 },
    { title: "Visit Official Website", icon: <Icons.GlobeIcon size={24} color={colors.white} weight="fill" />, url: "https://spendwiseapp.tech", bgColor: colors.neutral500 },
    { title: "Privacy Policy", icon: <Icons.LockIcon size={24} color={colors.white} weight="fill" />, url: "https://spendwiseapp.tech/privacy", bgColor: colors.neutral500 },
    { title: "Terms of Service", icon: <Icons.FileTextIcon size={24} color={colors.white} weight="fill" />, url: "https://spendwiseapp.tech/terms", bgColor: colors.neutral500 },
  ];

  const dangerGroup: accountOptionType[] = [
    { title: "Logout", icon: <Icons.SignOutIcon size={24} color={colors.white} weight="fill" />, bgColor: colors.rose },
  ];

  const handleLogout = async () => {
    Toast.show({ type: 'success', text1: 'Logged out', text2: 'You have been successfully logged out.' });
    if (GoogleSignin) {
      try { await GoogleSignin.signOut(); } catch {}
    }
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

  const handlePress = async (item: accountOptionType) => {
    if (item.title === "Logout") {
      showLogoutAlert();
    } else if (item.url) {
      if (item.url.startsWith("mailto:")) {
        await WebBrowser.openBrowserAsync(item.url);
      } else {
        const networkState = await Network.getNetworkStateAsync();
        if (!networkState.isConnected) {
          Toast.show({ type: 'error', text1: 'Offline', text2: 'Internet connection is required to view documents.' });
          return;
        }
        await WebBrowser.openBrowserAsync(item.url);
      }
    } else if (item.routeName) {
      router.push(item.routeName);
    }
  };

  const renderListCard = (items: accountOptionType[], indexOffset: number = 0) => {
    return (
      <Animated.View entering={FadeInDown.delay(indexOffset * 100).duration(400)} style={[styles.cardGroup, { backgroundColor: themeColors.card }]}>
        {items.map((item, index) => (
          <View key={item.title}>
            <TouchableOpacity
              style={styles.flexRow}
              onPress={() => handlePress(item)}
              activeOpacity={0.7}
            >
              <View style={[styles.listIcon, { backgroundColor: item?.bgColor }]}>
                {item.icon}
              </View>
              <Typo size={16} style={{ flex: 1 }} color={item.title === 'Logout' ? colors.rose : themeColors.text} fontWeight="500">
                {item.title}
              </Typo>
              {item.title !== 'Logout' && (
                <Icons.CaretRightIcon size={verticalScale(18)} weight="bold" color={themeColors.textLighter} />
              )}
            </TouchableOpacity>
            {index < items.length - 1 && (
              <View style={[styles.separator, { backgroundColor: themeColors.border }]} />
            )}
          </View>
        ))}
      </Animated.View>
    );
  };

  return (
    <ScreenWrapper>
      <ScrollView 
        contentContainerStyle={[styles.container, { paddingBottom: verticalScale(120) }]}
        showsVerticalScrollIndicator={false}
      >
        <Header title="Profile" style={{ marginVertical: spacingY._10 }} />

        {/* user info */}
        <Animated.View entering={FadeInDown.duration(400)} style={styles.userInfo}>
          <TouchableOpacity onPress={handleImagePick} style={styles.avatarContainer}>
            <Image
              source={getProfileImage(user?.image)}
              style={styles.avatar}
              contentFit="cover"
              transition={100}
            />
            <View style={[styles.editIcon, { backgroundColor: themeColors.card, borderColor: themeColors.background, borderWidth: 4 }]}>
              <Icons.CameraIcon size={20} color={themeColors.text} weight="fill" />
            </View>
          </TouchableOpacity>
          <View style={styles.nameContainer}>
            <Typo size={24} fontWeight={"600"} color={themeColors.text}>
              {user?.name || "Finance Tracker"}
            </Typo>
            <Typo size={15} color={themeColors.textLighter}>
              {user?.email || "Tap Edit Profile to setup"}
            </Typo>
          </View>
        </Animated.View>

        {/* account options */}
        <View style={styles.accountOptions}>
          {renderListCard(accountGroup, 2)}
          {renderListCard(financeGroup, 3)}
          {renderListCard(supportGroup, 4)}
          {renderListCard(dangerGroup, 5)}
        </View>

        {/* app version */}
        <View style={styles.versionContainer}>
          <Typo size={12} color={colors.neutral500} style={{ textAlign: "center" }}>
            SpendWise v{Constants.expoConfig?.version || "1.0.0"}
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

      {loading && (
        <View style={styles.loaderOverlay}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}
    </ScreenWrapper>
  );
};

export default Profile;

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacingX._20,
  },

  userInfo: {
    marginTop: verticalScale(10),
    alignItems: "center",
    gap: spacingY._15,
  },
  loaderOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
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
    height: verticalScale(38),
    width: verticalScale(38),
    backgroundColor: colors.neutral500,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius._12,
    borderCurve: "continuous",
  },

  accountOptions: {
    marginTop: spacingY._30,
  },
  
  cardGroup: {
    borderRadius: radius._15,
    overflow: 'hidden',
    marginBottom: spacingY._20,
    borderCurve: "continuous",
  },

  separator: {
    height: 1,
    marginLeft: verticalScale(56), // aligns with text
  },

  flexRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacingY._12,
    paddingHorizontal: spacingX._15,
    gap: spacingX._12,
  },
  
  versionContainer: {
    marginTop: spacingY._30,
    marginBottom: spacingY._10,
    alignItems: "center",
  },
});