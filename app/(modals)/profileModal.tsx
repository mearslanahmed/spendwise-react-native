import { StyleSheet, TouchableOpacity, View, ScrollView } from "react-native";
import React, { useEffect, useState } from "react";
import { colors, radius, spacingX, spacingY } from "@/constants/theme";
import { scale, verticalScale } from "@/utils/styling";
import ModalWrapper from "@/components/ModalWrapper";
import Header from "@/components/Header";
import Toast from 'react-native-toast-message';
import BackButton from "@/components/BackButton";
import { Image } from "expo-image";
import { getProfileImage } from "@/services/imageService";

import * as Icon from "phosphor-react-native";
import Typo from "@/components/Typo";
import Input from "@/components/Input";
import { UserDataType } from "@/types";
import Button from "@/components/Button";
import { useAuth } from "@/contexts/authContext";
import { updateUser } from "@/services/userService";
import { useRouter } from "expo-router";
import * as ImagePicker from 'expo-image-picker';
import { auth } from "@/config/firebase";
import { useTheme } from "@/contexts/themeContext";



const ProfileModal = () => {
    const {user, updateUserData} = useAuth();
    const { colors: themeColors } = useTheme();
    const [userData, setUserData] = useState<UserDataType>({
        name: "",
        image: null
    });

    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const isPasswordUser = auth.currentUser?.providerData.some(
        (p) => p.providerId === "password"
    );
    const isGoogleUser = auth.currentUser?.providerData.some(
        (p) => p.providerId === "google.com"
    );

    useEffect(() => {
        setUserData({
            name: user?.name || "",
            image: user?.image || null,
        });
    }, [user]);

    const onPickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (status !== 'granted') {
            Toast.show({ type: 'error', text1: 'Permission required', text2: 'Permission to access the media library is required.' });
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [4, 4],
            quality: 0.5,
        });

        if (!result.canceled && result.assets?.length) {
            const asset = result.assets[0];
            setUserData({ ...userData, image: asset });
        }
    };

    const onSubmit = async () => {
        let { name } = userData;
        if (!name.trim()) {
            Toast.show({ type: 'error', text1: 'User', text2: "Please fill all the fields" });
            return;
        }

        setLoading(true);

        const res = await updateUser(user?.uid as string, userData);
        setLoading(false);
        if (res.success) {
            updateUserData(user?.uid as string);
            Toast.show({ type: 'success', text1: 'Success', text2: 'Profile updated successfully!' });
            router.back();
        } else {
            Toast.show({ type: 'error', text1: 'User', text2: res.msg });
        }
    };
  return (
    <ModalWrapper>
      <View style={styles.container}>
        <Header
          title="Update Profile"
          leftIcon={<BackButton />}
          style={{ marginBottom: spacingY._15, marginTop: spacingY._10 }}
        />

        {/* form */}
        <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
          <View style={styles.avatarContainer}>
            <Image
              style={styles.avatar}
              source={getProfileImage(userData.image)}
              contentFit="cover"
              transition={100}
            />

            <TouchableOpacity onPress={onPickImage} style={styles.editIcon}>
                <Icon.PencilIcon
                    size={verticalScale(20)}
                    color={colors.neutral800}
                />
            </TouchableOpacity>
          </View>

          <View style={styles.inputContainer}>
            {/* Name Input */}
            <Typo color={colors.neutral200}>Name</Typo>
            <Input
                placeholder="Name"
                value={userData.name}
                onChangeText={(value: string) => 
                    setUserData({...userData, name: value})
                }
            />
          </View>

          {/* Email Address (Read-only) */}
          <View style={styles.inputContainer}>
            <Typo color={colors.neutral200}>Email Address</Typo>
            <Input
                value={user?.email || ""}
                editable={false}
                containerStyle={{ backgroundColor: themeColors.inputBg, opacity: 0.6 }}
            />
          </View>

          {isPasswordUser && !isGoogleUser && (
            <View style={styles.inputContainer}>
              <Typo color={colors.neutral200}>Security</Typo>
              <TouchableOpacity
                style={[
                  styles.passwordButton,
                  {
                    backgroundColor: themeColors.inputBg,
                    borderColor: themeColors.border,
                  }
                ]}
                onPress={() => router.push("/(modals)/changePasswordModal")}
              >
                <Icon.LockIcon size={20} color={themeColors.textLighter} />
                <Typo size={15} color={themeColors.textLighter} style={{ flex: 1, marginLeft: scale(10) }}>
                  Change Password
                </Typo>
                <Icon.CaretRightIcon size={20} color={themeColors.textLighter} />
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </View>
      <View style={[styles.footer, { borderTopColor: themeColors.border }]}>
        <Button onPress={onSubmit} loading={loading} style={{flex: 1}}>
          <Typo color={colors.black} fontWeight={"700"}>Update</Typo>
        </Button>
      </View>
    </ModalWrapper>
  );
};

export default ProfileModal;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "space-between",
    paddingHorizontal: spacingY._20,
  },
  footer: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    paddingHorizontal: spacingX._20,
    gap: scale(12),
    paddingTop: spacingY._15,
    borderTopColor: colors.neutral700,
    marginBottom: spacingY._5,
    borderTopWidth: 1,
  },

  form: {
    gap: spacingY._30,
    marginTop: spacingY._15,
    paddingBottom: spacingY._30,
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
    borderWidth: 1,
    borderColor: colors.neutral500,
  },

  editIcon: {
    position: "absolute",
    bottom: spacingY._5,
    right: spacingY._7,
    borderRadius: 100,
    backgroundColor: colors.neutral100,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
    padding: spacingY._7,
  },

  inputContainer: {
    gap: spacingY._10,
  },
  passwordButton: {
    flexDirection: 'row',
    height: verticalScale(54),
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.neutral300,
    borderRadius: radius._17,
    borderCurve: 'continuous',
    paddingHorizontal: spacingX._15,
    backgroundColor: colors.neutral800,
  },
});
