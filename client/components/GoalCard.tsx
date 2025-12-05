import React from "react";
import { StyleSheet, Pressable, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { ProgressBar } from "@/components/ProgressBar";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import { Goal } from "@/lib/types";

interface GoalCardProps {
  goal: Goal;
  onPress: () => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("ru-RU", {
    style: "decimal",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function GoalCard({ goal, onPress }: GoalCardProps) {
  const scale = useSharedValue(1);
  const percentage = goal.targetAmount > 0 
    ? (goal.currentAmount / goal.targetAmount) * 100 
    : 0;

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.98, { damping: 15, stiffness: 150 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 150 });
  };

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[styles.card, animatedStyle]}
    >
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <MaterialCommunityIcons
            name="target"
            size={24}
            color={Colors.dark.primary}
          />
        </View>
        <View style={styles.titleContainer}>
          <ThemedText type="h4" numberOfLines={1}>
            {goal.name}
          </ThemedText>
          <ThemedText type="caption" secondary>
            {Math.round(percentage)}% выполнено
          </ThemedText>
        </View>
        <MaterialCommunityIcons
          name="chevron-right"
          size={24}
          color={Colors.dark.textSecondary}
        />
      </View>

      <View style={styles.amountContainer}>
        <ThemedText type="h2" style={styles.currentAmount}>
          {formatCurrency(goal.currentAmount)}
        </ThemedText>
        <ThemedText type="body" secondary>
          {" "}/ {formatCurrency(goal.targetAmount)}
        </ThemedText>
      </View>

      <ProgressBar percentage={percentage} />
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.dark.backgroundDefault,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.dark.backgroundSecondary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.sm,
  },
  titleContainer: {
    flex: 1,
  },
  amountContainer: {
    flexDirection: "row",
    alignItems: "baseline",
    marginBottom: Spacing.sm,
  },
  currentAmount: {
    color: Colors.dark.primary,
  },
});
