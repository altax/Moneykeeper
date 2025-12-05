import React, { useEffect } from "react";
import { View, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { useTheme } from "@/hooks/useTheme";
import { BorderRadius } from "@/constants/theme";

interface ProgressBarProps {
  percentage: number;
  height?: number;
  color?: string;
  showBackground?: boolean;
}

export function ProgressBar({ 
  percentage, 
  height = 4, 
  color,
  showBackground = true,
}: ProgressBarProps) {
  const { theme } = useTheme();
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(Math.min(percentage, 100) / 100, {
      duration: 500,
      easing: Easing.out(Easing.quad),
    });
  }, [percentage]);

  const fillColor = color || (percentage >= 100 ? theme.success : theme.text);

  const animatedStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));

  return (
    <View 
      style={[
        styles.container, 
        { 
          height, 
          backgroundColor: showBackground ? theme.backgroundTertiary : "transparent",
          borderRadius: height / 2,
        },
      ]}
    >
      <Animated.View 
        style={[
          styles.fill, 
          { 
            borderRadius: height / 2, 
            backgroundColor: fillColor,
          },
          animatedStyle,
        ]} 
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: "hidden",
    width: "100%",
  },
  fill: {
    height: "100%",
  },
});
