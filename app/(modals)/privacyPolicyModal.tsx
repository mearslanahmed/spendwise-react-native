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
          style={{ marginBottom: spacingY._10, marginTop: spacingY._10 }}
        />

        <ScrollView contentContainerStyle={styles.content}>
          <Typo size={15} color={colors.neutral300}>
            Last updated: June 27, 2026
          </Typo>

          <View style={styles.section}>
            <Typo size={18} fontWeight="700">
              1. Information We Collect
            </Typo>
            <Typo size={14} color={colors.neutral300}>
              When you use SpendWise, we collect the following types of information:
              {"\n"}- <Typo fontWeight="700">Account Data:</Typo> Your email address and display name used during registration.
              {"\n"}- <Typo fontWeight="700">Financial Data:</Typo> Transactions, budgets, categories, and wallet balances that you input manually.
              {"\n"}- <Typo fontWeight="700">Media:</Typo> Receipt images that you choose to upload for the &quot;Magic Scan&quot; feature.
            </Typo>
          </View>

          <View style={styles.section}>
            <Typo size={18} fontWeight="700">
              2. How We Use Your Information
            </Typo>
            <Typo size={14} color={colors.neutral300}>
              We use your data strictly to provide the core functionalities of the app. This includes authenticating your identity, securely syncing your financial data across your devices, and generating spending insights. We do not sell your personal data to third parties.
            </Typo>
          </View>

          <View style={styles.section}>
            <Typo size={18} fontWeight="700">
              3. Third-Party Services & APIs
            </Typo>
            <Typo size={14} color={colors.neutral300}>
              To provide advanced features, your data may be processed by the following secure third-party services:
              {"\n"}- <Typo fontWeight="700">Google Firebase:</Typo> Used for secure user authentication and database storage.
              {"\n"}- <Typo fontWeight="700">Cloudinary:</Typo> Used to securely host images you upload (such as receipts or profile pictures).
              {"\n"}- <Typo fontWeight="700">Google Gemini & Groq APIs:</Typo> If you use the &quot;Magic Scan&quot; feature, the receipt image you select is sent to these AI providers strictly for the purpose of extracting the text, amount, and merchant name. Your images are not used to train their AI models.
            </Typo>
          </View>

          <View style={styles.section}>
            <Typo size={18} fontWeight="700">
              4. Data Retention and Deletion
            </Typo>
            <Typo size={14} color={colors.neutral300}>
              Your data is retained as long as your account is active. You have the right to request the complete deletion of your account and all associated data at any time by contacting us, or by using the account deletion feature within the app (if available).
            </Typo>
          </View>

          <View style={styles.section}>
            <Typo size={18} fontWeight="700">
              5. Contact Us
            </Typo>
            <Typo size={14} color={colors.neutral300}>
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
