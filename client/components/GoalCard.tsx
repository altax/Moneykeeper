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
import { Colors, Spacing, BorderRadius, Responsive } from "@/constants/theme";
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
    scale.value = withSpring(0.98, { damping: 15, stiffness: 200 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 200 });
  };

  const handleQuickAdd = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
            name={isCompleted ? "check" : iconName as any}
            size={20}
            color={isCompleted ? Colors.light.success : Colors.light.primary}
          />
        </View>
        <View style={styles.titleContainer}>
          <ThemedText type="h4" numberOfLines={1} style={styles.title}>
            {goal.name}
          </ThemedText>
          {isCompleted ? (
            <ThemedText type="caption" style={styles.completedText}>
              Цель достигнута
            </ThemedText>
          ) : (
            <ThemedText type="caption" style={styles.percentageText}>
              {Math.round(percentage)}%
            </ThemedText>
          )}
        </View>
        {onQuickAdd && !isCompleted && (
          <Pressable
            onPress={handleQuickAdd}
            style={({ pressed }) => [
              styles.quickAddButton,
              pressed && styles.quickAddButtonPressed,
            ]}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <MaterialCommunityIcons
              name="plus"
              size={18}
              color={Colors.light.primary}
            />
          </Pressable>
        )}
        <MaterialCommunityIcons
          name="chevron-right"
          size={20}
          color={Colors.light.textTertiary}
        />
      </View>

      <View style={styles.amountSection}>
        <View style={styles.amountRow}>
          <ThemedText type="h2" style={[
            styles.currentAmount,
            isCompleted && styles.currentAmountCompleted,
          ]}>
            {formatCurrency(goal.currentAmount)}
          </ThemedText>
          <ThemedText type="body" style={styles.targetAmount}>
            / {formatCurrency(goal.targetAmount)} ₽
          </ThemedText>
        </View>
        
        <View style={styles.progressContainer}>
          <ProgressBar 
            percentage={percentage} 
            height={6}
            color={isCompleted ? Colors.light.success : undefined}
            dynamicColor={!isCompleted}
          />
        </View>
      </View>

      {!isCompleted && (
        <View style={styles.footer}>
          <View style={styles.remainingInfo}>
            <ThemedText type="small" style={styles.remainingLabel}>
              Осталось
            </ThemedText>
            <ThemedText type="small" style={styles.remainingValue}>
              {formatCurrency(remaining)} ₽
            </ThemedText>
          </View>
          {daysToGoal !== null && daysToGoal !== undefined && daysToGoal > 0 && (
            <View style={styles.daysInfo}>
              <MaterialCommunityIcons
                name="clock-outline"
                size={14}
                color={Colors.light.textTertiary}
              />
              <ThemedText type="small" style={styles.daysText}>
                ~{daysToGoal} {getDaysWord(daysToGoal)}
              </ThemedText>
            </View>
          )}
        </View>
      )}
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
    borderRadius: BorderRadius.xl,
    padding: Responsive.cardPadding,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.light.cardBorder,
  },
  cardCompleted: {
    borderColor: Colors.light.successMuted,
    backgroundColor: Colors.light.card,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.light.primaryMuted,
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.sm,
  },
  iconContainerCompleted: {
    backgroundColor: Colors.light.successMuted,
  },
  titleContainer: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  title: {
    marginBottom: 2,
  },
  completedText: {
    color: Colors.light.success,
  },
  percentageText: {
    color: Colors.light.textSecondary,
  },
  quickAddButton: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.light.primaryMuted,
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.sm,
  },
  quickAddButtonPressed: {
    backgroundColor: Colors.light.primary,
  },
  amountSection: {
    marginBottom: Spacing.sm,
  },
  amountRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginBottom: Spacing.sm,
  },
  currentAmount: {
    color: Colors.light.text,
    fontWeight: "700",
  },
  currentAmountCompleted: {
    color: Colors.light.success,
  },
  targetAmount: {
    color: Colors.light.textTertiary,
    marginLeft: 4,
  },
  progressContainer: {
    marginTop: 4,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.light.borderLight,
    marginTop: Spacing.xs,
  },
  remainingInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  remainingLabel: {
    color: Colors.light.textTertiary,
  },
  remainingValue: {
    color: Colors.light.textSecondary,
    fontWeight: "500",
  },
  daysInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  daysText: {
    color: Colors.light.textTertiary,
  },
});
