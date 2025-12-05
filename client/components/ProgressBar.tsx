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
  dynamicColor?: boolean;
}

export function ProgressBar({ percentage, height = 8, color, dynamicColor = true }: ProgressBarProps) {
  const { theme } = useTheme();
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(Math.min(percentage, 100) / 100, {
      duration: 600,
      easing: Easing.out(Easing.cubic),
    });
  }, [percentage]);

  const getColor = () => {
    if (color) return color;
    if (!dynamicColor) return theme.primary;
    
    if (percentage >= 100) return theme.success;
    if (percentage >= 75) return theme.success;
    if (percentage >= 50) return theme.primary;
    if (percentage >= 25) return theme.warning;
    return theme.primary;
  };

  const animatedStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));

  return (
    <View style={[styles.container, { height, backgroundColor: theme.backgroundSecondary }]}>
      <Animated.View 
        style={[
          styles.fill, 
          { borderRadius: height / 2, backgroundColor: getColor() },
          animatedStyle,
        ]} 
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: BorderRadius.full,
    overflow: "hidden",
    width: "100%",
  },
  fill: {
    height: "100%",
  },
});
