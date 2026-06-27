import { StyleSheet, Text, TouchableOpacity, View, Modal, TouchableWithoutFeedback } from 'react-native'
import React, { useState } from 'react'
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
    const launchCamera = async () => {
        const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
        if (!permissionResult.granted) {
            Toast.show({ type: 'error', text1: 'Permission required', text2: 'Permission to access the camera is required.' });
            return;
        }

        const result = await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            quality: 0.5,
            base64: true,
        });

        if (!result.canceled && result.assets?.length) {
            onSelect(result.assets[0]);
        }
    };

    const launchGallery = async () => {
        const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permissionResult.granted) {
            Toast.show({ type: 'error', text1: 'Permission required', text2: 'Permission to access the media library is required.' });
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            quality: 0.5,
            base64: true,
        });

        if (!result.canceled && result.assets?.length) {
            onSelect(result.assets[0]);
        }
    };

    const [showModal, setShowModal] = useState(false);

    const pickImage = () => {
        setShowModal(true);
    };

    const handleCamera = () => {
        setShowModal(false);
        launchCamera();
    };

    const handleGallery = () => {
        setShowModal(false);
        launchGallery();
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

      <Modal
        visible={showModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowModal(false)}
      >
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowModal(false)}>
            <View style={[styles.modalContent, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
                <Typo size={18} fontWeight="700" color={themeColors.text} style={styles.modalTitle}>
                    Upload Receipt
                </Typo>

                <TouchableOpacity 
                    style={[styles.modalButton, { backgroundColor: themeColors.inputBg }]} 
                    onPress={handleCamera}
                >
                    <Icon.CameraIcon size={24} color={themeColors.text} />
                    <Typo size={16} fontWeight="600" color={themeColors.text}>Take Photo</Typo>
                </TouchableOpacity>

                <TouchableOpacity 
                    style={[styles.modalButton, { backgroundColor: themeColors.inputBg }]} 
                    onPress={handleGallery}
                >
                    <Icon.ImageSquareIcon size={24} color={themeColors.text} />
                    <Typo size={16} fontWeight="600" color={themeColors.text}>Choose from Gallery</Typo>
                </TouchableOpacity>
                
                <TouchableOpacity 
                    style={[styles.modalButton, styles.cancelButton, { backgroundColor: colors.rose }]} 
                    onPress={() => setShowModal(false)}
                >
                    <Typo size={16} fontWeight="700" color={colors.white}>Cancel</Typo>
                </TouchableOpacity>
            </View>
        </TouchableOpacity>
      </Modal>
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
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        width: '100%',
        backgroundColor: colors.neutral800,
        borderRadius: radius._15,
        padding: 20,
        borderWidth: 1,
        borderColor: colors.neutral700,
    },
    modalTitle: {
        textAlign: 'center',
        marginBottom: 20,
    },
    modalButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.neutral700,
        paddingVertical: 15,
        borderRadius: radius._12,
        marginBottom: 10,
        gap: 10,
    },
    cancelButton: {
        backgroundColor: colors.rose,
        marginTop: 5,
        marginBottom: 0,
    }
})