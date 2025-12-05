import React, { useCallback, useState } from "react";
import { StyleSheet, ScrollView, View, RefreshControl, Pressable, Modal, TextInput, Alert } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useHeaderHeight } from "@react-navigation/elements";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { GoalCard } from "@/components/GoalCard";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Shadows, QUICK_AMOUNTS } from "@/constants/theme";
import { storage } from "@/lib/storage";
import { Goal, AppSettings } from "@/lib/types";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("ru-RU", {
    style: "decimal",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function GoalsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { theme } = useTheme();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();

  const [goals, setGoals] = useState<Goal[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [archivedCount, setArchivedCount] = useState(0);
  
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [quickAmount, setQuickAmount] = useState("");

  const loadData = useCallback(async () => {
    const activeGoals = await storage.getActiveGoals();
    setGoals(activeGoals);
    
    const appSettings = await storage.getSettings();
    setSettings(appSettings);
    
    const archived = await storage.getArchivedGoals();
    setArchivedCount(archived.length);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleQuickAddOpen = (goal: Goal) => {
    setSelectedGoal(goal);
    setQuickAmount("");
    setShowQuickAdd(true);
  };

  const handleQuickAddSubmit = async () => {
    if (!selectedGoal) return;
    
    const amount = parseFloat(quickAmount.replace(/[^\d.]/g, "")) || 0;
    if (amount <= 0) {
      setShowQuickAdd(false);
      return;
    }

    const remaining = selectedGoal.targetAmount - selectedGoal.currentAmount;
    const toGoal = Math.min(amount, remaining);
    const toSafe = Math.max(0, amount - remaining);

    await storage.addContribution({
      goalId: selectedGoal.id,
      amount: toGoal,
      date: new Date().toISOString(),
    });

    if (toSafe > 0) {
      await storage.addToSafe(toSafe, "Излишек от накопления");
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowQuickAdd(false);
    setSelectedGoal(null);
    await loadData();
  };

  const handleQuickAmount = (amount: number) => {
    setQuickAmount(amount.toLocaleString("ru-RU"));
  };

  const formatQuickAmountInput = (text: string) => {
    const cleaned = text.replace(/[^\d]/g, "");
    if (!cleaned) {
      setQuickAmount("");
      return;
    }
    const number = parseInt(cleaned, 10);
    setQuickAmount(number.toLocaleString("ru-RU"));
  };

  const activeGoals = goals.filter(g => g.currentAmount < g.targetAmount);
  const completedGoals = goals.filter(g => g.currentAmount >= g.targetAmount);

  if (goals.length === 0) {
    return (
      <ThemedView style={styles.container}>
        <View style={[styles.emptyContainer, { paddingTop: headerHeight + Spacing.xl }]}>
          <EmptyState
            icon="target"
            title="Нет активных целей"
            description="Создайте свою первую цель и начните копить!"
            actionText="Создать цель"
            onAction={() => navigation.navigate("AddGoal")}
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
            paddingTop: headerHeight + Spacing.md,
            paddingBottom: tabBarHeight + Spacing.xl,
          },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <ThemedText type="caption" secondary>Активных</ThemedText>
              <ThemedText type="h2" style={{ color: theme.primary }}>
                {activeGoals.length}
              </ThemedText>
            </View>
            <View style={[styles.summaryDivider, { backgroundColor: theme.borderLight }]} />
            <View style={styles.summaryItem}>
              <ThemedText type="caption" secondary>Достигнуто</ThemedText>
              <ThemedText type="h2" style={{ color: theme.success }}>
                {completedGoals.length}
              </ThemedText>
            </View>
            <View style={[styles.summaryDivider, { backgroundColor: theme.borderLight }]} />
            <View style={styles.summaryItem}>
              <ThemedText type="caption" secondary>Архив</ThemedText>
              <ThemedText type="h2" style={{ color: theme.textSecondary }}>
                {archivedCount}
              </ThemedText>
            </View>
          </View>
        </View>

        {activeGoals.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <ThemedText type="h4">Активные цели</ThemedText>
            </View>
            {activeGoals.map((goal) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                onPress={() => navigation.navigate("GoalDetail", { goalId: goal.id })}
                onQuickAdd={() => handleQuickAddOpen(goal)}
                daysToGoal={
                  settings?.averageDailyEarning && settings.averageDailyEarning > 0
                    ? Math.ceil((goal.targetAmount - goal.currentAmount) / settings.averageDailyEarning)
                    : null
                }
              />
            ))}
          </View>
        )}

        {completedGoals.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <ThemedText type="h4">Достигнутые</ThemedText>
            </View>
            {completedGoals.map((goal) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                onPress={() => navigation.navigate("GoalDetail", { goalId: goal.id })}
              />
            ))}
          </View>
        )}

        {archivedCount > 0 && (
          <Pressable
            style={[styles.archiveLink, { backgroundColor: theme.backgroundSecondary }]}
            onPress={() => navigation.navigate("ArchivedGoals")}
          >
            <MaterialCommunityIcons name="archive-outline" size={20} color={theme.textSecondary} />
            <ThemedText type="body" secondary style={styles.archiveLinkText}>
              Архив ({archivedCount})
            </ThemedText>
            <MaterialCommunityIcons name="chevron-right" size={20} color={theme.textTertiary} />
          </Pressable>
        )}
      </ScrollView>

      <View style={[styles.fabContainer, { bottom: tabBarHeight + Spacing.md }]}>
        <Pressable
          style={[styles.fab, { backgroundColor: theme.primary }, Shadows.lg]}
          onPress={() => navigation.navigate("AddGoal")}
        >
          <MaterialCommunityIcons name="plus" size={28} color="#FFFFFF" />
        </Pressable>
      </View>

      <Modal
        visible={showQuickAdd}
        transparent
        animationType="fade"
        onRequestClose={() => setShowQuickAdd(false)}
      >
        <Pressable
          style={[styles.modalOverlay, { backgroundColor: theme.overlay }]}
          onPress={() => setShowQuickAdd(false)}
        >
          <Pressable style={[styles.modalContent, { backgroundColor: theme.card }]} onPress={() => {}}>
            <View style={styles.modalHeader}>
              <ThemedText type="h3">Пополнить</ThemedText>
              <ThemedText type="body" secondary style={styles.modalGoalName}>
                {selectedGoal?.name}
              </ThemedText>
            </View>

            <View style={styles.quickAmounts}>
              {QUICK_AMOUNTS.map((amount) => (
                <Pressable
                  key={amount}
                  style={[styles.quickAmountButton, { backgroundColor: theme.backgroundSecondary }]}
                  onPress={() => handleQuickAmount(amount)}
                >
                  <ThemedText type="body" style={{ color: theme.primary }}>
                    {amount.toLocaleString("ru-RU")} ₽
                  </ThemedText>
                </Pressable>
              ))}
            </View>

            <View style={styles.inputContainer}>
              <TextInput
                style={[styles.amountInput, { color: theme.text }]}
                value={quickAmount}
                onChangeText={formatQuickAmountInput}
                placeholder="Введите сумму"
                placeholderTextColor={theme.textTertiary}
                keyboardType="numeric"
                autoFocus
              />
              <ThemedText type="h3" style={{ color: theme.textTertiary }}>₽</ThemedText>
            </View>

            {selectedGoal && (
              <ThemedText type="small" secondary style={styles.remainingHint}>
                Осталось до цели: {formatCurrency(selectedGoal.targetAmount - selectedGoal.currentAmount)} ₽
              </ThemedText>
            )}

            <View style={styles.modalActions}>
              <Button
                variant="secondary"
                onPress={() => setShowQuickAdd(false)}
                style={styles.modalButton}
              >
                Отмена
              </Button>
              <Button
                onPress={handleQuickAddSubmit}
                style={styles.modalButton}
              >
                Пополнить
              </Button>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
  },
  emptyContainer: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  summaryCard: {
    marginBottom: Spacing.xl,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
  },
  summaryItem: {
    alignItems: "center",
    paddingVertical: Spacing.sm,
  },
  summaryDivider: {
    width: 1,
    height: 40,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  archiveLink: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginTop: Spacing.md,
  },
  archiveLinkText: {
    flex: 1,
    marginLeft: Spacing.sm,
  },
  fabContainer: {
    position: "absolute",
    right: Spacing.lg,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.lg,
  },
  modalContent: {
    width: "100%",
    maxWidth: 360,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    ...Shadows.lg,
  },
  modalHeader: {
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  modalGoalName: {
    marginTop: Spacing.xs,
  },
  quickAmounts: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  quickAmountButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.md,
  },
  amountInput: {
    fontSize: 40,
    fontWeight: "700",
    textAlign: "center",
    minWidth: 120,
  },
  remainingHint: {
    textAlign: "center",
    marginBottom: Spacing.lg,
  },
  modalActions: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  modalButton: {
    flex: 1,
  },
});
