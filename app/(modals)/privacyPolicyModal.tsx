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

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <Typo size={15} color={colors.textLight} style={{ marginBottom: spacingY._10 }}>
            Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </Typo>

          <View style={styles.section}>
            <Typo size={18} fontWeight="700" color={colors.text}>
              1. Introduction & Proper Declaration
            </Typo>
            <Typo size={14} color={colors.textLight} style={{ lineHeight: 22 }}>
              SpendWise is committed to protecting your privacy and ensuring complete transparency regarding how we handle your personal and financial data. By using our services, you consent to the data practices described in this statement.
            </Typo>
          </View>

          <View style={styles.section}>
            <Typo size={18} fontWeight="700" color={colors.text}>
              2. Information We Collect
            </Typo>
            <Typo size={14} color={colors.textLight} style={{ lineHeight: 22 }}>
              We strictly collect only the information necessary to operate SpendWise:
              {"\n\n"}• <Typo size={14} fontWeight="700" color={colors.text}>Account Information:</Typo> Your email address and basic profile information used for secure authentication.
              {"\n\n"}• <Typo size={14} fontWeight="700" color={colors.text}>Financial Data:</Typo> Transactions, budgets, and manual expense entries you input into the app.
              {"\n\n"}• <Typo size={14} fontWeight="700" color={colors.text}>Receipt Images:</Typo> When you manually attach a picture or use the &quot;Smart Scanner&quot;, the image is securely stored in our cloud storage (Cloudinary) so it remains permanently attached to your transaction record.
              {"\n\n"}• <Typo size={14} fontWeight="700" color={colors.text}>Device Permissions:</Typo> We request access to your device&apos;s Camera (strictly for capturing receipts) and Notifications (for budget alerts). We do not collect background hardware diagnostics or device identifiers.
            </Typo>
          </View>

          <View style={styles.section}>
            <Typo size={18} fontWeight="700" color={colors.text}>
              3. How We Use Your Information
            </Typo>
            <Typo size={14} color={colors.textLight} style={{ lineHeight: 22 }}>
              We use the collected information for the following specific purposes:
              {"\n\n"}• <Typo size={14} fontWeight="700" color={colors.text}>To Provide the Service:</Typo> Enabling you to track expenses, manage wallets, and view your historical transactions alongside their attached Cloudinary receipt images.
              {"\n\n"}• <Typo size={14} fontWeight="700" color={colors.text}>AI Processing:</Typo> Your transaction data and scanned receipt images are processed using advanced Artificial Intelligence models (primarily Google Gemini, with Groq utilized as a secure fallback system). This allows us to instantly extract totals, categorize expenses, and power the AI financial chat.
            </Typo>
          </View>

          <View style={styles.section}>
            <Typo size={18} fontWeight="700" color={colors.text}>
              4. Data Retention and Deletion
            </Typo>
            <Typo size={14} color={colors.textLight} style={{ lineHeight: 22 }}>
              We retain your personal data only for as long as necessary. You have the absolute right to request the permanent deletion of your account and all associated data at any time.
              {"\n\n"}You can delete your account directly within the SpendWise app settings (Settings {'>'} Danger Zone). Alternatively, you may submit an out-of-app deletion request by emailing us with the subject &quot;Account Deletion Request&quot;.
            </Typo>
          </View>

          <View style={styles.section}>
            <Typo size={18} fontWeight="700" color={colors.text}>
              5. Contact Us
            </Typo>
            <Typo size={14} color={colors.textLight} style={{ lineHeight: 22 }}>
              If you have any detailed questions about this Privacy Policy or data compliance requests, please contact our Data Protection Officer at:
              {"\n"}spendwiseoffical@gmail.com
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
