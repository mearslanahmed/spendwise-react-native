import { Pressable, StyleSheet, Text, View, TouchableOpacity, Platform } from "react-native";
import React, { useRef, useState, useEffect } from "react";
import ScreenWrapper from "@/components/ScreenWrapper";
import { colors, spacingX, spacingY, radius } from "@/constants/theme";
import { verticalScale } from "@/utils/styling";
import BackButton from "@/components/BackButton";
import Typo from "@/components/Typo";
import Input from "@/components/Input";
import * as Icons from "phosphor-react-native";
import Button from "@/components/Button";
import { useRouter } from "expo-router";
import { useAuth } from "@/contexts/authContext";
import Toast from 'react-native-toast-message';
import { useTheme } from "@/contexts/themeContext";

// Safely require native modules to prevent load crashes in Expo Go
let GoogleSignin: any = null;
try {
  GoogleSignin = require('@react-native-google-signin/google-signin').GoogleSignin;
} catch (error) {
  // console.log("GoogleSignin native module not available");
}

const Login = () => {
  const emailRef = useRef("");
  const passwordRef = useRef("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { login: loginUser, loginWithGoogle } = useAuth();
  const { colors: themeColors } = useTheme();

  const handelSubmit = async () => {
    const email = emailRef.current.trim();
    const password = passwordRef.current;

    if (!email || !password) {
      Toast.show({ type: 'error', text1: 'Login', text2: "Please fill all the fields" });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Toast.show({ type: 'error', text1: 'Invalid Email', text2: "Please enter a valid email address" });
      return;
    }

    setIsLoading(true);
    const res = await loginUser(email, password);
    setIsLoading(false);
    if (!res.success) {
      Toast.show({ type: 'error', text1: 'Login', text2: res.msg });
    }
  };

  const handleGoogleSignIn = async () => {
    if (!GoogleSignin) {
      Toast.show({
        type: 'error',
        text1: 'Social Sign-In',
        text2: 'Google Sign-In is only available in standalone native builds.',
      });
      return;
    }
    try {
      setIsLoading(true);
      GoogleSignin.configure({
        webClientId: process.env.EXPO_PUBLIC_FIREBASE_GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com',
      });
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();
      if (userInfo.type === 'success') {
        const idToken = userInfo.data.idToken;
        if (idToken) {
          const res = await loginWithGoogle(idToken);
          if (res.success) {
            Toast.show({ type: 'success', text1: 'Welcome', text2: 'Logged in successfully with Google!' });
          } else {
            Toast.show({ type: 'error', text1: 'Google Sign In', text2: res.msg });
          }
        }
      }
    } catch (error: any) {
      if (error.code !== 'SIGN_IN_CANCELLED') {
        Toast.show({ type: 'error', text1: 'Google Sign In', text2: error.message });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScreenWrapper>
      <View style={styles.container}>
        <BackButton iconSize={28} />

        <View style={{ gap: 5, marginTop: spacingY._20 }}>
          <Typo size={30} fontWeight={"800"}>
            Hey,
          </Typo>
          <Typo size={30} fontWeight={"800"}>
            Welcome Back
          </Typo>
        </View>

        {/* form */}

        <View style={styles.form}>
          <Typo size={16} color={colors.textLighter}>
            Login now to track all your expenses
          </Typo>
          <Input
            placeholder="Enter your email"
            keyboardType="email-address"
            autoCapitalize="none"
            onChangeText={(value) => (emailRef.current = value)}
            icon={
              <Icons.At size={verticalScale(26)} color={themeColors.textLighter} weight="fill" />
            }
          />

          <Input
            placeholder="Enter your password"
            secureTextEntry
            autoCapitalize="none"
            onChangeText={(value) => (passwordRef.current = value)}
            icon={
              <Icons.Lock size={verticalScale(26)} color={themeColors.textLighter} weight="fill" />
            }
          />
          
          <Pressable onPress={() => !isLoading && router.push("/(auth)/forgot-password")} style={styles.forgotPasswordContainer} disabled={isLoading}>
            <Typo size={14} style={[styles.forgotPassword, isLoading && { opacity: 0.5 }]}>
              Forgot Password?
            </Typo>
          </Pressable>

          <Button loading={isLoading} onPress={handelSubmit}>
            <Typo fontWeight={"700"} color={colors.black} size={21}>
              Login
            </Typo>
          </Button>

          {/* divider */}
          <View style={styles.dividerContainer}>
            <View style={[styles.dividerLine, { backgroundColor: themeColors.border }]} />
            <Typo size={14} color={colors.neutral500} style={styles.dividerText}>
              Or continue with
            </Typo>
            <View style={[styles.dividerLine, { backgroundColor: themeColors.border }]} />
          </View>

          {/* social login buttons */}
          <View style={styles.socialContainer}>
            <TouchableOpacity 
              style={[
                styles.socialButton, 
                { backgroundColor: themeColors.inputBg, borderColor: themeColors.border },
                isLoading && { opacity: 0.6 }
              ]} 
              onPress={handleGoogleSignIn}
              disabled={isLoading}
            >
              <Icons.GoogleLogo size={24} color={themeColors.text} weight="bold" />
              <Typo size={16} fontWeight="600" color={themeColors.text}>
                Google
              </Typo>
            </TouchableOpacity>
          </View>
        </View>

        {/* footer */}
        <View style={styles.footer}>
          <Typo size={15}>{"Don't have an account?"}</Typo>
          <Pressable onPress={() => !isLoading && router.navigate("/(auth)/register")} disabled={isLoading}>
            <Typo size={15} fontWeight={'700'} color={isLoading ? colors.neutral600 : colors.primary}>Sign Up</Typo>
          </Pressable>
        </View>
      </View>
    </ScreenWrapper>
  );
};

export default Login;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: spacingY._30,
    paddingHorizontal: spacingX._20,
  },

  welcomeText: {
    fontSize: verticalScale(20),
    fontWeight: "bold",
    color: colors.text,
  },

  form: {
    gap: spacingY._20,
  },

  forgotPasswordContainer: {
    alignSelf: "flex-end",
  },

  forgotPassword: {
    fontWeight: "500",
  },

  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: spacingY._5,
  },

  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.neutral700,
  },

  dividerText: {
    paddingHorizontal: spacingX._10,
  },

  socialContainer: {
    flexDirection: "row",
    gap: spacingX._15,
    justifyContent: "center",
  },

  socialButton: {
    flex: 1,
    flexDirection: "row",
    height: verticalScale(54),
    borderWidth: 1,
    borderColor: colors.neutral700,
    borderRadius: radius._17,
    justifyContent: "center",
    alignItems: "center",
    gap: spacingX._10,
    backgroundColor: colors.neutral900,
  },

  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 5,
    marginTop: spacingY._10,
  },

  footerText: {
    textAlign: "center",
    color: colors.text,
    fontSize: verticalScale(15),
  },
});
