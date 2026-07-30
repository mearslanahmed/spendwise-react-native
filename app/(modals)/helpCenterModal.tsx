import React, { useState } from "react";
import { StyleSheet, View, ScrollView, TouchableOpacity, Linking } from "react-native";
import ScreenWrapper from "@/components/ScreenWrapper";
import Header from "@/components/Header";
import BackButton from "@/components/BackButton";
import Typo from "@/components/Typo";
import Button from "@/components/Button";
import { useTheme } from "@/contexts/themeContext";
import { colors, radius, spacingX, spacingY } from "@/constants/theme";
import { verticalScale } from "@/utils/styling";
import * as Icons from "phosphor-react-native";
import Animated, { FadeIn, FadeOut, LinearTransition } from "react-native-reanimated";
import { useRouter } from "expo-router";

const faqs = [
  {
    question: "How do I track a new expense or income?",
    answer: "Tap the floating '+' button on the Home screen. From there, you can enter the amount, select a category, choose a wallet, and save the transaction.",
  },
  {
    question: "Can I link my real bank accounts?",
    answer: "Currently, SpendWise operates as a manual expense tracker to give you full control over your data. Bank synchronization is on our roadmap for future updates!",
  },
  {
    question: "How do budgets help me save money?",
    answer: "By setting a monthly budget for specific categories (e.g., Dining Out), you can visualize your spending limits in real-time. SpendWise tracks your progress to help prevent overspending.",
  },
  {
    question: "Is my financial data private and secure?",
    answer: "Yes. We use industry-standard encryption for all data linked to your account. We never sell your personal information or share your transaction history with third parties.",
  },
  {
    question: "How do I delete all my data and start over?",
    answer: "If you wish to completely wipe your wallets and transactions, you can reset your app data in the Settings menu. Please proceed with caution as this action cannot be undone.",
    actionText: "Go to Settings",
    actionRoute: "/(modals)/settingsModal",
  }
];

const FAQItem = ({ item, themeColors }: { item: any, themeColors: any }) => {
  const [expanded, setExpanded] = useState(false);
  const router = useRouter();

  return (
    <Animated.View layout={LinearTransition.duration(250)} style={[styles.faqContainer, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
      <TouchableOpacity 
        style={styles.faqHeader} 
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.7}
      >
        <Typo size={15} fontWeight="600" color={themeColors.text} style={{ flex: 1 }}>
          {item.question}
        </Typo>
        {expanded ? (
          <Icons.CaretUp size={verticalScale(20)} color={themeColors.textLighter} weight="bold" />
        ) : (
          <Icons.CaretDown size={verticalScale(20)} color={themeColors.textLighter} weight="bold" />
        )}
      </TouchableOpacity>
      
      {expanded && (
        <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(200)} style={styles.faqBody}>
          <Typo size={14} color={themeColors.textLighter} style={{ lineHeight: 22 }}>
            {item.answer}
          </Typo>
          {item.actionText && item.actionRoute && (
            <TouchableOpacity onPress={() => router.push(item.actionRoute)} style={{ marginTop: spacingY._10 }}>
              <Typo size={14} color={colors.primary} fontWeight="600">
                {item.actionText} &rarr;
              </Typo>
            </TouchableOpacity>
          )}
        </Animated.View>
      )}
    </Animated.View>
  );
};

const HelpCenterModal = () => {
  const { colors: themeColors } = useTheme();

  return (
    <ScreenWrapper>
      <View style={styles.container}>
        <Header 
          title="Help Center" 
          leftIcon={<BackButton />} 
          style={{ marginBottom: spacingY._15, marginTop: spacingY._10 }} 
        />
        
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.headerSection}>
            <Icons.Question size={verticalScale(45)} color={colors.primary} weight="duotone" />
            <Typo size={22} fontWeight="700" color={themeColors.text} style={{ marginTop: spacingY._10 }}>
              How can we help?
            </Typo>
            <Typo size={14} color={themeColors.textLighter} style={{ textAlign: "center", marginTop: spacingY._5 }}>
              Browse through our frequently asked questions to find answers to common issues.
            </Typo>
          </View>

          <View style={styles.faqList}>
            <Typo size={16} fontWeight="600" color={themeColors.text} style={{ marginBottom: spacingY._15 }}>
              Frequently Asked Questions
            </Typo>
            
            {faqs.map((faq, index) => (
              <FAQItem key={index} item={faq} themeColors={themeColors} />
            ))}
          </View>
          
          <View style={[styles.contactSection, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
            <Typo size={16} fontWeight="600" color={themeColors.text}>
              Still need help?
            </Typo>
            <Typo size={14} color={themeColors.textLighter} style={{ marginTop: spacingY._5, marginBottom: spacingY._15 }}>
              If you couldn&apos;t find the answer to your question, feel free to contact support.
            </Typo>
            <Button 
              onPress={() => Linking.openURL("mailto:spendwiseofficial@gmail.com")} 
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacingX._7 }}>
                <Icons.Headset size={20} color={colors.black} weight="bold" />
                <Typo color={colors.black} fontWeight="600" size={16}>Contact Support</Typo>
              </View>
            </Button>
          </View>

        </ScrollView>
      </View>
    </ScreenWrapper>
  );
};

export default HelpCenterModal;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacingX._20,
  },
  scrollContent: {
    paddingBottom: verticalScale(100),
    paddingTop: spacingY._20,
  },
  headerSection: {
    alignItems: "center",
    marginBottom: spacingY._30,
    paddingHorizontal: spacingX._10,
  },
  faqList: {
    marginBottom: spacingY._30,
  },
  faqContainer: {
    borderWidth: 1,
    borderRadius: radius._15,
    marginBottom: spacingY._15,
    overflow: "hidden",
  },
  faqHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: spacingX._15,
  },
  faqBody: {
    paddingHorizontal: spacingX._15,
    paddingBottom: spacingX._15,
    paddingTop: 0,
  },
  contactSection: {
    padding: spacingX._20,
    borderRadius: radius._15,
    borderWidth: 1,
  }
});
