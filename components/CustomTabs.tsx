import { View, TouchableOpacity, StyleSheet, Platform } from "react-native";
import { Text } from "@react-navigation/elements";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { colors, spacingY } from "@/constants/theme";
import { verticalScale } from "@/utils/styling";
import * as Icons from "phosphor-react-native";
import { useTheme } from "@/contexts/themeContext";

function CustomTabs(props: BottomTabBarProps) {
  "use no memo";
  return <CustomTabsContent {...props} />;
}

function CustomTabsContent({ state, descriptors, navigation }: BottomTabBarProps) {
  "use no memo";

  const { colors: themeColors } = useTheme();

  const tabbarIcons: any = { 
    home: (isFocused: boolean) => (
      <Icons.HouseIcon
        size={verticalScale(30)}
        weight={isFocused ? "fill" : "regular"}
        color={isFocused ? colors.primary : themeColors.textLighter}
      />
    ),

    statistics: (isFocused: boolean) => (
      <Icons.ChartBarIcon
        size={verticalScale(30)}
        weight={isFocused ? "fill" : "regular"}
        color={isFocused ? colors.primary : themeColors.textLighter}
      />
    ),

    wallet: (isFocused: boolean) => (
      <Icons.WalletIcon
        size={verticalScale(30)}
        weight={isFocused ? "fill" : "regular"}
        color={isFocused ? colors.primary : themeColors.textLighter}
      />
    ),

    profile: (isFocused: boolean) => (
      <Icons.UserIcon
        size={verticalScale(30)}
        weight={isFocused ? "fill" : "regular"}
        color={isFocused ? colors.primary : themeColors.textLighter}
      />
    ),
  };
  return (
    <View style={[styles.tabbar, { backgroundColor: themeColors.card, borderTopColor: themeColors.border }]}>
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const label: any =
          options.tabBarLabel !== undefined
            ? options.tabBarLabel
            : options.title !== undefined
            ? options.title
            : route.name;

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
          <TouchableOpacity
            key={route.key}
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel}
            testID={options.tabBarButtonTestID}
            onPress={onPress}
            onLongPress={onLongPress}
            style={styles.tabbarItem}
          >
            {tabbarIcons[route.name]?.(isFocused)}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default CustomTabs;

const styles = StyleSheet.create({
    tabbar: {
        flexDirection: "row", 
        width: "100%", 
        height: Platform.OS === 'ios' ? verticalScale(73) : verticalScale(55),
        backgroundColor: colors.neutral800,
        justifyContent: "space-around",
        alignItems: "center",
        borderTopColor: colors.neutral700,
        borderTopWidth: 1,
    },

    tabbarItem: {
        marginBottom: Platform.OS === 'ios' ? spacingY._10 : spacingY._5,
        alignItems: "center",
        justifyContent: "center",
    }
});