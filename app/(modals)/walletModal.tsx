import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import React, { useEffect, useState } from "react";
import { colors, spacingX, spacingY } from "@/constants/theme";
import { scale, verticalScale } from "@/utils/styling";
import ModalWrapper from "@/components/ModalWrapper";
import Header from "@/components/Header";
import BackButton from "@/components/BackButton";
import { Image } from "expo-image";
import { getProfileImage } from "@/services/imageService";
import { ScrollView } from "react-native";
import * as Icon from "phosphor-react-native";
import Typo from "@/components/Typo";
import Input from "@/components/Input";
import { UserDataType, WalletType } from "@/types";
import Button from "@/components/Button";
import { useAuth } from "@/contexts/authContext";
import { updateUser } from "@/services/userService";
import { useRouter } from "expo-router";
import * as ImagePicker from 'expo-image-picker';
import ImageUpload from "@/components/ImageUpload";


const WalletModal = () => {
    const {user, updateUserData} = useAuth();
    const[wallet, setWallet] = useState<WalletType>({
        name: "",
        image: null
    });

    const [loading, setLoading] = useState(false);
    const router = useRouter();


    const onPickImage = async () => {
    // No permissions request is necessary for launching the image library.
    // Manually request permissions for videos on iOS when `allowsEditing` is set to `false`
    // and `videoExportPreset` is `'Passthrough'` (the default), ideally before launching the picker
    // so the app users aren't surprised by a system dialog after picking a video.
    // See "Invoke permissions for videos" sub section for more details.
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      Alert.alert('Permission required', 'Permission to access the media library is required.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    console.log(result);

    if (!result.canceled && result.assets?.length) {
      const asset = result.assets[0];
    //   setUserData({ ...userData, image: asset.uri });
    }
  };

    const onSubmit = async () => {
        // handle profile update logic here
        let {name, image} = wallet;
        if(!name.trim() || !image) {
            Alert.alert("User", "Please fill all the fields");
            return;
        }
        setLoading(true);
        const res = await updateUser(user?.uid as string, wallet);
        setLoading(false);
        if(res.success) {
            updateUserData(user?.uid as string);
            router.back();
        }else{
            Alert.alert("User", res.msg);
        }
    }
  return (
    <ModalWrapper>
      <View style={styles.container}>
        <Header
          title="New Wallet"
          leftIcon={<BackButton />}
          style={{ marginBottom: spacingY._10 }}
        />

        {/* form */}
        <ScrollView contentContainerStyle={styles.form}>
          <View style={styles.inputContainer}>
            {/* Name Input */}
            <Typo color={colors.neutral200}>Wallet Name</Typo>
            <Input
                placeholder="Salary, Cash, etc."
                value={wallet.name}
                onChangeText={(value: string) => 
                    setWallet({...wallet, name: value})
                }
            />
            </View>

            <View style={styles.inputContainer}>
            {/* Name Input */}
            <Typo color={colors.neutral200}>Wallet Icon</Typo>
            <ImageUpload 
                file={wallet.image}
                onClear={() => setWallet({ ...wallet, image: null})}
                onSelect={(file) => setWallet({...wallet, image: file})}
                placeholder="Upload Image"
             />
            </View>
        </ScrollView>
      </View>
        <View style={styles.footer}>
            <Button onPress={onSubmit} loading={loading} style={{flex: 1}}>
                <Typo color={colors.black} fontWeight={"700"}>Add Wallet</Typo>
            </Button>
        </View>
    </ModalWrapper>
  );
};

export default WalletModal;

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
});
