import React, { useEffect, useState } from "react";
import { View, TouchableOpacity, StyleSheet, Platform, Keyboard } from "react-native";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { colors, radius } from "@/constants/theme";
import { verticalScale, scale } from "@/utils/styling";
import * as Icons from "phosphor-react-native";
import { useTheme } from "@/contexts/themeContext";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from "react-native-reanimated";

// Animated Tab Item Component
const TabItem = ({ route, isFocused, options, onPress, onLongPress, iconRender, themeColors }: any) => {
  const scaleValue = useSharedValue(isFocused ? 1.15 : 1);
  const dotOpacity = useSharedValue(isFocused ? 1 : 0);

  useEffect(() => {
    scaleValue.value = withTiming(isFocused ? 1.15 : 1, { duration: 200 });
    dotOpacity.value = withTiming(isFocused ? 1 : 0, { duration: 250 });
  }, [isFocused, scaleValue, dotOpacity]);

  const animatedIconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleValue.value }],
  }));

  const animatedDotStyle = useAnimatedStyle(() => ({
    opacity: dotOpacity.value,
    transform: [{ scale: dotOpacity.value }],
    backgroundColor: colors.primary, // Using primary color for the dot
  }));

  const handlePress = () => {
    if (!isFocused) {
      Haptics.selectionAsync(); // Subtle premium vibration
    }
    onPress();
  };

  return (
    <TouchableOpacity
      accessibilityState={isFocused ? { selected: true } : {}}
      accessibilityLabel={options.tabBarAccessibilityLabel}
      testID={options.tabBarButtonTestID}
      onPress={handlePress}
      onLongPress={onLongPress}
      style={styles.tabbarItem}
      activeOpacity={0.7}
    >
      <Animated.View style={animatedIconStyle}>
        {iconRender(isFocused)}
      </Animated.View>
      <Animated.View style={[styles.activeDot, animatedDotStyle]} />
    </TouchableOpacity>
  );
};


function CustomTabs(props: BottomTabBarProps) {
  "use no memo";
  return <CustomTabsContent {...props} />;
}

function CustomTabsContent({ state, descriptors, navigation }: BottomTabBarProps) {
  "use no memo";

  const { colors: themeColors, isDark } = useTheme();

  const [isKeyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
        Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
        () => setKeyboardVisible(true)
    );
    const keyboardDidHideListener = Keyboard.addListener(
        Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
        () => setKeyboardVisible(false)
    );

    return () => {
        keyboardDidHideListener.remove();
        keyboardDidShowListener.remove();
    };
  }, []);

  const tabbarIcons: any = { 
    home: (isFocused: boolean) => (
      <Icons.HouseIcon
        size={verticalScale(24)}
        weight={isFocused ? "fill" : "regular"}
        color={isFocused ? colors.primary : themeColors.textLighter}
      />
    ),

    statistics: (isFocused: boolean) => (
      <Icons.ChartBarIcon
        size={verticalScale(24)}
        weight={isFocused ? "fill" : "regular"}
        color={isFocused ? colors.primary : themeColors.textLighter}
      />
    ),

    aiAdvisor: (isFocused: boolean) => (
      <Icons.Sparkle
        size={verticalScale(24)}
        weight={isFocused ? "fill" : "regular"}
        color={isFocused ? colors.primary : themeColors.textLighter}
      />
    ),

    wallet: (isFocused: boolean) => (
      <Icons.WalletIcon
        size={verticalScale(24)}
        weight={isFocused ? "fill" : "regular"}
        color={isFocused ? colors.primary : themeColors.textLighter}
      />
    ),

    profile: (isFocused: boolean) => (
      <Icons.UserIcon
        size={verticalScale(24)}
        weight={isFocused ? "fill" : "regular"}
        color={isFocused ? colors.primary : themeColors.textLighter}
      />
    ),
  };

  const renderTabs = () => (
    <View style={styles.tabbarItemsContainer}>
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: "tabPress",
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name, route.params);
          }
        };

        const onLongPress = () => {
          navigation.emit({
            type: "tabLongPress",
            target: route.key,
          });
        };

        return (
          <TabItem
            key={route.key}
            route={route}
            isFocused={isFocused}
            options={options}
            onPress={onPress}
            onLongPress={onLongPress}
            iconRender={tabbarIcons[route.name]}
            themeColors={themeColors}
          />
        );
      })}
    </View>
  );

  if (isKeyboardVisible) {
    return null;
  }

  if (Platform.OS === 'ios') {
    return (
      <View style={styles.floatingContainer}>
        <BlurView 
          intensity={isDark ? 80 : 90} 
          tint={isDark ? "dark" : "light"} 
          style={styles.blurContainer}
        >
          {renderTabs()}
        </BlurView>
      </View>
    );
  }

  // Android: Samsung UI 8.5 style floating pill
  return (
    <View style={[styles.floatingContainer, styles.androidElevation]}>
      <View style={[styles.androidContainer, { backgroundColor: isDark ? colors.neutral800 : colors.white }]}>
        {renderTabs()}
      </View>
    </View>
  );
}

export default CustomTabs;

const styles = StyleSheet.create({
    floatingContainer: {
        position: 'absolute',
        bottom: verticalScale(20),
        left: scale(20),
        right: scale(20),
        height: verticalScale(65),
        borderRadius: radius._30,
        overflow: 'hidden',
    },
    blurContainer: {
        flex: 1,
        borderRadius: radius._30,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: 'rgba(255, 255, 255, 0.2)',
    },
    androidContainer: {
        flex: 1,
        borderRadius: radius._30,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    androidElevation: {
        overflow: 'visible',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 15,
        elevation: 10,
        borderRadius: radius._30,
    },
    tabbarItemsContainer: {
        flex: 1,
        flexDirection: "row",
        justifyContent: "space-around",
        alignItems: "center",
        paddingHorizontal: scale(10),
    },
    tabbarItem: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        height: '100%',
        position: 'relative', // Added for absolute dot positioning
    },
    activeDot: {
        position: 'absolute',
        bottom: verticalScale(12), // Positioning dot under icon
        width: 4,
        height: 4,
        borderRadius: 2,
    }
});