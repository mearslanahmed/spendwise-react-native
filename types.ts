import { Href } from "expo-router";
import { Firestore, Timestamp } from "firebase/firestore";
import { Icon } from "phosphor-react-native";
import React, { ReactNode } from "react";
import {
    ActivityIndicator,
    ActivityIndicatorProps,
    ImageStyle,
    PressableProps,
    TextInput,
    TextInputProps,
    TextProps,
    TextStyle,
    TouchableOpacityProps,
    ViewStyle
} from "react-native";

export type ScreenWrapperProps = {
    style?: ViewStyle;
    children: React.ReactNode;
    // bg?: string;
};
export type ModalWrapperProps = {
    style?: ViewStyle;
    children: React.ReactNode;
    bg?: string;
};
export type accountOptionType = {
    title: string;
    icon: React.ReactNode;
    bgColor: string;
    routeName?: any;
};
export type TypoProps = {
    size?: number;
    color?: string;
    fontWeight?: TextStyle["fontWeight"];
    style?: TextStyle;
    children: React.ReactNode;
    textProps?: TextProps;
};

export type IconComponent = React.ComponentType<{
    height?: number;
    width?: number;
    color?: string;
    strokeWidth?: number;
    fill?: string;
}>;

export type IconProps = {
    name: string;
    color?: string;
    size?: number;
    strokeWidth?: number;
    fill?: string;
}

export type HeaderProps = {
    title: string;
    style?: ViewStyle;
    leftIcon?: ReactNode;
    rightIcon?: ReactNode;
}

export type BackButtonProps = {
    style?: ViewStyle;
    iconSize?: number;
};

export type TransactionType = {
    id?: string;
    type: string;
    amount: number;
    category?: string;
    date: Date | Timestamp | string;
    description?: string;
    image?: any;
    uid: string;
    walletId?: string;
};

export type CategoryType = {
    label: string;
    value: string;
    icon: Icon;
    bgColor: string;
};

export type ExpenseCategoriesType = {
    [key: string]: CategoryType;
};

export type TransactionListType = {
    data: TransactionType[];
    title: string;
    loading: boolean;
    emptyListMessage?: string;
    ListHeaderComponent?: React.ReactElement | React.ComponentType<any> | null;
    onEndReached?: () => void;
};

export type TransactionItemsProps = {
    item: TransactionType;
    index: number;
    handleClick: Function;
};

export interface InputProps extends TextInputProps {
    icon?: React.ReactNode;
    containerStyle?: ViewStyle;
    inputStyle?: TextStyle;
    inputRef?: React.RefObject<TextInput>;
    // label?: string;
    // error?: string;
};

export interface CustomButtonProps extends TouchableOpacityProps {
    style?: ViewStyle;
    onPress?: () => void;
    loading?: boolean;
    // hasShadow?: boolean;
    children?: React.ReactNode;
};

export type ImageUploadProps = {
    file?: any;
    onSelect: (file: any) => void;
    onClear: () => void;
    containerStyle?: ViewStyle;
    imageStyle?: ViewStyle;
    placeholder?: string;
};

export type UserType = {
    uid?: string;
    email?: string;
    name: string | null;
    image?: any;
    emailVerified?: boolean;
} | null;

export type UserDataType = {
    name: string;
    image?: any;
};

export type AuthContextType = {
    user: UserType;
    setUser: Function;
    login: (
        email: string,
        password: string
    )=> Promise<{success: boolean; msg?: string}>;
    register: (
        email: string,
        password: string,
        name: string
    )=> Promise<{success: boolean; msg?: string}>;
    updateUserData: (userId: string) => Promise<void>;
    resetPassword: (email: string) => Promise<{success: boolean; msg?: string}>;
    loginWithGoogle: (idToken: string) => Promise<{success: boolean; msg?: string}>;
};

export type ResponseType = {
    success: boolean;
    data?: any;
    msg?: string;
};

export type WalletType = {
    id?: string;
    name: string;
    amount?: number;
    totalIncome?: number;
    totalExpense?: number;
    image: any;
    uid?: string;
    created?: Date;
};