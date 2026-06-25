import { Alert, StyleSheet, Text, TouchableOpacity, View, Pressable } from "react-native";
import React, { useEffect, useState } from "react";
import { colors, radius, spacingX, spacingY } from "@/constants/theme";
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
import { CreateOrUpdateWallet, deleteWallet } from "@/services/walletService";
import Toast from 'react-native-toast-message';
import CustomAlert from "@/components/CustomAlert";
import { useTheme } from "@/contexts/themeContext";
import { walletPresets } from "@/constants/data";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming } from "react-native-reanimated";

const PresetCardItem = ({
  preset,
  isSelected,
  onPress,
  themeColors
}: {
  preset: any;
  isSelected: boolean;
  onPress: () => void;
  themeColors: any;
}) => {
  const scaleVal = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scaleVal.value }],
    };
  });

  const handlePressIn = () => {
    scaleVal.value = withTiming(0.95, { duration: 100 });
  };

  const handlePressOut = () => {
    scaleVal.value = withSpring(isSelected ? 1.03 : 1, { damping: 12 });
  };

  const IconComponent = preset.icon;

  return (
    <Animated.View style={[
      styles.presetItem,
      isSelected ? { borderColor: colors.primary } : { borderColor: themeColors.border },
      animatedStyle
    ]}>
      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={onPress}
        style={{ flex: 1 }}
      >
        <LinearGradient
          colors={preset.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.presetGradient}
        >
          <View style={styles.miniCardHeader}>
            <LinearGradient
              colors={["#FFE082", "#FFB300"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.miniCardChip}
            />
            <IconComponent size={verticalScale(16)} color={colors.white} weight="bold" />
          </View>
          <View style={styles.miniCardFooter}>
            <Typo size={11} fontWeight="600" color={colors.white} textProps={{ numberOfLines: 1 }}>
              {preset.label}
            </Typo>
          </View>
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
};

const WalletModal = () => {
  const { user } = useAuth();
  const { colors: themeColors } = useTheme();
  const [wallet, setWallet] = useState<WalletType>({
    name: "",
    image: null,
  });

  const [loading, setLoading] = useState(false);
  const [deleteAlertVisible, setDeleteAlertVisible] = useState(false);
  const router = useRouter();

  const isPreset = typeof wallet.image === "string" && wallet.image.startsWith("preset_");
  const activePreset = isPreset ? (walletPresets[wallet.image] || walletPresets.preset_bank) : null;
  const previewGradient = (activePreset ? activePreset.gradient : ["#475569", "#1e293b"]) as unknown as readonly [string, string, ...string[]];
  const PreviewIcon = activePreset ? activePreset.icon : Icon.CreditCardIcon;
  const previewBg = activePreset ? activePreset.bgColor : colors.neutral600;

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
        <ScrollView contentContainerStyle={styles.form} showsVerticalScrollIndicator={false}>

          {/* Live Card Preview */}
          <View style={styles.previewContainer}>
            <View style={styles.previewCardWrapper}>
              <LinearGradient
                colors={previewGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.previewCardGradient}
              >
                <View style={styles.previewCardHeader}>
                  <View>
                    <Typo size={12} color="rgba(255, 255, 255, 0.7)" fontWeight="500">
                      BALANCE
                    </Typo>
                    <Typo size={22} color={colors.white} fontWeight="700" style={{ marginTop: 2 }}>
                      {user?.currency || "$"}{"0.00"}
                    </Typo>
                  </View>
                  <View style={[styles.previewCardLogoContainer, { backgroundColor: previewBg }]}>
                    {activePreset ? (
                      <PreviewIcon size={verticalScale(18)} color={activePreset.color} weight="bold" />
                    ) : (
                      wallet.image ? (
                        <Image
                          style={styles.previewCardLogoImage}
                          source={wallet.image}
                          contentFit="cover"
                          transition={100}
                        />
                      ) : (
                        <PreviewIcon size={verticalScale(18)} color="#fff" weight="bold" />
                      )
                    )}
                  </View>
                </View>

                {/* Card chip & Mock info */}
                <View style={styles.previewCardMiddle}>
                  <LinearGradient
                    colors={["#FFE082", "#FFB300"]}
                    style={styles.previewCardChip}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  />
                  <Typo size={14} color="rgba(255, 255, 255, 0.9)" fontWeight="600" style={{ letterSpacing: 3 }}>
                    ***   ***   ***   8899
                  </Typo>
                </View>

                <View style={styles.previewCardFooter}>
                  <View>
                    <Typo size={9} color="rgba(255, 255, 255, 0.5)" fontWeight="500">
                      CARDHOLDER
                    </Typo>
                    <Typo size={13} color={colors.white} fontWeight="600" style={{ marginTop: 1 }}>
                      {user?.name?.toUpperCase() || "SPENDWISE USER"}
                    </Typo>
                  </View>
                  <View style={{ alignItems: "flex-end", maxWidth: '50%' }}>
                    <Typo size={9} color="rgba(255, 255, 255, 0.5)" fontWeight="500">
                      ACCOUNT NAME
                    </Typo>
                    <Typo size={13} color={colors.white} fontWeight="600" style={{ marginTop: 1 }} textProps={{ numberOfLines: 1 }}>
                      {wallet.name || "WALLET NAME"}
                    </Typo>
                  </View>
                </View>
              </LinearGradient>
            </View>

            {/* Name input with top spacing so it's connected but not flush */}
            <Input
              placeholder="Wallet name..."
              value={wallet.name}
              onChangeText={(value: string) => setWallet({ ...wallet, name: value })}
              containerStyle={{ marginTop: spacingY._10 }}
            />
          </View>

          {/* Template Selector */}
          <View style={styles.inputContainer}>
            <View style={styles.sectionLabelRow}>
              <Typo size={13} color={themeColors.textLighter} fontWeight="600">CARD TEMPLATE</Typo>
              {wallet.image && typeof wallet.image === 'string' && wallet.image.startsWith('preset_') && (
                <Typo size={12} color={colors.primary} fontWeight="600">
                  {walletPresets[wallet.image]?.label || ''}
                </Typo>
              )}
            </View>
            <View style={styles.presetsGrid}>
              {Object.values(walletPresets).map((preset) => {
                const isSelected = wallet.image === preset.value;
                return (
                  <PresetCardItem
                    key={preset.value}
                    preset={preset}
                    isSelected={isSelected}
                    themeColors={themeColors}
                    onPress={() => {
                      setWallet((prev) => ({
                        ...prev,
                        image: preset.value,
                        name: prev.name ? prev.name : preset.label
                      }));
                    }}
                  />
                );
              })}
            </View>
          </View>

          {/* Custom Logo Upload — compact inline row */}
          <View style={styles.inputContainer}>
            <Typo size={13} color={themeColors.textLighter} fontWeight="600">CUSTOM LOGO</Typo>
            {
              wallet.image && typeof wallet.image !== 'string' ? (
                // Image selected — show thumbnail with remove
                <View style={styles.uploadPreviewRow}>
                  <View style={styles.uploadThumbnail}>
                    <Image
                      style={{ flex: 1 }}
                      source={wallet.image}
                      contentFit="cover"
                      transition={100}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Typo size={14} fontWeight="600">Custom icon selected</Typo>
                    <Typo size={12} color={themeColors.textLighter}>Tap remove to use a template instead</Typo>
                  </View>
                  <TouchableOpacity
                    onPress={() => setWallet({ ...wallet, image: null })}
                    style={styles.uploadRemoveBtn}
                  >
                    <Icon.XIcon size={verticalScale(14)} color={colors.rose} weight="bold" />
                  </TouchableOpacity>
                </View>
              ) : (
                // No custom image — show inline upload button
                <TouchableOpacity
                  onPress={async () => {
                    const permissionResult = await (await import('expo-image-picker')).requestMediaLibraryPermissionsAsync();
                    if (!permissionResult.granted) {
                      Toast.show({ type: 'error', text1: 'Permission required', text2: 'Permission to access media library is required.' });
                      return;
                    }
                    const result = await (await import('expo-image-picker')).launchImageLibraryAsync({
                      mediaTypes: ['images'],
                      allowsEditing: false,
                      quality: 0.5,
                    });
                    if (!result.canceled && result.assets?.length) {
                      setWallet({ ...wallet, image: result.assets[0] });
                    }
                  }}
                  style={[styles.uploadInlineBtn, { backgroundColor: themeColors.inputBg, borderColor: themeColors.border }]}
                >
                  <Icon.UploadSimpleIcon size={verticalScale(17)} color={themeColors.textLighter} />
                  <Typo size={14} color={themeColors.textLighter}>Upload your own logo</Typo>
                </TouchableOpacity>
              )
            }
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
    marginBottom: spacingY._15,
  },

  form: {
    gap: spacingY._20,
    marginTop: spacingY._10,
    paddingBottom: spacingY._10,
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
    gap: spacingY._7,
  },
  sectionLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  uploadInlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(10),
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: radius._12,
    paddingVertical: spacingY._12,
    paddingHorizontal: spacingX._15,
  },
  uploadPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(12),
  },
  uploadThumbnail: {
    width: verticalScale(46),
    height: verticalScale(46),
    borderRadius: radius._10,
    overflow: 'hidden',
  },
  uploadRemoveBtn: {
    padding: scale(8),
  },
  presetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: scale(8),
  },
  presetItem: {
    width: '31%',
    height: scale(60),
    borderRadius: radius._10,
    borderWidth: 2,
    borderColor: 'transparent',
    overflow: 'hidden',
    marginBottom: scale(4),
  },
  presetGradient: {
    flex: 1,
    padding: scale(8),
    justifyContent: 'space-between',
  },
  miniCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  miniCardChip: {
    width: scale(14),
    height: scale(10),
    borderRadius: radius._3,
  },
  miniCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  previewContainer: {
    gap: scale(8),
  },
  previewCardWrapper: {
    width: '100%',
    height: scale(165),
    borderRadius: radius._20,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
    overflow: "hidden",
  },
  previewCardGradient: {
    flex: 1,
    padding: spacingY._15,
    justifyContent: "space-between",
  },
  previewCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  previewCardLogoContainer: {
    width: verticalScale(36),
    height: verticalScale(36),
    borderRadius: 100,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  previewCardLogoImage: {
    width: "100%",
    height: "100%",
  },
  previewCardMiddle: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(12),
  },
  previewCardChip: {
    width: scale(32),
    height: scale(22),
    borderRadius: 100,
  },
  previewCardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
});
