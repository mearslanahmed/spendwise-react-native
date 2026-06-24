import { Alert, Pressable, StyleSheet, Text, View, TouchableOpacity, Platform } from "react-native";
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

// Safely require native modules to prevent load crashes in Expo Go
let GoogleSignin: any = null;
try {
  GoogleSignin = require('@react-native-google-signin/google-signin').GoogleSignin;
} catch (error) {
  // console.log("GoogleSignin native module not available");
}

const Register = () => {
  const emailRef = useRef("");
  const passwordRef = useRef("");
  const nameRef = useRef("");
  
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isAgreed, setIsAgreed] = useState(false);
  
  const router = useRouter();
  const { register: registerUser, loginWithGoogle } = useAuth();

  const handelSubmit = async () => {
    if (!nameRef.current || !emailRef.current || !passwordRef.current) {
      Toast.show({ type: 'error', text1: 'Sign up', text2: "Please fill all the fields" });
      return;
    }

    const email = emailRef.current.trim();
    const currentPassword = passwordRef.current;
    const name = nameRef.current.trim();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      Toast.show({ type: 'error', text1: 'Invalid Email', text2: "Please enter a valid email address" });
      return;
    }

    // Password strength check
    const hasLength = currentPassword.length >= 8;
    const hasLetter = /[a-zA-Z]/.test(currentPassword);
    const hasNumber = /[0-9]/.test(currentPassword);

    if (!hasLength || !hasLetter || !hasNumber) {
      Toast.show({ 
        type: 'error', 
        text1: 'Weak Password', 
        text2: "Password must meet all security requirements." 
      });
      return;
    }

    if (!isAgreed) {
      Toast.show({ 
        type: 'error', 
        text1: 'Terms & Conditions', 
        text2: "Please accept the Terms of Service & Privacy Policy to continue." 
      });
      return;
    }

    if (isLoading) return; // prevent double tap

    setIsLoading(true);
    const res = await registerUser(email, currentPassword, name);
    setIsLoading(false);

    if (res.success) {
      Toast.show({ type: 'success', text1: 'Sign Up', text2: res.msg });
    } else {
      Toast.show({ type: 'error', text1: 'Sign up', text2: res.msg });
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

        <View style={{ gap: 5, marginTop: spacingY._15 }}>
          <Typo size={30} fontWeight={"800"}>
            {"Let's"}
          </Typo>
          <Typo size={30} fontWeight={"800"}>
            Get Started
          </Typo>
        </View>

        {/* form */}

        <View style={styles.form}>
          <Typo size={16} color={colors.textLighter}>
            Create an account to track all your expenses
          </Typo>
          <Input
            placeholder="Enter your name"
            onChangeText={(value) => (nameRef.current = value)}
            icon={
              <Icons.UserIcon
                size={verticalScale(26)}
                color={colors.neutral300}
                weight="fill"
              />
            }
          />
          <Input
            placeholder="Enter your email"
            keyboardType="email-address"
            autoCapitalize="none"
            onChangeText={(value) => (emailRef.current = value)}
            icon={
              <Icons.At
                size={verticalScale(26)}
                color={colors.neutral300}
                weight="fill"
              />
            }
          />

          <Input
            placeholder="Enter your password"
            secureTextEntry
            autoCapitalize="none"
            onChangeText={(value) => {
              passwordRef.current = value;
              setPassword(value);
            }}
            icon={
              <Icons.LockIcon
                size={verticalScale(26)}
                color={colors.neutral300}
                weight="fill"
              />
            }
          />

          {/* Password strength indicator checklist */}
          <View style={styles.checklistContainer}>
            <View style={styles.checkItem}>
              <Icons.CheckCircle
                size={18}
                color={password.length >= 8 ? colors.primary : colors.neutral600}
                weight={password.length >= 8 ? "fill" : "regular"}
              />
              <Typo size={13} color={password.length >= 8 ? colors.textLight : colors.neutral500}>
                At least 8 characters
              </Typo>
            </View>
            <View style={styles.checkItem}>
              <Icons.CheckCircle
                size={18}
                color={/[a-zA-Z]/.test(password) ? colors.primary : colors.neutral600}
                weight={/[a-zA-Z]/.test(password) ? "fill" : "regular"}
              />
              <Typo size={13} color={/[a-zA-Z]/.test(password) ? colors.textLight : colors.neutral500}>
                Contains a letter (a-z, A-Z)
              </Typo>
            </View>
            <View style={styles.checkItem}>
              <Icons.CheckCircle
                size={18}
                color={/[0-9]/.test(password) ? colors.primary : colors.neutral600}
                weight={/[0-9]/.test(password) ? "fill" : "regular"}
              />
              <Typo size={13} color={/[0-9]/.test(password) ? colors.textLight : colors.neutral500}>
                Contains a number (0-9)
              </Typo>
            </View>
          </View>

          {/* Terms & Privacy checkbox */}
          <Pressable onPress={() => setIsAgreed(!isAgreed)} style={styles.checkboxContainer}>
            <View style={[styles.checkbox, isAgreed && styles.checkboxActive]}>
              {isAgreed && <Icons.Check size={12} color={colors.black} weight="bold" />}
            </View>
            <View style={styles.checkboxTextContainer}>
              <Typo size={14} color={colors.neutral400}>
                I agree to the{" "}
                <Text
                  onPress={(e) => {
                    e.stopPropagation();
                    router.push("/(modals)/termsOfServiceModal");
                  }}
                  style={styles.linkText}
                >
                  Terms of Service
                </Text>
                {" & "}
                <Text
                  onPress={(e) => {
                    e.stopPropagation();
                    router.push("/(modals)/privacyPolicyModal");
                  }}
                  style={styles.linkText}
                >
                  Privacy Policy
                </Text>
              </Typo>
            </View>
          </Pressable>
 
          <Button 
            loading={isLoading} 
            onPress={handelSubmit}
            style={!isAgreed && { opacity: 0.6 }}
          >
            <Typo fontWeight={"700"} color={colors.black} size={21}>
              Sign Up
            </Typo>
          </Button>

          {/* divider */}
          <View style={styles.dividerContainer}>
            <View style={styles.dividerLine} />
            <Typo size={14} color={colors.neutral500} style={styles.dividerText}>
              Or continue with
            </Typo>
            <View style={styles.dividerLine} />
          </View>

          {/* social login buttons */}
          <View style={styles.socialContainer}>
            <TouchableOpacity style={styles.socialButton} onPress={handleGoogleSignIn}>
              <Icons.GoogleLogo size={24} color={colors.white} weight="bold" />
              <Typo size={16} fontWeight="600" color={colors.white}>
                Google
              </Typo>
            </TouchableOpacity>
          </View>
        </View>

        {/* footer */}
        <View style={styles.footer}>
          <Typo size={15}>Already have an account?</Typo>
          <Pressable onPress={() => router.navigate("/(auth)/login")}>
            <Typo size={15} fontWeight={"700"} color={colors.primary}>
              Login
            </Typo>
          </Pressable>
        </View>
      </View>
    </ScreenWrapper>
  );
};

export default Register;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: spacingY._20,
    paddingHorizontal: spacingX._20,
  },

  welcomeText: {
    fontSize: verticalScale(20),
    fontWeight: "bold",
    color: colors.text,
  },

  form: {
    gap: spacingY._15,
  },

  checklistContainer: {
    gap: spacingY._7,
    marginTop: spacingY._5,
    backgroundColor: "rgba(255, 255, 255, 0.02)",
    padding: spacingX._12,
    borderRadius: radius._12,
    borderWidth: 1,
    borderColor: colors.neutral800,
  },

  checkItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacingX._7,
  },

  forgotPassword: {
    textAlign: "right",
    fontWeight: "500",
    color: colors.text,
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

  checkboxContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacingX._10,
    marginTop: spacingY._5,
    paddingHorizontal: spacingX._5,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: radius._5,
    borderWidth: 1.5,
    borderColor: colors.neutral500,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "transparent",
  },
  checkboxActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  checkboxTextContainer: {
    flex: 1,
  },
  linkText: {
    color: colors.primary,
    fontWeight: "700",
    textDecorationLine: "underline",
  },
});
