import Button from "@/components/Button";
import ScreenWrapper from "@/components/ScreenWrapper";
import Typo from "@/components/Typo";
import { colors, spacingX, spacingY } from "@/constants/theme";
import { verticalScale } from "@/utils/styling";
import React, { useState } from "react";
import { StyleSheet, TouchableOpacity, View, FlatList, Dimensions, NativeSyntheticEvent, NativeScrollEvent } from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { useRouter } from "expo-router";
import { useTheme } from "@/contexts/themeContext";

const { width } = Dimensions.get('window');

const slides = [
  {
    id: '1',
    image: require("../../assets/images/splash-icon.png"),
    title1: "Take control",
    title2: "of your finances",
    sub1: "Track your spending, manage your budget,",
    sub2: "and let AI guide your financial future."
  },
  {
    id: '2',
    image: require("../../assets/images/magic-scan.png"),
    title1: "Magic Scan",
    title2: "Receipts Instantly",
    sub1: "Just snap a photo of your receipt.",
    sub2: "Our AI extracts the total and merchant."
  },
  {
    id: '3',
    image: require("../../assets/images/ai-advisor.png"),
    title1: "Your Personal",
    title2: "AI Advisor",
    sub1: "Chat with an intelligent assistant",
    sub2: "to get personalized wealth insights."
  }
];

const Welcome = () => {
  const router = useRouter();
  const { colors: themeColors, isDark } = useTheme();
  const [currentIndex, setCurrentIndex] = useState(0);

  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const slideSize = event.nativeEvent.layoutMeasurement.width;
    const index = event.nativeEvent.contentOffset.x / slideSize;
    setCurrentIndex(Math.round(index));
  };

  const renderItem = ({ item }: any) => {
    return (
      <View style={{ width, alignItems: 'center', justifyContent: 'center' }}>
        <Animated.Image
          entering={FadeIn.duration(1000)}
          source={item.image}
          style={styles.welcomeImage}
          resizeMode="contain"
        />
        
        <View style={{ alignItems: "center", marginTop: spacingY._20 }}>
            <Typo size={30} fontWeight={"800"}>{item.title1}</Typo>
            <Typo size={30} fontWeight={"800"}>{item.title2}</Typo>
        </View>
        <View style={{ alignItems: "center", marginTop: spacingY._15, gap: 2 }}>
            <Typo size={17} color={colors.textLight}>{item.sub1}</Typo>
            <Typo size={17} color={colors.textLight}>{item.sub2}</Typo>
        </View>
      </View>
    );
  };

  return (
    <ScreenWrapper>
      <View style={styles.container}>
        {/* login button */}
        <TouchableOpacity onPress={() => router.push('/(auth)/login')} style={styles.loginButton}>
          <Typo fontWeight={"500"}>Sign in</Typo>
        </TouchableOpacity>

        {/* Carousel */}
        <View style={{ flex: 1, paddingBottom: verticalScale(30) }}>
            <FlatList 
               data={slides}
               renderItem={renderItem}
               horizontal
               pagingEnabled
               showsHorizontalScrollIndicator={false}
               onScroll={onScroll}
               keyExtractor={(item) => item.id}
               bounces={false}
            />
        </View>

        {/* footer */}
        <View style={[styles.footer, { backgroundColor: themeColors.card, shadowColor: isDark ? 'white' : 'black' }]}>
          {/* Pagination Dots */}
          <View style={styles.paginationContainer}>
            {slides.map((_, index) => (
               <View 
                  key={index} 
                  style={[
                    styles.dot, 
                    { 
                      width: currentIndex === index ? 24 : 8, 
                      backgroundColor: currentIndex === index ? colors.primary : colors.neutral600 
                    }
                  ]} 
               />
            ))}
          </View>

          <Animated.View
            entering={FadeInDown.duration(1000).delay(200)}
            style={styles.buttonContainer}
          >
            <Button onPress={() => router.push('/(auth)/register')}>
              <Typo size={22} color={colors.neutral900} fontWeight={"600"}>
                Get Started
              </Typo>
            </Button>
          </Animated.View>
        </View>
      </View>
    </ScreenWrapper>
  );
};

export default Welcome;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "space-between",
    paddingTop: spacingY._7,
  },

  welcomeImage: {
    width: "80%",
    height: verticalScale(250),
    alignSelf: "center",
  },

  loginButton: {
    alignSelf: "flex-end",
    marginRight: spacingX._20,
    transform: [{ translateY: -spacingY._10 }],
    zIndex: 1,
    position: 'absolute',
    top: spacingY._15,
  },

  footer: {
    backgroundColor: colors.neutral900,
    alignItems: "center",
    paddingTop: verticalScale(25),
    paddingBottom: verticalScale(45),
    gap: spacingY._20,
    shadowColor: "white",
    shadowOffset: {
      width: 0,
      height: -10,
    },
    elevation: 10,
    shadowRadius: 25,
    shadowOpacity: 0.15,
  },

  paginationContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: spacingY._5,
  },

  dot: {
    height: 8,
    borderRadius: 4,
  },

  buttonContainer: {
    width: "100%",
    paddingHorizontal: spacingX._25,
  },
});
