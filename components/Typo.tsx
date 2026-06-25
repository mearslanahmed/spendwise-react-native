import { StyleSheet, Text, TextStyle, View } from "react-native";
import React from "react";
import { colors as staticColors } from "@/constants/theme";
import { TypoProps } from "@/types";
import { verticalScale } from "@/utils/styling";
import { useTheme } from "@/contexts/themeContext";

const Typo = ({
  size,
  color = staticColors.text,
  fontWeight = "400",
  children,
  style,
  textProps = {},
}: TypoProps) => {
  const { colors: themeColors, isDark } = useTheme();

  let resolvedColor = color;
  if (!isDark) {
    if (color === staticColors.text || color === '#fff' || color === '#ffffff') {
      resolvedColor = themeColors.text;
    } else if (color === staticColors.neutral100 || color === '#f5f5f5') {
      resolvedColor = themeColors.text;
    } else if (color === staticColors.neutral200 || color === '#e5e5e5') {
      resolvedColor = themeColors.textLight;
    } else if (color === staticColors.neutral300 || color === '#d4d4d4') {
      resolvedColor = themeColors.textLighter;
    } else if (color === staticColors.neutral400 || color === '#a3a3a3') {
      resolvedColor = '#525252'; // neutral600
    } else if (color === staticColors.primary || color === '#a3e635') {
      resolvedColor = staticColors.green;
    }
  } else {
    if (color === staticColors.text) {
      resolvedColor = themeColors.text;
    }
  }

  const textStyle: TextStyle = {
    fontSize: size ? verticalScale(size) : verticalScale(18),
    color: resolvedColor,
    fontWeight,
  };

  return (
    <Text style={[textStyle, style]} {...textProps}>
      {children}
    </Text>
  );
};

export default Typo;

const styles = StyleSheet.create({});
