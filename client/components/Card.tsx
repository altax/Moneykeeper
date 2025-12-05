import React from "react";
import { StyleSheet, Pressable, ViewStyle, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  WithSpringConfig,
} from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Responsive, Shadows } from "@/constants/theme";

interface CardProps {
  elevation?: "none" | "sm" | "md" | "lg";
  title?: string;
  description?: string;
  children?: React.ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
  pressable?: boolean;
}

const springConfig: WithSpringConfig = {
  damping: 15,
  mass: 0.3,
  stiffness: 150,
  overshootClamping: true,
  energyThreshold: 0.001,
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function Card({
  elevation = "sm",
  title,
  description,
  children,
  onPress,
  style,
  pressable = true,
}: CardProps) {
  const { theme } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    if (onPress && pressable) {
      scale.value = withSpring(0.98, springConfig);
    }
  };

  const handlePressOut = () => {
    if (onPress && pressable) {
      scale.value = withSpring(1, springConfig);
    }
  };

  const getShadow = () => {
    switch (elevation) {
      case "none":
        return {};
      case "md":
        return Shadows.md;
      case "lg":
        return Shadows.lg;
      default:
        return Shadows.sm;
    }
  };

  const cardStyle = [
    styles.card,
    {
      backgroundColor: theme.card,
      borderColor: theme.cardBorder,
    },
    getShadow(),
    style,
  ];

  if (onPress) {
    return (
      <AnimatedPressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[cardStyle, animatedStyle]}
      >
        {title ? (
          <ThemedText type="h4" style={styles.cardTitle}>
            {title}
          </ThemedText>
        ) : null}
        {description ? (
          <ThemedText type="small" secondary style={styles.cardDescription}>
            {description}
          </ThemedText>
        ) : null}
        {children}
      </AnimatedPressable>
    );
  }

  return (
    <View style={cardStyle}>
      {title ? (
        <ThemedText type="h4" style={styles.cardTitle}>
          {title}
        </ThemedText>
      ) : null}
      {description ? (
        <ThemedText type="small" secondary style={styles.cardDescription}>
          {description}
        </ThemedText>
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: Responsive.cardPadding,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
  },
  cardTitle: {
    marginBottom: Spacing.sm,
  },
  cardDescription: {
    marginBottom: Spacing.sm,
  },
});
