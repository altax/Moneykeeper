import React from "react";
import { StyleSheet, Pressable, ViewStyle, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Responsive } from "@/constants/theme";

interface CardProps {
  variant?: "default" | "outlined" | "subtle";
  title?: string;
  description?: string;
  children?: React.ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
  noPadding?: boolean;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function Card({
  variant = "default",
  title,
  description,
  children,
  onPress,
  style,
  noPadding = false,
}: CardProps) {
  const { theme } = useTheme();
  const opacity = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const handlePressIn = () => {
    if (onPress) {
      opacity.value = withTiming(0.7, { duration: 100 });
    }
  };

  const handlePressOut = () => {
    if (onPress) {
      opacity.value = withTiming(1, { duration: 200 });
    }
  };

  const getVariantStyle = () => {
    switch (variant) {
      case "outlined":
        return {
          backgroundColor: "transparent",
          borderWidth: 1,
          borderColor: theme.border,
        };
      case "subtle":
        return {
          backgroundColor: theme.backgroundSecondary,
          borderWidth: 0,
        };
      default:
        return {
          backgroundColor: theme.card,
          borderWidth: 0,
        };
    }
  };

  const cardStyle = [
    styles.card,
    getVariantStyle(),
    noPadding && { padding: 0 },
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
          <ThemedText type="caption" secondary style={styles.cardTitle}>
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
        <ThemedText type="caption" secondary style={styles.cardTitle}>
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
    borderRadius: BorderRadius.md,
  },
  cardTitle: {
    marginBottom: Spacing.xs,
  },
  cardDescription: {
    marginBottom: Spacing.sm,
  },
});
