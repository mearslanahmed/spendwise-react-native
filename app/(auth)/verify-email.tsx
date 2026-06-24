import { StyleSheet, View, Pressable, ActivityIndicator, TouchableOpacity, Linking, Platform } from "react-native";
import React, { useState, useEffect } from "react";
import ScreenWrapper from "@/components/ScreenWrapper";
import Typo from "@/components/Typo";
import Button from "@/components/Button";
import { colors, spacingX, spacingY, radius } from "@/constants/theme";
import { verticalScale } from "@/utils/styling";
import * as Icons from "phosphor-react-native";
import { useAuth } from "@/contexts/authContext";
import { auth } from "@/config/firebase";
import { sendEmailVerification, signOut } from "firebase/auth";
import Toast from "react-native-toast-message";
import { useRouter } from "expo-router";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
  Easing,
} from "react-native-reanimated";

import * as IntentLauncher from "expo-intent-launcher";

const VerifyEmail = () => {
  const { user, setUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const router = useRouter();

  // Reanimated Shared Values for Halo Pulse Rings
  const ring1Scale = useSharedValue(1);
  const ring1Opacity = useSharedValue(0.6);
  const ring2Scale = useSharedValue(1);
  const ring2Opacity = useSharedValue(0.4);

  useEffect(() => {
    // Ring 1 Animation
    ring1Scale.value = withRepeat(
      withTiming(1.6, { duration: 2500, easing: Easing.out(Easing.ease) }),
      -1,
      false
    );
    ring1Opacity.value = withRepeat(
      withTiming(0, { duration: 2500, easing: Easing.out(Easing.ease) }),
      -1,
      false
    );

    // Ring 2 Animation (Delayed to create ripple wave effect)
    ring2Scale.value = withDelay(
      1000,
      withRepeat(
        withTiming(1.8, { duration: 2500, easing: Easing.out(Easing.ease) }),
        -1,
        false
      )
    );
    ring2Opacity.value = withDelay(
      1000,
      withRepeat(
        withTiming(0, { duration: 2500, easing: Easing.out(Easing.ease) }),
        -1,
        false
      )
    );
  }, []);

  // Animated Styles
  const animatedRing1 = useAnimatedStyle(() => ({
    transform: [{ scale: ring1Scale.value }],
    opacity: ring1Opacity.value,
  }));

  const animatedRing2 = useAnimatedStyle(() => ({
    transform: [{ scale: ring2Scale.value }],
    opacity: ring2Opacity.value,
  }));

  useEffect(() => {
    let interval: any;
    if (cooldown > 0) {
      interval = setInterval(() => {
        setCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [cooldown]);

  // Automatically check email verification status in the background every 3 seconds
  useEffect(() => {
    let checkInterval: any;

    const checkStatus = async () => {
      try {
        if (auth.currentUser) {
          await auth.currentUser.reload();
          if (auth.currentUser.emailVerified) {
            clearInterval(checkInterval);
            Toast.show({
              type: "success",
              text1: "Email Verified",
              text2: "Welcome to SpendWise!",
            });
            
            setUser({
              uid: auth.currentUser.uid,
              email: auth.currentUser.email ?? undefined,
              name: auth.currentUser.displayName || user?.name || null,
              emailVerified: true,
            });

            router.replace("/(tabs)/home");
          }
        }
      } catch (error) {
        console.warn("Background verification check failed:", error);
      }
    };

    // Run check immediately on mount, then poll every 3 seconds
    checkStatus();
    checkInterval = setInterval(checkStatus, 3000);

    return () => {
      if (checkInterval) clearInterval(checkInterval);
    };
  }, []);

  const handleOpenEmailApp = async () => {
    try {
      if (Platform.OS === "ios") {
        // iOS: Apple Mail -> Gmail -> Outlook
        const iOSSchemes = ["message://", "googlegmail://", "ms-outlook://"];
        for (const scheme of iOSSchemes) {
          try {
            await Linking.openURL(scheme);
            return;
          } catch {
            // Proceed to check next scheme
          }
        }
      } else {
        // Android: Open Default Email app directly using native intent launcher
        try {
          await IntentLauncher.startActivityAsync("android.intent.action.MAIN", {
            category: "android.intent.category.APP_EMAIL",
          });
          return;
        } catch (intentError) {
          // Fallback to Gmail/Outlook web URLs if intent fails
          const androidURLs = [
            "https://mail.google.com",
            "https://outlook.live.com"
          ];
          for (const url of androidURLs) {
            try {
              await Linking.openURL(url);
              return;
            } catch {
              // Proceed to check next fallback
            }
          }
        }
      }
      
      // Fallback to mailto composer if no native email apps could be opened directly
      await Linking.openURL("mailto:");
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Could not open mail app.",
      });
    }
  };

  const handleCheckVerification = async () => {
    setIsLoading(true);
    try {
      if (auth.currentUser) {
        await auth.currentUser.reload();
        const isVerified = auth.currentUser.emailVerified;
        
        if (isVerified) {
          Toast.show({
            type: "success",
            text1: "Email Verified",
            text2: "Welcome to SpendWise!",
          });
          
          setUser({
            uid: auth.currentUser.uid,
            email: auth.currentUser.email ?? undefined,
            name: auth.currentUser.displayName || user?.name || null,
            emailVerified: true,
          });

          router.replace("/(tabs)/home");
        } else {
          Toast.show({
            type: "error",
            text1: "Not Verified Yet",
            text2: "Please click the link sent to your email to verify.",
          });
        }
      }
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: "Verification Error",
        text2: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendEmail = async () => {
    if (cooldown > 0) return;
    setIsLoading(true);
    try {
      if (auth.currentUser) {
        await sendEmailVerification(auth.currentUser);
        Toast.show({
          type: "success",
          text1: "Verification Email Sent",
          text2: "Please check your inbox and spam folder.",
        });
        setCooldown(60);
      }
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: "Error Resending Email",
        text2: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    setIsLoading(true);
    try {
      await signOut(auth);
      Toast.show({
        type: "success",
        text1: "Logged Out",
        text2: "You can sign up with a different email.",
      });
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: "Logout Error",
        text2: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScreenWrapper>
      <View style={styles.container}>
        {/* Animated Icon Header */}
        <View style={styles.iconContainer}>
          <Animated.View style={[styles.pulseRing, animatedRing2]} />
          <Animated.View style={[styles.pulseRing, animatedRing1]} />
          <View style={styles.iconWrapper}>
            <Icons.EnvelopeOpen
              size={verticalScale(54)}
              color={colors.primary}
              weight="duotone"
            />
          </View>
        </View>

        {/* Content Container (Card border and box bg removed) */}
        <View style={styles.contentContainer}>
          <Typo size={28} fontWeight="800" color={colors.white} style={styles.title}>
            Check your inbox!
          </Typo>
          
          <Typo size={16} color={colors.neutral400} style={styles.description}>
            We sent a secure activation link to:
          </Typo>

          {/* Email Pill Badge */}
          <View style={styles.emailPill}>
            <Icons.EnvelopeSimple size={18} color={colors.primary} weight="bold" />
            <Typo size={16} fontWeight="700" color={colors.primary} style={styles.emailText}>
              {user?.email || "your email address"}
            </Typo>
          </View>

          <Typo size={15} color={colors.neutral400} style={styles.hint}>
            {"Tap that link to confirm it's really you. If you don't see it in a minute, check your spam folder."}
          </Typo>

          {/* Real-time Checking Status Banner */}
          <View style={styles.statusBanner}>
            <ActivityIndicator size="small" color={colors.primary} style={styles.spinner} />
            <Typo size={13} fontWeight="500" color={colors.neutral400}>
              Checking verification automatically...
            </Typo>
          </View>
        </View>

        {/* Action Controls */}
        <View style={styles.buttonContainer}>
          {/* Primary Action: Open Mail App */}
          <Button onPress={handleOpenEmailApp}>
            <View style={styles.primaryButtonContent}>
              <Icons.EnvelopeSimpleOpen size={22} color={colors.black} weight="bold" />
              <Typo fontWeight="700" color={colors.black} size={18}>
                Open Email App
              </Typo>
            </View>
          </Button>

          {/* Secondary Backup Action: Manual Verification Check */}
          <TouchableOpacity
            style={styles.manualCheckBtn}
            onPress={handleCheckVerification}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={colors.neutral300} />
            ) : (
              <Typo fontWeight="600" color={colors.neutral300} size={15}>
                Already clicked it? Check now
              </Typo>
            )}
          </TouchableOpacity>

          {/* Action Row */}
          <View style={styles.subButtons}>
            <TouchableOpacity
              onPress={handleResendEmail}
              disabled={cooldown > 0 || isLoading}
              style={[styles.actionBtn, cooldown > 0 && styles.disabledLink]}
            >
              <Icons.PaperPlaneTilt size={16} color={cooldown > 0 ? colors.neutral600 : colors.primary} />
              <Typo
                fontWeight="700"
                size={14}
                color={cooldown > 0 ? colors.neutral600 : colors.primary}
              >
                {cooldown > 0 ? `Resend (${cooldown}s)` : "Resend Email"}
              </Typo>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleLogout} disabled={isLoading} style={styles.actionBtn}>
              <Icons.SignOut size={16} color={colors.rose} />
              <Typo fontWeight="700" size={14} color={colors.rose}>
                Use different email
              </Typo>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </ScreenWrapper>
  );
};

export default VerifyEmail;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacingX._20,
    justifyContent: "center",
    gap: spacingY._25,
  },
  iconContainer: {
    alignItems: "center",
    justifyContent: "center",
    height: verticalScale(140),
  },
  pulseRing: {
    position: "absolute",
    width: verticalScale(120),
    height: verticalScale(120),
    borderRadius: verticalScale(60),
    backgroundColor: colors.primary,
    opacity: 0.1,
  },
  iconWrapper: {
    width: verticalScale(100),
    height: verticalScale(100),
    borderRadius: verticalScale(50),
    backgroundColor: "rgba(99, 102, 241, 0.12)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "rgba(99, 102, 241, 0.25)",
    zIndex: 2,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
  },
  contentContainer: {
    alignItems: "center",
    gap: spacingY._15,
    paddingHorizontal: spacingX._10,
  },
  title: {
    textAlign: "center",
    letterSpacing: -0.5,
  },
  description: {
    textAlign: "center",
    marginTop: -5,
  },
  emailPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(99, 102, 241, 0.08)",
    paddingVertical: spacingY._10,
    paddingHorizontal: spacingX._15,
    borderRadius: radius._12,
    gap: 8,
    borderWidth: 1,
    borderColor: "rgba(99, 102, 241, 0.18)",
    marginVertical: spacingY._5,
  },
  emailText: {
    letterSpacing: -0.2,
  },
  hint: {
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: spacingX._10,
  },
  statusBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    paddingVertical: 8,
    paddingHorizontal: spacingX._12,
    borderRadius: radius._10,
    gap: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.03)",
  },
  spinner: {
    transform: [{ scale: 0.8 }],
  },
  buttonContainer: {
    gap: spacingY._12,
    width: "100%",
    marginTop: spacingY._10,
  },
  primaryButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  manualCheckBtn: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
  },
  subButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: spacingY._5,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: spacingX._10,
  },
  disabledLink: {
    opacity: 0.5,
  },
});
