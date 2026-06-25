import { StyleSheet, TouchableOpacity, View } from 'react-native'
import React from 'react'
import Typo from './Typo'
import { WalletType } from '@/types'
import { Router } from 'expo-router'
import { useAuth } from '@/contexts/authContext'
import { verticalScale } from '@/utils/styling'
import { colors, radius, spacingX } from '@/constants/theme'
import { Image } from 'expo-image'
import * as Icons from "phosphor-react-native";
import Animated, { FadeInDown } from 'react-native-reanimated'

import { useTheme } from '@/contexts/themeContext';
import { walletPresets } from '@/constants/data';

const WalletListItem = ({
    item,
    index,
    router,
}: {
    item: WalletType,
    index: number,
    router: Router
}) => {
    const { user } = useAuth();
    const { colors: themeColors } = useTheme();

    const openWallet = () =>{
        router.push({
            pathname: '/(modals)/walletModal',
            params: {
                id: item?.id,
                name: item?.name,
                image: item?.image
            }
        })
    }

    const isPreset = typeof item?.image === 'string' && item.image.startsWith('preset_');
    const preset = isPreset ? (walletPresets[item.image] || walletPresets.preset_bank) : null;
    const PresetIcon = preset ? preset.icon : null;

  return (
    <Animated.View 
        entering ={FadeInDown.delay(index * 50)
            .springify()
            .damping(14)}
    >
      <TouchableOpacity style={styles.container} onPress={openWallet}>
        <View style={[
          styles.imageContainer, 
          preset && { backgroundColor: preset.bgColor, borderWidth: 0 }
        ]}>
            {preset ? (
              <PresetIcon size={verticalScale(20)} color={preset.color} weight="bold" />
            ) : (
              <Image
                  style={{flex : 1, width: '100%', height: '100%'}}
                  source={item?.image}
                  contentFit='cover'
                  transition={100}
              />
            )}
        </View>
        <View style={styles.nameContainer}>
            <Typo size={16}>{item?.name}</Typo>
            <Typo size={14} color={colors.neutral400}>{user?.currency || "$"}{item?.amount}</Typo>
        </View>

        <Icons.CaretRightIcon size={verticalScale(20)} weight="bold" color={themeColors.text} />
    </TouchableOpacity>
    </Animated.View>
  )
}

export default WalletListItem

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: verticalScale(17),
    // padding: spacingX._15,
  },
  imageContainer: {
    height: verticalScale(45),
    width: verticalScale(45),
    borderWidth: 1,
    borderColor: colors.neutral600,
    borderRadius: radius._12,
    borderCurve: "continuous",
    overflow: "hidden",
    justifyContent: 'center',
    alignItems: 'center',
  },
  nameContainer: {
    flex: 1,
    gap: 2,
    marginLeft: spacingX._10,
  },
});