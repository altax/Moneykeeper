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
          color={Colors.light.success}
        />
      </View>
      <View style={styles.content}>
        <View style={styles.mainRow}>
          <ThemedText type="bodyLarge" style={styles.amount}>
            +{formatCurrency(contribution.amount)} руб.
          </ThemedText>
          <ThemedText type="caption" secondary>
            {formatTime(contribution.date)}
          </ThemedText>
        </View>
        {showGoalName && goal ? (
          <View style={styles.goalRow}>
            <MaterialCommunityIcons
              name="target"
              size={14}
              color={Colors.light.primary}
            />
            <ThemedText type="small" style={styles.goalName} numberOfLines={1}>
              {goal.name}
            </ThemedText>
          </View>
        ) : null}
        {contribution.note ? (
          <ThemedText type="caption" secondary numberOfLines={1} style={styles.note}>
            {contribution.note}
          </ThemedText>
        ) : null}
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  item: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: BorderRadius.md,
  },
  iconContainer: {
    marginRight: Spacing.sm,
    marginTop: 2,
  },
  content: {
    flex: 1,
  },
  mainRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  amount: {
    color: Colors.light.success,
    fontWeight: "600",
  },
  goalRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
    backgroundColor: Colors.light.card,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    alignSelf: "flex-start",
  },
  goalName: {
    color: Colors.light.primary,
  },
  note: {
    marginTop: 4,
  },
});
