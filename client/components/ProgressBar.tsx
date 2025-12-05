import React, { useEffect } from "react";
import { View, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  interpolateColor,
} from "react-native-reanimated";
import { Colors, BorderRadius } from "@/constants/theme";

interface ProgressBarProps {
  percentage: number;
  height?: number;
  color?: string;
  dynamicColor?: boolean;
}

function getProgressColor(percentage: number): string {
  if (percentage >= 100) {
    return Colors.dark.success;
  } else if (percentage >= 75) {
    return "#66BB6A";
  } else if (percentage >= 50) {
    return Colors.dark.warning;
  } else if (percentage >= 25) {
    return "#FFA726";
  } else {
    return Colors.dark.primary;
  }
}

export function ProgressBar({ percentage, height = 8, color, dynamicColor = true }: ProgressBarProps) {
  const progress = useSharedValue(0);
  const colorProgress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(Math.min(percentage, 100) / 100, {
      duration: 400,
      easing: Easing.out(Easing.cubic),
    });
    colorProgress.value = withTiming(Math.min(percentage, 100), {
      duration: 400,
      easing: Easing.out(Easing.cubic),
    });
  }, [percentage]);

  const animatedStyle = useAnimatedStyle(() => {
    let backgroundColor = Colors.dark.primary;
    
    if (color) {
      backgroundColor = color;
    } else if (dynamicColor) {
      if (colorProgress.value >= 100) {
        backgroundColor = Colors.dark.success;
      } else if (colorProgress.value >= 75) {
        backgroundColor = "#66BB6A";
      } else if (colorProgress.value >= 50) {
        backgroundColor = Colors.dark.warning;
      } else if (colorProgress.value >= 25) {
        backgroundColor = "#FFA726";
      } else {
        backgroundColor = Colors.dark.primary;
      }
    }
    
    return {
      width: `${progress.value * 100}%`,
      backgroundColor,
    };
  });

  return (
    <View style={[styles.container, { height }]}>
      <Animated.View 
        style={[
          styles.fill, 
          animatedStyle,
        ]} 
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.dark.backgroundSecondary,
    borderRadius: BorderRadius.xs,
    overflow: "hidden",
    width: "100%",
  },
  fill: {
    height: "100%",
    borderRadius: BorderRadius.xs,
  },
});
