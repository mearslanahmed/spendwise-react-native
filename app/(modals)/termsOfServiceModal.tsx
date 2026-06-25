import { ScrollView, StyleSheet, View } from "react-native";
import React from "react";
import ModalWrapper from "@/components/ModalWrapper";
import Header from "@/components/Header";
import BackButton from "@/components/BackButton";
import Typo from "@/components/Typo";
import { colors, spacingX, spacingY } from "@/constants/theme";

const TermsOfServiceModal = () => {
  return (
    <ModalWrapper>
      <View style={styles.container}>
        <Header
          title="Terms of Service"
          leftIcon={<BackButton />}
          style={{ marginBottom: spacingY._10 }}
        />

        <ScrollView contentContainerStyle={styles.content}>
          <Typo size={15} color={colors.neutral300}>
            Last updated: January 28, 2026
          </Typo>

          <View style={styles.section}>
            <Typo size={18} fontWeight="700">
              1. Acceptance of Terms
            </Typo>
            <Typo size={14} color={colors.neutral300}>
              By creating an account or using SpendWise, you agree to follow and be bound
              by these Terms of Service. If you do not agree, please do not use the app.
            </Typo>
          </View>

          <View style={styles.section}>
            <Typo size={18} fontWeight="700">
              2. User Accounts
            </Typo>
            <Typo size={14} color={colors.neutral300}>
              You are responsible for safeguarding your login credentials. Any activity 
              carried out under your account is your sole responsibility. Please notify us 
              immediately if you suspect any security breaches.
            </Typo>
          </View>

          <View style={styles.section}>
            <Typo size={18} fontWeight="700">
              3. Data Ownership & Usage
            </Typo>
            <Typo size={14} color={colors.neutral300}>
              You retain all rights to the financial transactions, descriptions, and assets 
              you input into the app. We host and sync this data using secure cloud hosting 
              providers to deliver the core app experience.
            </Typo>
          </View>

          <View style={styles.section}>
            <Typo size={18} fontWeight="700">
              4. Premium Features
            </Typo>
            <Typo size={14} color={colors.neutral300}>
              Certain features may require a premium subscription or one-time purchase. 
              Pricing and terms will be clearly displayed before any transaction.
            </Typo>
          </View>

          <View style={styles.section}>
            <Typo size={18} fontWeight="700">
              5. Push Notifications & Privacy
            </Typo>
            <Typo size={14} color={colors.neutral300}>
              SpendWise may ask for permission to send you Push Notifications (e.g., budget alerts and daily reminders). These notifications are generated locally on your device or triggered securely. We do not sell or share your notification data or financial habits with third parties for marketing purposes. You can disable push notifications at any time in the app Settings.
            </Typo>
          </View>

          <View style={styles.section}>
            <Typo size={18} fontWeight="700">
              6. Limitation of Liability
            </Typo>
            <Typo size={14} color={colors.neutral300}>
              {"SpendWise is provided 'as is' without warranties of any kind. We do not guarantee uninterrupted service or that the app is entirely free of bugs or errors."}
            </Typo>
          </View>

          <View style={styles.section}>
            <Typo size={18} fontWeight="700">
              6. Changes to Terms
            </Typo>
            <Typo size={14} color={colors.neutral300}>
              We reserve the right to modify these terms at any time. Continued use of the 
              app following modifications constitutes acceptance of the new terms.
            </Typo>
          </View>
        </ScrollView>
      </View>
    </ModalWrapper>
  );
};

export default TermsOfServiceModal;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacingX._20,
  },
  content: {
    gap: spacingY._15,
    paddingBottom: spacingY._20,
  },
  section: {
    gap: spacingY._5,
  },
});
