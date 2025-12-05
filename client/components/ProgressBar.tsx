import React, { useEffect } from "react";
import { View, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { Colors, BorderRadius } from "@/constants/theme";

interface ProgressBarProps {
  percentage: number;
  height?: number;
  color?: string;
  dynamicColor?: boolean;
}

export function ProgressBar({ percentage, height = 6, color, dynamicColor = true }: ProgressBarProps) {
  const progress = useSharedValue(0);
  const colorProgress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(Math.min(percentage, 100) / 100, {
      duration: 500,
      easing: Easing.out(Easing.cubic),
    });
    colorProgress.value = withTiming(Math.min(percentage, 100), {
      duration: 500,
      easing: Easing.out(Easing.cubic),
    });
  }, [percentage]);

  const animatedStyle = useAnimatedStyle(() => {
    let backgroundColor = Colors.light.primary;
    
    if (color) {
      backgroundColor = color;
    } else if (dynamicColor) {
      if (colorProgress.value >= 100) {
        backgroundColor = Colors.light.success;
      } else if (colorProgress.value >= 75) {
        backgroundColor = Colors.light.successLight;
      } else if (colorProgress.value >= 50) {
        backgroundColor = Colors.light.primary;
      } else if (colorProgress.value >= 25) {
        backgroundColor = Colors.light.primaryLight;
      } else {
        backgroundColor = Colors.light.accent;
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
          { borderRadius: height / 2 },
          animatedStyle,
        ]} 
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.light.backgroundTertiary,
    borderRadius: BorderRadius.full,
    overflow: "hidden",
    width: "100%",
  },
  fill: {
    height: "100%",
  },
});
