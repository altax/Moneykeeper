import React, { useEffect } from "react";
import { View, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  Easing,
} from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";
import { ThemedText } from "@/components/ThemedText";
import { Colors } from "@/constants/theme";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface CircularProgressProps {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
}

export function CircularProgress({
  percentage,
  size = 200,
  strokeWidth = 16,
  color,
}: CircularProgressProps) {
  const progress = useSharedValue(0);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  useEffect(() => {
    progress.value = withTiming(Math.min(percentage, 100) / 100, {
      duration: 800,
      easing: Easing.out(Easing.cubic),
    });
  }, [percentage]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - progress.value),
  }));

  const displayPercentage = Math.min(Math.round(percentage), 100);
  const strokeColor = color || Colors.light.primary;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size} style={styles.svg}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={Colors.light.backgroundSecondary}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          animatedProps={animatedProps}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={styles.textContainer}>
        <ThemedText type="hero" style={[styles.percentage, { color: strokeColor }]}>
          {displayPercentage}%
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: "center",
    alignItems: "center",
  },
  svg: {
    position: "absolute",
  },
  textContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  percentage: {
    textAlign: "center",
  },
});
