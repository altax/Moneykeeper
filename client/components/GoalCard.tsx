import React from "react";
import { StyleSheet, Pressable, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { ThemedText } from "@/components/ThemedText";
import { ProgressBar } from "@/components/ProgressBar";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { Goal } from "@/lib/types";

interface GoalCardProps {
  goal: Goal;
  onPress: () => void;
  onQuickAdd?: () => void;
  daysToGoal?: number | null;
  compact?: boolean;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("ru-RU", {
    style: "decimal",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
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

export function GoalCard({ goal, onPress, onQuickAdd, daysToGoal, compact = false }: GoalCardProps) {
  const { theme } = useTheme();
  const opacity = useSharedValue(1);
  const percentage = goal.targetAmount > 0 
    ? Math.min((goal.currentAmount / goal.targetAmount) * 100, 100) 
    : 0;
  const isCompleted = goal.currentAmount >= goal.targetAmount;
  const remaining = Math.max(0, goal.targetAmount - goal.currentAmount);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const handlePressIn = () => {
    opacity.value = withTiming(0.6, { duration: 100 });
  };

  const handlePressOut = () => {
    opacity.value = withTiming(1, { duration: 200 });
  };

  const handleQuickAdd = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onQuickAdd?.();
  };

  if (compact) {
    return (
      <AnimatedPressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[styles.compactCard, { borderBottomColor: theme.divider }, animatedStyle]}
      >
        <View style={styles.compactLeft}>
          <ThemedText type="body" numberOfLines={1} style={styles.compactTitle}>
            {goal.name}
          </ThemedText>
          <View style={styles.compactProgressRow}>
            <ProgressBar percentage={percentage} height={3} />
          </View>
        </View>
        <View style={styles.compactRight}>
          <ThemedText type="body" style={{ fontWeight: "500" }}>
            {formatCurrency(goal.currentAmount)}
          </ThemedText>
          <ThemedText type="small" tertiary>
            из {formatCurrency(goal.targetAmount)}
          </ThemedText>
        </View>
        <MaterialCommunityIcons
          name="chevron-right"
          size={20}
          color={theme.textTertiary}
        />
      </AnimatedPressable>
    );
  }

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[styles.card, { borderBottomColor: theme.divider }, animatedStyle]}
    >
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleRow}>
          <ThemedText type="body" numberOfLines={1} style={styles.cardTitle}>
            {goal.name}
          </ThemedText>
          {isCompleted && (
            <View style={[styles.completedBadge, { backgroundColor: theme.successMuted }]}>
              <ThemedText type="caption" style={{ color: theme.success, fontSize: 10 }}>
                ДОСТИГНУТО
              </ThemedText>
            </View>
          )}
        </View>
        <View style={styles.cardActions}>
          {onQuickAdd && !isCompleted && (
            <Pressable
              onPress={handleQuickAdd}
              style={({ pressed }) => [
                styles.addButton,
                { 
                  backgroundColor: pressed ? theme.backgroundTertiary : theme.backgroundSecondary,
                },
              ]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <MaterialCommunityIcons
                name="plus"
                size={18}
                color={theme.text}
              />
            </Pressable>
          )}
          <MaterialCommunityIcons
            name="chevron-right"
            size={22}
            color={theme.textTertiary}
            style={{ marginLeft: Spacing.sm }}
          />
        </View>
      </View>

      <View style={styles.amountSection}>
        <ThemedText type="amount" style={[
          isCompleted && { color: theme.success },
        ]}>
          {formatCurrency(goal.currentAmount)} ₽
        </ThemedText>
        <ThemedText type="small" tertiary style={styles.targetText}>
          цель {formatCurrency(goal.targetAmount)} ₽
        </ThemedText>
      </View>

      <View style={styles.progressSection}>
        <ProgressBar percentage={percentage} height={4} />
        <View style={styles.progressMeta}>
          <ThemedText type="small" secondary>
            {Math.round(percentage)}%
          </ThemedText>
          {!isCompleted && daysToGoal !== null && daysToGoal !== undefined && daysToGoal > 0 && (
            <ThemedText type="small" tertiary>
              ~{daysToGoal} {getDaysWord(daysToGoal)}
            </ThemedText>
          )}
          {!isCompleted && (
            <ThemedText type="small" tertiary>
              осталось {formatCurrency(remaining)} ₽
            </ThemedText>
          )}
        </View>
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.sm,
  },
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: Spacing.md,
  },
  cardTitle: {
    fontWeight: "500",
  },
  completedBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
    marginLeft: Spacing.sm,
  },
  cardActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.sm,
    justifyContent: "center",
    alignItems: "center",
  },
  amountSection: {
    marginBottom: Spacing.md,
  },
  targetText: {
    marginTop: 2,
  },
  progressSection: {
    gap: Spacing.xs,
  },
  progressMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  compactCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  compactLeft: {
    flex: 1,
    marginRight: Spacing.md,
  },
  compactTitle: {
    fontWeight: "500",
    marginBottom: Spacing.xs,
  },
  compactProgressRow: {
    width: "100%",
  },
  compactRight: {
    alignItems: "flex-end",
    marginRight: Spacing.sm,
  },
});
