import React from "react";
import { StyleSheet, Pressable, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import { Contribution, Goal } from "@/lib/types";

interface ContributionItemProps {
  contribution: Contribution;
  goal?: Goal;
  onPress?: () => void;
  showGoalName?: boolean;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("ru-RU", {
    style: "decimal",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ContributionItem({
  contribution,
  goal,
  onPress,
  showGoalName = false,
}: ContributionItemProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    if (onPress) {
      scale.value = withSpring(0.98, { damping: 15, stiffness: 150 });
    }
  };

  const handlePressOut = () => {
    if (onPress) {
      scale.value = withSpring(1, { damping: 15, stiffness: 150 });
    }
  };

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={!onPress}
      style={[styles.item, animatedStyle]}
    >
      <View style={styles.iconContainer}>
        <MaterialCommunityIcons
          name="plus-circle"
          size={24}
          color={Colors.dark.success}
        />
      </View>
      <View style={styles.content}>
        <ThemedText type="bodyLarge" style={styles.amount}>
          +{formatCurrency(contribution.amount)}
        </ThemedText>
        {showGoalName && goal ? (
          <ThemedText type="small" secondary numberOfLines={1}>
            {goal.name}
          </ThemedText>
        ) : null}
        {contribution.note ? (
          <ThemedText type="caption" secondary numberOfLines={1}>
            {contribution.note}
          </ThemedText>
        ) : null}
      </View>
      <ThemedText type="caption" secondary>
        {formatTime(contribution.date)}
      </ThemedText>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  item: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.dark.backgroundDefault,
    borderRadius: BorderRadius.md,
  },
  iconContainer: {
    marginRight: Spacing.sm,
  },
  content: {
    flex: 1,
  },
  amount: {
    color: Colors.dark.success,
    fontWeight: "600",
  },
});
