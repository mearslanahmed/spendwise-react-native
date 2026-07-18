import { View, StyleSheet, FlatList, Dimensions, TouchableOpacity, NativeSyntheticEvent, NativeScrollEvent, ActivityIndicator } from 'react-native';
import React, { useRef, useState } from 'react';
import ModalWrapper from '@/components/ModalWrapper';
import Typo from '@/components/Typo';
import { colors, radius, spacingX, spacingY } from '@/constants/theme';
import { useTheme } from '@/contexts/themeContext';
import { HouseIcon, WalletIcon, ChartLineUpIcon, ChatCircleTextIcon, GearIcon, Icon, CurrencyCircleDollarIcon } from 'phosphor-react-native';
import { verticalScale } from '@/utils/styling';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Dropdown } from "react-native-element-dropdown";
import { useAuth } from "@/contexts/authContext";
import { doc, updateDoc } from "firebase/firestore";
import { firestore } from "@/config/firebase";

const { width } = Dimensions.get('window');

const currencies = [
  { label: "USD ($)", value: "$" },
  { label: "EUR (€)", value: "€" },
  { label: "GBP (£)", value: "£" },
  { label: "INR (₹)", value: "₹" },
  { label: "JPY (¥)", value: "¥" },
  { label: "PKR (Rs.)", value: "Rs." },
];

type SlideType = {
  id: string;
  title: string;
  description: string;
  IconComponent: Icon;
  iconColor: string;
};

const SLIDES: SlideType[] = [
  {
    id: '1',
    title: '1. Home Dashboard',
    description: 'Welcome to SpendWise! The Home tab is your dashboard. Tap the "+" button here to log an expense, or tap "Magic Scan" to let AI read your receipt instantly!',
    IconComponent: HouseIcon,
    iconColor: colors.primary,
  },
  {
    id: '2',
    title: '2. Manage Your Wallets',
    description: 'Head over to the Wallets tab to manage your Cash, Bank, and Card accounts. You\'ll need to create a Wallet here before you can start logging your spending.',
    IconComponent: WalletIcon,
    iconColor: '#3b82f6', // blue
  },
  {
    id: '3',
    title: '3. Analytics & Budgets',
    description: 'In the Statistics tab, you can view detailed graphs of your spending habits and set custom Monthly Budgets for different categories so you never overspend!',
    IconComponent: ChartLineUpIcon,
    iconColor: '#ef4444', // red
  },
  {
    id: '4',
    title: '4. AI Financial Advisor',
    description: 'Go to the Advisor tab and chat with our AI assistant. Not only can it give you smart financial advice, but you can also ask it to perform tasks like logging expenses for you!',
    IconComponent: ChatCircleTextIcon,
    iconColor: '#10b981', // green
  },
  {
    id: '5',
    title: '5. Profile & Settings',
    description: 'The Profile tab is your personal hub. You can update your settings, view notifications, and manage subscriptions.',
    IconComponent: GearIcon,
    iconColor: '#a855f7', // purple
  },
  {
    id: '6',
    title: '6. Quick Setup',
    description: 'Let\'s personalize your experience. Please select your preferred currency before we start tracking!',
    IconComponent: CurrencyCircleDollarIcon,
    iconColor: '#f59e0b', // yellow/amber
  },
];

const TutorialModal = () => {
  const { colors: themeColors } = useTheme();
  const router = useRouter();
  const { user, updateUserData } = useAuth();
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedCurrency, setSelectedCurrency] = useState(user?.currency || "$");
  const [loading, setLoading] = useState(false);
  
  const flatListRef = useRef<FlatList>(null);

  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const scrollPosition = event.nativeEvent.contentOffset.x;
    const index = Math.round(scrollPosition / width);
    if (index !== currentIndex) {
      setCurrentIndex(index);
    }
  };

  const finishTutorial = async () => {
    setLoading(true);
    try {
      if (user?.uid) {
        const userRef = doc(firestore, "users", user.uid);
        await updateDoc(userRef, { currency: selectedCurrency });
        await updateUserData(user.uid);
      }
      await AsyncStorage.setItem('hasSeenTutorial', 'true');
      router.back();
    } catch (e) {
      console.error("Error setting currency on onboarding:", e);
      // Let them pass anyway so they aren't stuck
      await AsyncStorage.setItem('hasSeenTutorial', 'true');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const nextSlide = () => {
    if (currentIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
    } else {
      finishTutorial();
    }
  };

  const renderItem = ({ item }: { item: SlideType }) => {
    const IconComponent = item.IconComponent;
    return (
      <View style={[styles.slideContainer, { width }]}>
        <View style={styles.iconContainer}>
          <IconComponent size={verticalScale(120)} color={item.iconColor} weight="duotone" />
        </View>
        <Typo size={26} fontWeight="700" style={styles.title} color={themeColors.text}>
          {item.title}
        </Typo>
        <Typo size={16} color={themeColors.textLight} style={styles.description}>
          {item.description}
        </Typo>

        {/* Conditional render for the 6th slide interactive setup */}
        {item.id === '6' && (
          <View style={{ marginTop: spacingY._30, width: '100%', paddingHorizontal: spacingX._20 }}>
             <Dropdown
                style={[styles.dropdownContainer, { backgroundColor: themeColors.inputBg, borderColor: themeColors.border }]}
                activeColor={themeColors.card}
                selectedTextStyle={[styles.dropdownSelectedText, { color: themeColors.text }]}
                iconStyle={[styles.dropdownIcon, { tintColor: themeColors.textLighter }]}
                data={currencies}
                maxHeight={250}
                labelField="label"
                valueField="value"
                itemTextStyle={[styles.dropdownItemText, { color: themeColors.text }]}
                itemContainerStyle={[styles.dropdownItemContainer, { backgroundColor: themeColors.inputBg }]}
                containerStyle={[styles.dropdownListContainer, { backgroundColor: themeColors.inputBg, borderColor: themeColors.border }]}
                value={selectedCurrency}
                onChange={(item) => setSelectedCurrency(item.value)}
                disable={loading}
              />
          </View>
        )}
      </View>
    );
  };

  return (
    <ModalWrapper>
      <View style={styles.container}>
        <FlatList
          ref={flatListRef}
          data={SLIDES}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={16}
          bounces={false}
        />
        
        {/* Pagination and Buttons */}
        <View style={styles.footer}>
          <View style={styles.pagination}>
            {SLIDES.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.dot,
                  { backgroundColor: currentIndex === index ? colors.primary : themeColors.textLight },
                  currentIndex === index && { width: 20 }
                ]}
              />
            ))}
          </View>
          
          <TouchableOpacity 
            style={[styles.button, { backgroundColor: colors.primary, opacity: loading ? 0.7 : 1 }]}
            onPress={nextSlide}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Typo size={18} fontWeight="700" color={colors.white}>
                {currentIndex === SLIDES.length - 1 ? "Get Started" : "Next"}
              </Typo>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </ModalWrapper>
  );
};

export default TutorialModal;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  slideContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacingX._20,
    paddingBottom: verticalScale(100),
  },
  iconContainer: {
    marginBottom: spacingY._30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    textAlign: 'center',
    marginBottom: spacingY._15,
  },
  description: {
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: spacingX._10,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacingX._20,
    paddingBottom: verticalScale(40),
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacingY._25,
  },
  dot: {
    height: 8,
    width: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  button: {
    height: verticalScale(50),
    borderRadius: radius._15,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  dropdownContainer: {
    height: verticalScale(50),
    borderWidth: 1,
    paddingHorizontal: spacingX._15,
    borderRadius: radius._15,
  },
  dropdownItemText: { 
    fontSize: verticalScale(14),
  },
  dropdownSelectedText: {
    fontSize: verticalScale(14),
  },
  dropdownListContainer: {
    borderRadius: radius._12,
    borderWidth: 1,
    top: 5,
  },
  dropdownItemContainer: {
    borderRadius: radius._10,
    marginHorizontal: spacingX._5,
  },
  dropdownIcon: {
    height: verticalScale(20),
  },
});
