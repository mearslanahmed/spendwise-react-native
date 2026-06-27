import { ScrollView, StyleSheet, View } from "react-native";
import React from "react";
import ModalWrapper from "@/components/ModalWrapper";
import Header from "@/components/Header";
import BackButton from "@/components/BackButton";
import Typo from "@/components/Typo";
import { spacingX, spacingY } from "@/constants/theme";
import { useTheme } from "@/contexts/themeContext";

const PrivacyPolicyModal = () => {
  const { colors } = useTheme();
  return (
    <ModalWrapper>
      <View style={styles.container}>
        <Header
          title="Privacy Policy"
          leftIcon={<BackButton />}
          style={{ marginBottom: spacingY._10, marginTop: spacingY._10 }}
        />

        <ScrollView contentContainerStyle={styles.content}>
          <Typo size={15} color={colors.textLight} style={{ marginBottom: spacingY._10 }}>
            Last updated: June 27, 2026
          </Typo>

          <View style={styles.section}>
            <Typo size={18} fontWeight="700" color={colors.text}>
              Information We Collect
            </Typo>
            <Typo size={14} color={colors.textLight} style={{ lineHeight: 22 }}>
              When you use SpendWise, we collect the following types of information:
              {"\n"}• <Typo size={14} fontWeight="700" color={colors.text}>Account Data:</Typo> Your email address and display name used during registration.
              {"\n"}• <Typo size={14} fontWeight="700" color={colors.text}>Financial Data:</Typo> Transactions, budgets, subscriptions, categories, and wallet balances that you input manually.
              {"\n"}• <Typo size={14} fontWeight="700" color={colors.text}>Media:</Typo> Receipt images that you choose to upload for the &quot;Magic Scan&quot; feature.
            </Typo>
          </View>

          <View style={styles.section}>
            <Typo size={18} fontWeight="700" color={colors.text}>
              How We Use Your Information
            </Typo>
            <Typo size={14} color={colors.textLight} style={{ lineHeight: 22 }}>
              We use your data strictly to provide the core functionalities of the app. This includes authenticating your identity, securely syncing your financial data across your devices, and generating spending insights. We do not sell your personal data to third parties.
            </Typo>
          </View>

          <View style={styles.section}>
            <Typo size={18} fontWeight="700" color={colors.text}>
              Third-Party Services & APIs
            </Typo>
            <Typo size={14} color={colors.textLight} style={{ lineHeight: 22 }}>
              To provide advanced features, your data may be processed by the following secure third-party services:
              {"\n"}• <Typo size={14} fontWeight="700" color={colors.text}>Google Firebase:</Typo> Used for secure user authentication and database storage.
              {"\n"}• <Typo size={14} fontWeight="700" color={colors.text}>Cloudinary:</Typo> Used to securely host images you upload (such as receipts or profile pictures).
              {"\n"}• <Typo size={14} fontWeight="700" color={colors.text}>Google Gemini & Groq APIs:</Typo> If you use the &quot;Smart Assistant&quot; or &quot;Magic Scan&quot; features, your financial history (recent transactions, budgets, subscriptions) and receipt images are sent to these AI providers strictly to generate personalized advice and extract text. Your data is not used to train their AI models.
            </Typo>
          </View>

          <View style={styles.section}>
            <Typo size={18} fontWeight="700" color={colors.text}>
              Data Retention and Deletion
            </Typo>
            <Typo size={14} color={colors.textLight} style={{ lineHeight: 22 }}>
              Your data is retained as long as your account is active. You have the right to request the complete deletion of your account and all associated data at any time by contacting us, or by using the account deletion feature within the app (if available).
            </Typo>
          </View>

          <View style={styles.section}>
            <Typo size={18} fontWeight="700" color={colors.text}>
              Contact Us
            </Typo>
            <Typo size={14} color={colors.textLight} style={{ lineHeight: 22 }}>
              If you have any questions or concerns regarding this Privacy Policy or how your data is handled, please contact us at: privacy@spendwise.app
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
