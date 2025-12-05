import React, { useCallback, useState } from "react";
import { StyleSheet, ScrollView, View, RefreshControl, Pressable, Alert } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import { storage } from "@/lib/storage";
import { Goal } from "@/lib/types";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("ru-RU", {
    style: "decimal",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function ArchivedGoalsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadGoals = useCallback(async () => {
    const archivedGoals = await storage.getArchivedGoals();
    setGoals(archivedGoals.sort((a, b) => 
      new Date(b.archivedAt || b.updatedAt).getTime() - 
      new Date(a.archivedAt || a.updatedAt).getTime()
    ));
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadGoals();
    }, [loadGoals])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadGoals();
    setRefreshing(false);
  };

  const handleUnarchive = (goal: Goal) => {
    Alert.alert(
      "Восстановить цель?",
      `"${goal.name}" будет перемещена обратно в активные цели.`,
      [
        { text: "Отмена", style: "cancel" },
        {
          text: "Восстановить",
          onPress: async () => {
            await storage.unarchiveGoal(goal.id);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            await loadGoals();
          },
        },
      ]
    );
  };

  const handleDelete = (goal: Goal) => {
    Alert.alert(
      "Удалить цель?",
      "Все данные этой цели будут удалены безвозвратно.",
      [
        { text: "Отмена", style: "cancel" },
        {
          text: "Удалить",
          style: "destructive",
          onPress: async () => {
            await storage.deleteGoal(goal.id);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            await loadGoals();
          },
        },
      ]
    );
  };

  if (goals.length === 0) {
    return (
      <ThemedView style={styles.container}>
        <View style={[styles.emptyContainer, { paddingTop: Spacing.xl }]}>
          <EmptyState
            icon="archive-outline"
            title="Архив пуст"
            description="Здесь будут отображаться выполненные и архивированные цели"
          />
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: Spacing.md,
            paddingBottom: insets.bottom + Spacing.lg,
          },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.dark.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {goals.map((goal) => {
          const isCompleted = goal.currentAmount >= goal.targetAmount;
          return (
            <Card key={goal.id} style={styles.goalCard}>
              <View style={styles.goalHeader}>
                <View style={[
                  styles.iconContainer,
                  isCompleted && styles.iconContainerCompleted,
                ]}>
                  <MaterialCommunityIcons
                    name={isCompleted ? "check-circle" : "archive"}
                    size={24}
                    color={isCompleted ? Colors.dark.success : Colors.dark.textSecondary}
                  />
                </View>
                <View style={styles.goalInfo}>
                  <ThemedText type="h4" numberOfLines={1}>
                    {goal.name}
                  </ThemedText>
                  <ThemedText type="caption" secondary>
                    {isCompleted ? "Выполнена" : "Архивирована"} {formatDate(goal.archivedAt || goal.updatedAt)}
                  </ThemedText>
                </View>
              </View>

              <View style={styles.amountRow}>
                <ThemedText type="h3" style={isCompleted ? styles.completedAmount : undefined}>
                  {formatCurrency(goal.currentAmount)}
                </ThemedText>
                <ThemedText type="body" secondary>
                  {" "}/ {formatCurrency(goal.targetAmount)} руб.
                </ThemedText>
              </View>

              <View style={styles.actions}>
                <Pressable
                  onPress={() => handleUnarchive(goal)}
                  style={({ pressed }) => [
                    styles.actionButton,
                    pressed && styles.actionButtonPressed,
                  ]}
                >
                  <MaterialCommunityIcons
                    name="archive-arrow-up"
                    size={20}
                    color={Colors.dark.primary}
                  />
                  <ThemedText type="small" style={styles.restoreText}>
                    Восстановить
                  </ThemedText>
                </Pressable>

                <Pressable
                  onPress={() => handleDelete(goal)}
                  style={({ pressed }) => [
                    styles.actionButton,
                    styles.deleteButton,
                    pressed && styles.actionButtonPressed,
                  ]}
                >
                  <MaterialCommunityIcons
                    name="delete-outline"
                    size={20}
                    color={Colors.dark.error}
                  />
                  <ThemedText type="small" style={styles.deleteText}>
                    Удалить
                  </ThemedText>
                </Pressable>
              </View>
            </Card>
          );
        })}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.md,
  },
  goalCard: {
    padding: Spacing.md,
  },
  goalHeader: {
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
  iconContainerCompleted: {
    backgroundColor: "rgba(76, 175, 80, 0.15)",
  },
  goalInfo: {
    flex: 1,
  },
  amountRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginBottom: Spacing.md,
  },
  completedAmount: {
    color: Colors.dark.success,
  },
  actions: {
    flexDirection: "row",
    gap: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.border,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.dark.backgroundSecondary,
  },
  actionButtonPressed: {
    opacity: 0.7,
  },
  deleteButton: {
    backgroundColor: "rgba(239, 83, 80, 0.1)",
  },
  restoreText: {
    color: Colors.dark.primary,
  },
  deleteText: {
    color: Colors.dark.error,
  },
});
