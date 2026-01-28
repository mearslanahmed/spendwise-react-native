import { ScrollView, StyleSheet, View } from "react-native";
import React from "react";
import ModalWrapper from "@/components/ModalWrapper";
import Header from "@/components/Header";
import BackButton from "@/components/BackButton";
import Typo from "@/components/Typo";
import { colors, spacingX, spacingY } from "@/constants/theme";

const PrivacyPolicyModal = () => {
  return (
    <ModalWrapper>
      <View style={styles.container}>
        <Header
          title="Privacy Policy"
          leftIcon={<BackButton />}
          style={{ marginBottom: spacingY._10 }}
        />

        <ScrollView contentContainerStyle={styles.content}>
          <Typo size={15} color={colors.neutral300}>
            Last updated: January 28, 2026
          </Typo>

          <View style={styles.section}>
            <Typo size={18} fontWeight="700">
              1. Information We Collect
            </Typo>
            <Typo size={14} color={colors.neutral300}>
              We collect information you provide (such as name and email) and
              data you create in the app, including wallets, transactions, and
              uploaded images.
            </Typo>
          </View>

          <View style={styles.section}>
            <Typo size={18} fontWeight="700">
              2. How We Use Your Information
            </Typo>
            <Typo size={14} color={colors.neutral300}>
              We use your information to authenticate your account, sync your
              data across devices, and provide core app features.
            </Typo>
          </View>

          <View style={styles.section}>
            <Typo size={18} fontWeight="700">
              3. Data Storage
            </Typo>
            <Typo size={14} color={colors.neutral300}>
              Your data is stored securely in Firebase services. We do not sell
              your personal data.
            </Typo>
          </View>

          <View style={styles.section}>
            <Typo size={18} fontWeight="700">
              4. Images & Uploads
            </Typo>
            <Typo size={14} color={colors.neutral300}>
              Images you upload are used only to personalize your profile or
              transactions and are stored securely.
            </Typo>
          </View>

          <View style={styles.section}>
            <Typo size={18} fontWeight="700">
              5. Your Choices
            </Typo>
            <Typo size={14} color={colors.neutral300}>
              You can update your profile information at any time. To delete
              your account or data, contact us using the details below.
            </Typo>
          </View>

          <View style={styles.section}>
            <Typo size={18} fontWeight="700">
              6. Contact
            </Typo>
            <Typo size={14} color={colors.neutral300}>
              If you have questions about this policy, contact us at:
              privacy@spendwise.app
            </Typo>
          </View>
        </ScrollView>
      </View>
    </ModalWrapper>
  );
};

export default PrivacyPolicyModal;

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
