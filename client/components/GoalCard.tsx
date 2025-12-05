import React from "react";
import { StyleSheet, Pressable, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { ThemedText } from "@/components/ThemedText";
import { ProgressBar } from "@/components/ProgressBar";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import { Goal } from "@/lib/types";

interface GoalCardProps {
  goal: Goal;
  onPress: () => void;
  onQuickAdd?: () => void;
  daysToGoal?: number | null;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("ru-RU", {
    style: "decimal",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function GoalCard({ goal, onPress, onQuickAdd, daysToGoal }: GoalCardProps) {
  const scale = useSharedValue(1);
  const percentage = goal.targetAmount > 0 
    ? Math.min((goal.currentAmount / goal.targetAmount) * 100, 100) 
    : 0;
  const isCompleted = goal.currentAmount >= goal.targetAmount;
  const remaining = Math.max(0, goal.targetAmount - goal.currentAmount);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.98, { damping: 15, stiffness: 150 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 150 });
  };

  const handleQuickAdd = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onQuickAdd?.();
  };

  const iconName = goal.icon || "target";

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        styles.card, 
        animatedStyle,
        isCompleted && styles.cardCompleted,
      ]}
    >
      <View style={styles.header}>
        <View style={[
          styles.iconContainer,
          isCompleted && styles.iconContainerCompleted,
        ]}>
          <MaterialCommunityIcons
            name={isCompleted ? "check-circle" : iconName as any}
            size={24}
            color={isCompleted ? Colors.light.success : Colors.light.primary}
          />
        </View>
        <View style={styles.titleContainer}>
          <ThemedText type="h4" numberOfLines={1}>
            {goal.name}
          </ThemedText>
          {isCompleted ? (
            <ThemedText type="caption" style={styles.completedText}>
              Цель достигнута!
            </ThemedText>
          ) : (
            <ThemedText type="caption" secondary>
              {Math.round(percentage)}% выполнено
            </ThemedText>
          )}
        </View>
        {onQuickAdd && !isCompleted ? (
          <Pressable
            onPress={handleQuickAdd}
            style={({ pressed }) => [
              styles.quickAddButton,
              pressed && styles.quickAddButtonPressed,
            ]}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <MaterialCommunityIcons
              name="plus"
              size={20}
              color={Colors.light.primary}
            />
          </Pressable>
        ) : null}
        <MaterialCommunityIcons
          name="chevron-right"
          size={24}
          color={Colors.light.textSecondary}
        />
      </View>

      <View style={styles.amountContainer}>
        <ThemedText type="h2" style={[
          styles.currentAmount,
          isCompleted && styles.currentAmountCompleted,
        ]}>
          {formatCurrency(goal.currentAmount)}
        </ThemedText>
        <ThemedText type="body" secondary>
          {" "}/ {formatCurrency(goal.targetAmount)}
        </ThemedText>
      </View>

      <ProgressBar 
        percentage={percentage} 
        color={isCompleted ? Colors.light.success : undefined}
        dynamicColor={!isCompleted}
      />

      {!isCompleted ? (
        <View style={styles.remainingRow}>
          <View style={styles.remainingInfo}>
            <MaterialCommunityIcons
              name="flag-outline"
              size={16}
              color={Colors.light.warning}
            />
            <ThemedText type="small" style={styles.remainingText}>
              Осталось: {formatCurrency(remaining)} руб.
            </ThemedText>
          </View>
          {daysToGoal !== null && daysToGoal !== undefined && daysToGoal > 0 ? (
            <View style={styles.daysInfo}>
              <MaterialCommunityIcons
                name="calendar-clock"
                size={14}
                color={Colors.light.textSecondary}
              />
              <ThemedText type="caption" secondary>
                {daysToGoal} {getDaysWord(daysToGoal)}
              </ThemedText>
            </View>
          ) : null}
        </View>
      ) : null}
    </AnimatedPressable>
  );
}

function getDaysWord(days: number): string {
  const lastTwo = days % 100;
  const lastOne = days % 10;
  
  if (lastTwo >= 11 && lastTwo <= 19) {
    return "дней";
  }
  if (lastOne === 1) {
    return "день";
  }
  if (lastOne >= 2 && lastOne <= 4) {
    return "дня";
  }
  return "дней";
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.light.card,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardCompleted: {
    borderWidth: 1,
    borderColor: Colors.light.success,
    backgroundColor: "rgba(16, 185, 129, 0.05)",
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
    backgroundColor: Colors.light.backgroundSecondary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.sm,
  },
  iconContainerCompleted: {
    backgroundColor: "rgba(16, 185, 129, 0.15)",
  },
  titleContainer: {
    flex: 1,
  },
  completedText: {
    color: Colors.light.success,
  },
  quickAddButton: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.light.backgroundSecondary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.sm,
  },
  quickAddButtonPressed: {
    backgroundColor: Colors.light.primaryLight,
  },
  amountContainer: {
    flexDirection: "row",
    alignItems: "baseline",
    marginBottom: Spacing.sm,
  },
  currentAmount: {
    color: Colors.light.primary,
  },
  currentAmountCompleted: {
    color: Colors.light.success,
  },
  remainingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
  },
  remainingInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  remainingText: {
    color: Colors.light.warning,
  },
  daysInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
});
