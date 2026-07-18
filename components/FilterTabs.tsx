import React from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import Typo from './Typo';
import { colors, radius, spacingX, spacingY } from '@/constants/theme';
import { useTheme } from '@/contexts/themeContext';
import { scale } from '@/utils/styling';

interface FilterTabsProps {
  filters: string[];
  activeFilter: string;
  onFilterSelect: (filter: string) => void;
  style?: any;
}

const FilterTabs = ({ filters, activeFilter, onFilterSelect, style }: FilterTabsProps) => {
  const { colors: themeColors, isDark } = useTheme();

  return (
    <View style={[styles.container, style]}>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        style={{ flexGrow: 0 }}
      >
        {filters.map((filter, index) => {
          const isActive = filter === activeFilter;
          return (
            <TouchableOpacity
              key={index}
              style={[
                styles.pill,
                {
                  backgroundColor: isActive ? colors.primary : (isDark ? themeColors.inputBg : colors.neutral100),
                  borderColor: isActive ? colors.primary : themeColors.border,
                }
              ]}
              onPress={() => onFilterSelect(filter)}
            >
              <Typo 
                size={12} 
                fontWeight={isActive ? "600" : "500"}
                color={isActive ? colors.black : themeColors.textLighter}
              >
                {filter}
              </Typo>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

export default FilterTabs;

const styles = StyleSheet.create({
  container: {
    marginVertical: spacingY._10,
  },
  scrollContent: {
    paddingHorizontal: spacingX._7,
    gap: scale(6),
    alignItems: 'center',
  },
  pill: {
    paddingVertical: spacingY._5,
    paddingHorizontal: spacingX._10,
    borderRadius: radius._20,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  }
});
