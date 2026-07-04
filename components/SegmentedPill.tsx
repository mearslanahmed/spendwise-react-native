import React, { useRef, useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Animated, LayoutChangeEvent, Easing } from 'react-native';
import { colors, radius, spacingX, spacingY } from '@/constants/theme';
import { useTheme } from '@/contexts/themeContext';
import Typo from './Typo';
import { verticalScale } from '@/utils/styling';

type SegmentedPillProps = {
  tabs: string[];
  activeIndex: number;
  onChange: (index: number) => void;
  style?: any;
};

const SegmentedPill = ({ tabs, activeIndex, onChange, style }: SegmentedPillProps) => {
  const { colors: themeColors, isDark } = useTheme();
  const [containerWidth, setContainerWidth] = useState(0);
  
  const PADDING = spacingX._5;
  const tabWidth = containerWidth > 0 ? (containerWidth - PADDING * 2) / tabs.length : 0;
  
  const translateX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (tabWidth > 0) {
      Animated.timing(translateX, {
        toValue: activeIndex * tabWidth,
        useNativeDriver: true,
        duration: 200,
        easing: Easing.out(Easing.cubic),
      }).start();
    }
  }, [activeIndex, tabWidth, translateX]);

  const onLayout = (e: LayoutChangeEvent) => {
    setContainerWidth(e.nativeEvent.layout.width);
  };

  return (
    <View 
      style={[
        styles.container, 
        { 
          backgroundColor: isDark ? themeColors.inputBg : colors.neutral100,
          borderColor: themeColors.border,
          paddingHorizontal: PADDING,
        },
        style
      ]}
      onLayout={onLayout}
    >
      {/* Sliding Active Pill Background */}
      {containerWidth > 0 && (
        <Animated.View 
          style={[
            styles.activePill,
            {
              width: tabWidth,
              backgroundColor: colors.primary,
              left: PADDING,
              transform: [{ translateX }]
            }
          ]}
        />
      )}

      {/* Tabs */}
      <View style={[styles.tabsContainer, { left: PADDING, right: PADDING }]}>
        {tabs.map((tab, index) => {
          const isActive = activeIndex === index;
          return (
            <TouchableOpacity
              key={index}
              style={styles.tab}
              onPress={() => onChange(index)}
              activeOpacity={0.7}
            >
              <Typo 
                size={13} 
                fontWeight={isActive ? "700" : "600"}
                color={isActive ? colors.white : themeColors.textLight}
              >
                {tab}
              </Typo>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

export default SegmentedPill;

const styles = StyleSheet.create({
  container: {
    height: verticalScale(40),
    borderRadius: radius._30,
    borderWidth: 1,
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  tabsContainer: {
    flexDirection: 'row',
    flex: 1,
    position: 'absolute',
    top: 0,
    bottom: 0,
    zIndex: 2,
  },
  tab: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activePill: {
    position: 'absolute',
    top: spacingY._5,
    bottom: spacingY._5,
    borderRadius: radius._30,
    zIndex: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  }
});
