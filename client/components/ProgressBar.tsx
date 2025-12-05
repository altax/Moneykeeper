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
}

export function ProgressBar({ percentage, height = 8, color }: ProgressBarProps) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(Math.min(percentage, 100) / 100, {
      duration: 400,
      easing: Easing.out(Easing.cubic),
    });
  }, [percentage]);

  const animatedStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));

  return (
    <View style={[styles.container, { height }]}>
      <Animated.View 
        style={[
          styles.fill, 
          animatedStyle,
          color ? { backgroundColor: color } : null,
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
    backgroundColor: Colors.dark.primary,
    borderRadius: BorderRadius.xs,
  },
});
