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
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Responsive, Shadows } from "@/constants/theme";
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

export function GoalCard({ goal, onPress, onQuickAdd, daysToGoal, compact = false }: GoalCardProps) {
  const { theme } = useTheme();
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

  if (compact) {
    return (
      <AnimatedPressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[
          styles.compactCard, 
          { backgroundColor: theme.card, borderColor: theme.cardBorder },
          Shadows.sm,
          animatedStyle,
        ]}
      >
        <View style={[styles.compactIcon, { backgroundColor: isCompleted ? theme.successMuted : theme.primaryMuted }]}>
          <MaterialCommunityIcons
            name={isCompleted ? "check" : iconName as any}
            size={18}
            color={isCompleted ? theme.success : theme.primary}
          />
        </View>
        <View style={styles.compactContent}>
          <ThemedText type="small" numberOfLines={1} style={styles.compactTitle}>
            {goal.name}
          </ThemedText>
          <View style={styles.compactProgress}>
            <ProgressBar 
              percentage={percentage} 
              height={4}
              color={isCompleted ? theme.success : undefined}
              dynamicColor={!isCompleted}
            />
          </View>
        </View>
        <ThemedText type="caption" style={{ color: theme.textSecondary }}>
          {Math.round(percentage)}%
        </ThemedText>
      </AnimatedPressable>
    );
  }

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        styles.card, 
        { backgroundColor: theme.card, borderColor: isCompleted ? theme.successMuted : theme.cardBorder },
        Shadows.sm,
        animatedStyle,
      ]}
    >
      <View style={styles.header}>
        <View style={[
          styles.iconContainer,
          { backgroundColor: isCompleted ? theme.successMuted : theme.primaryMuted },
        ]}>
          <MaterialCommunityIcons
            name={isCompleted ? "check" : iconName as any}
            size={22}
            color={isCompleted ? theme.success : theme.primary}
          />
        </View>
        <View style={styles.titleContainer}>
          <ThemedText type="h4" numberOfLines={1} style={styles.title}>
            {goal.name}
          </ThemedText>
          {isCompleted ? (
            <ThemedText type="caption" style={{ color: theme.success }}>
              Цель достигнута
            </ThemedText>
          ) : (
            <ThemedText type="caption" style={{ color: theme.textSecondary }}>
              {Math.round(percentage)}% выполнено
            </ThemedText>
          )}
        </View>
        {onQuickAdd && !isCompleted && (
          <Pressable
            onPress={handleQuickAdd}
            style={({ pressed }) => [
              styles.quickAddButton,
              { backgroundColor: pressed ? theme.primary : theme.primaryMuted },
            ]}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <MaterialCommunityIcons
              name="plus"
              size={20}
              color={theme.primary}
            />
          </Pressable>
        )}
      </View>

      <View style={styles.amountSection}>
        <View style={styles.amountRow}>
          <ThemedText type="h2" style={[
            styles.currentAmount,
            { color: isCompleted ? theme.success : theme.text },
          ]}>
            {formatCurrency(goal.currentAmount)}
          </ThemedText>
          <ThemedText type="body" style={{ color: theme.textTertiary, marginLeft: 4 }}>
            / {formatCurrency(goal.targetAmount)} ₽
          </ThemedText>
        </View>
        
        <View style={styles.progressContainer}>
          <ProgressBar 
            percentage={percentage} 
            height={8}
            color={isCompleted ? theme.success : undefined}
            dynamicColor={!isCompleted}
          />
        </View>
      </View>

      {!isCompleted && (
        <View style={[styles.footer, { borderTopColor: theme.borderLight }]}>
          <View style={styles.remainingInfo}>
            <MaterialCommunityIcons
              name="flag-checkered"
              size={16}
              color={theme.textTertiary}
            />
            <ThemedText type="small" style={{ color: theme.textSecondary, marginLeft: 6 }}>
              Осталось {formatCurrency(remaining)} ₽
            </ThemedText>
          </View>
          {daysToGoal !== null && daysToGoal !== undefined && daysToGoal > 0 && (
            <View style={styles.daysInfo}>
              <MaterialCommunityIcons
                name="calendar-clock"
                size={14}
                color={theme.primary}
              />
              <ThemedText type="small" style={{ color: theme.primary, marginLeft: 4 }}>
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
    borderRadius: BorderRadius.xl,
    padding: Responsive.cardPadding,
    marginBottom: Spacing.md,
    borderWidth: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.lg,
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.md,
  },
  titleContainer: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  title: {
    marginBottom: 2,
  },
  quickAddButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    justifyContent: "center",
    alignItems: "center",
  },
  amountSection: {
    marginBottom: Spacing.md,
  },
  amountRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginBottom: Spacing.sm,
  },
  currentAmount: {
    fontWeight: "700",
  },
  progressContainer: {
    marginTop: 4,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    marginTop: Spacing.xs,
  },
  remainingInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  daysInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  compactCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
  },
  compactIcon: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.md,
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.sm,
  },
  compactContent: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  compactTitle: {
    marginBottom: 4,
    fontWeight: "500",
  },
  compactProgress: {
    width: "100%",
  },
});
