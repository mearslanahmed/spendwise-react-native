import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import React from 'react'
import { ImageUploadProps } from '@/types'
import * as Icon from "phosphor-react-native";
import { colors, radius } from '@/constants/theme';
import Typo from './Typo';
import { scale, verticalScale } from '@/utils/styling';
import { Image } from 'expo-image';
import { getProfilePath } from '@/services/imageService';
import * as ImagePicker from 'expo-image-picker';
import Toast from 'react-native-toast-message';

import { useTheme } from '@/contexts/themeContext';

const ImageUpload = ({
    file = null,
    onSelect,
    onClear,
    containerStyle,
    imageStyle,
    placeholder = ""
}: ImageUploadProps ) => {
    const { colors: themeColors } = useTheme();
    const pickImage = async () => {
        const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
        
            if (!permissionResult.granted) {
              Toast.show({ type: 'error', text1: 'Permission required', text2: 'Permission to access the media library is required.' });
              return;
            }
        
            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ['images'],
              allowsEditing: false,
              aspect: [4, 3],
              quality: 0.5,
            });
        
            if (!result.canceled && result.assets?.length) {
              onSelect(result.assets[0]);
            }
    };
  return (
    <View>
      {
        !file && (
            <TouchableOpacity
                onPress={pickImage}
                style={[
                    styles.inputContainer, 
                    { backgroundColor: themeColors.inputBg, borderColor: themeColors.border },
                    containerStyle && containerStyle
                ]}
            >
                <Icon.UploadSimpleIcon color={themeColors.textLighter} />
                {placeholder && <Typo size={15}>{placeholder}</Typo>}
            </TouchableOpacity>
        )
      }
      {
        file && (
            <View style={[styles.image, imageStyle && imageStyle]}>
                <Image
                    style={{flex: 1}}
                    source={getProfilePath(file)}
                    contentFit="cover"
                    transition={100}
                />

                <TouchableOpacity style={styles.deleteIcon} onPress={onClear}>
                    <Icon.XCircleIcon
                        size={verticalScale(24)}
                        weight='fill'
                        color={colors.white}
                    />
                </TouchableOpacity>
            </View>
        )
      }
    </View>
  )
}

export default ImageUpload

const styles = StyleSheet.create({
    inputContainer: {
        height: verticalScale(54),
        backgroundColor: colors.neutral700,
        borderRadius: radius._15,
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        gap: 10,
        borderWidth: 1,
        borderColor: colors.neutral500,
        borderStyle: "dashed",
    },

    image: {
        height: scale(150),
        width: scale(150),
        borderRadius: radius._15,
        borderCurve: 'continuous',
        overflow: "hidden",
    },

    deleteIcon: {
        position: "absolute",
        top: scale(6),
        right: scale(6),
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 1,
        shadowRadius: 10,
    }
})