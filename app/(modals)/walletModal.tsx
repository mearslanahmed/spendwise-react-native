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
import { useLocalSearchParams, useRouter } from "expo-router";
import ImageUpload from "@/components/ImageUpload";
import { CreateOrUpdateWallet, deleteWallet } from "@/services/walletService";
import Toast from 'react-native-toast-message';
import CustomAlert from "@/components/CustomAlert";

const WalletModal = () => {
  const { user } = useAuth();
  const [wallet, setWallet] = useState<WalletType>({
    name: "",
    image: null,
  });

  const [loading, setLoading] = useState(false);
  const [deleteAlertVisible, setDeleteAlertVisible] = useState(false);
  const router = useRouter();

  const oldWallet: {name: string; image: string; id: string} = 
    useLocalSearchParams();

    useEffect(() => {
        if (oldWallet?.id) {
          setWallet({
            name: oldWallet?.name,
            image: oldWallet?.image,
          });
        }
    },[])


  const onSubmit = async () => {
    // handle profile update logic here
    let { name, image } = wallet;
    if (!wallet.name || !wallet.image) {
      Toast.show({ type: 'error', text1: 'Wallet', text2: "Please fill all the fields" });
      return;
    }

    const data: WalletType = {
      name,
      image,
      uid: user?.uid,
    };

    if(oldWallet?.id) data.id = oldWallet?.id;
    setLoading(true);
    const res = await CreateOrUpdateWallet(data);
    setLoading(false);
    if (res.success) {
      router.back();
    } else {
      Toast.show({ type: 'error', text1: 'Wallet', text2: res.msg });
    }
  };

  const onDelete = async () => {
    if(!oldWallet?.id) return;
    setDeleteAlertVisible(false);
    setLoading(true);
    const res = await deleteWallet(oldWallet?.id);
    setLoading(false);
    if (res.success) {
      router.back();
    } else {
      Toast.show({ type: 'error', text1: 'Wallet', text2: res.msg });
    }
  };

  const showDeleteAlert = () => {
    setDeleteAlertVisible(true);
  }

  return (
    <ModalWrapper>
      <View style={styles.container}>
        <Header
          title={oldWallet?.id ? "Update Wallet" : "New Wallet"}
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
                setWallet({ ...wallet, name: value })
              }
            />
          </View>

          <View style={styles.inputContainer}>
            {/* Name Input */}
            <Typo color={colors.neutral200}>Wallet Icon</Typo>
            <ImageUpload
              file={wallet.image}
              onClear={() => setWallet({ ...wallet, image: null })}
              onSelect={(file) => setWallet({ ...wallet, image: file })}
              placeholder="Upload Image"
            />
          </View>
        </ScrollView>
      </View>
      <View style={styles.footer}>
        {oldWallet?.id && !loading && (
            <Button
                onPress={showDeleteAlert}
                style={{
                    backgroundColor: colors.rose,
                    paddingHorizontal: spacingX._15,
                }}
            >
                <Icon.TrashIcon
                    size={verticalScale(24)}
                    color={colors.white}
                    weight="bold"
                />
            </Button>
         )}
        <Button onPress={onSubmit} loading={loading} style={{ flex: 1 }}>
          <Typo color={colors.black} fontWeight={"700"}>
            {
              oldWallet?.id ? "Update Wallet" : "Add Wallet"
            }
          </Typo>
        </Button>
      </View>

      <CustomAlert
        visible={deleteAlertVisible}
        title="Delete Wallet?"
        message="This action will permanently delete this wallet and all its transactions."
        onCancel={() => setDeleteAlertVisible(false)}
        onConfirm={onDelete}
        confirmText="Delete"
        loading={loading}
      />
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
