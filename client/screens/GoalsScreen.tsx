import React, { useCallback, useState } from "react";
import { StyleSheet, ScrollView, View, RefreshControl, Pressable, Modal, TextInput } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useHeaderHeight } from "@react-navigation/elements";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, QUICK_AMOUNTS } from "@/constants/theme";
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
  const totalSaved = goals.reduce((sum, g) => sum + g.currentAmount, 0);
  const totalTarget = goals.reduce((sum, g) => sum + g.targetAmount, 0);

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
            tintColor={theme.text}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <ThemedText type="caption" secondary>
            Всего накоплено
          </ThemedText>
          <ThemedText type="amountLarge">
            {formatCurrency(totalSaved)} <ThemedText type="h2" secondary>₽</ThemedText>
          </ThemedText>
          {totalTarget > 0 && (
            <ThemedText type="small" secondary style={styles.targetText}>
              из {formatCurrency(totalTarget)} ₽
            </ThemedText>
          )}
        </View>

        <View style={[styles.divider, { backgroundColor: theme.divider }]} />

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <ThemedText type="h2">{activeGoals.length}</ThemedText>
            <ThemedText type="small" secondary>активных</ThemedText>
          </View>
          <View style={[styles.statDivider, { backgroundColor: theme.divider }]} />
          <View style={styles.statItem}>
            <ThemedText type="h2">{completedGoals.length}</ThemedText>
            <ThemedText type="small" secondary>достигнуто</ThemedText>
          </View>
          {archivedCount > 0 && (
            <>
              <View style={[styles.statDivider, { backgroundColor: theme.divider }]} />
              <View style={styles.statItem}>
                <ThemedText type="h2" secondary>{archivedCount}</ThemedText>
                <ThemedText type="small" secondary>в архиве</ThemedText>
              </View>
            </>
          )}
        </View>

        <View style={[styles.divider, { backgroundColor: theme.divider }]} />

        {activeGoals.length > 0 && (
          <View style={styles.section}>
            <ThemedText type="caption" secondary style={styles.sectionLabel}>
              Активные
            </ThemedText>
            {activeGoals.map((goal, index) => {
              const progress = Math.round((goal.currentAmount / goal.targetAmount) * 100);
              const remaining = goal.targetAmount - goal.currentAmount;
              const daysToGoal = settings?.averageDailyEarning && settings.averageDailyEarning > 0
                ? Math.ceil(remaining / settings.averageDailyEarning)
                : null;
              
              return (
                <Pressable
                  key={goal.id}
                  style={[
                    styles.goalItem,
                    index < activeGoals.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.divider },
                  ]}
                  onPress={() => navigation.navigate("GoalDetail", { goalId: goal.id })}
                  onLongPress={() => handleQuickAddOpen(goal)}
                >
                  <View style={styles.goalRow}>
                    <View style={styles.goalInfo}>
                      <ThemedText type="body" numberOfLines={1}>
                        {goal.name}
                      </ThemedText>
                      <ThemedText type="small" secondary>
                        {progress}%{daysToGoal !== null && ` · ${daysToGoal} дн.`}
                      </ThemedText>
                    </View>
                    <View style={styles.goalRight}>
                      <View style={styles.goalAmounts}>
                        <ThemedText type="amount">
                          {formatCurrency(goal.currentAmount)}
                        </ThemedText>
                        <ThemedText type="small" secondary>
                          / {formatCurrency(goal.targetAmount)}
                        </ThemedText>
                      </View>
                      <MaterialCommunityIcons
                        name="chevron-right"
                        size={20}
                        color={theme.textTertiary}
                      />
                    </View>
                  </View>
                  <View style={[styles.progressTrack, { backgroundColor: theme.divider }]}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          backgroundColor: theme.text,
                          width: `${Math.min(progress, 100)}%`,
                        },
                      ]}
                    />
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}

        {completedGoals.length > 0 && (
          <>
            <View style={[styles.divider, { backgroundColor: theme.divider }]} />
            <View style={styles.section}>
              <ThemedText type="caption" secondary style={styles.sectionLabel}>
                Достигнуто
              </ThemedText>
              {completedGoals.map((goal, index) => (
                <Pressable
                  key={goal.id}
                  style={[
                    styles.goalItemSimple,
                    index < completedGoals.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.divider },
                  ]}
                  onPress={() => navigation.navigate("GoalDetail", { goalId: goal.id })}
                >
                  <View style={styles.goalRow}>
                    <View style={styles.goalInfo}>
                      <ThemedText type="body" numberOfLines={1}>
                        {goal.name}
                      </ThemedText>
                    </View>
                    <View style={styles.goalRight}>
                      <ThemedText type="body" style={{ color: theme.accent }}>
                        {formatCurrency(goal.targetAmount)} ₽
                      </ThemedText>
                      <MaterialCommunityIcons
                        name="chevron-right"
                        size={20}
                        color={theme.textTertiary}
                      />
                    </View>
                  </View>
                </Pressable>
              ))}
            </View>
          </>
        )}

        {archivedCount > 0 && (
          <>
            <View style={[styles.divider, { backgroundColor: theme.divider }]} />
            <Pressable
              style={styles.archiveLink}
              onPress={() => navigation.navigate("ArchivedGoals")}
            >
              <ThemedText type="body" secondary>
                Архив
              </ThemedText>
              <View style={styles.archiveRight}>
                <ThemedText type="body" secondary>
                  {archivedCount}
                </ThemedText>
                <MaterialCommunityIcons
                  name="chevron-right"
                  size={20}
                  color={theme.textTertiary}
                />
              </View>
            </Pressable>
          </>
        )}

        {goals.length === 0 && (
          <View style={styles.emptyState}>
            <ThemedText type="body" secondary style={styles.emptyText}>
              Нет активных целей
            </ThemedText>
            <Pressable
              style={styles.addLink}
              onPress={() => navigation.navigate("AddGoal")}
            >
              <ThemedText type="body" style={{ color: theme.accent }}>
                Создать первую цель
              </ThemedText>
            </Pressable>
          </View>
        )}
      </ScrollView>

      <Pressable
        style={[styles.fab, { backgroundColor: theme.text }]}
        onPress={() => navigation.navigate("AddGoal")}
      >
        <MaterialCommunityIcons name="plus" size={24} color={theme.backgroundDefault} />
      </Pressable>

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
                  <ThemedText type="body" style={{ color: theme.accent }}>
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
                placeholder="0"
                placeholderTextColor={theme.textTertiary}
                keyboardType="numeric"
                autoFocus
              />
              <ThemedText type="h3" style={{ color: theme.textTertiary }}>₽</ThemedText>
            </View>

            {selectedGoal && (
              <ThemedText type="small" secondary style={styles.remainingHint}>
                Осталось: {formatCurrency(selectedGoal.targetAmount - selectedGoal.currentAmount)} ₽
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
  header: {
    alignItems: "center",
    paddingVertical: Spacing.lg,
  },
  targetText: {
    marginTop: Spacing.xs,
  },
  divider: {
    height: 1,
    marginVertical: Spacing.sm,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: Spacing.md,
  },
  statItem: {
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
  },
  statDivider: {
    width: 1,
    height: 32,
  },
  section: {
    paddingVertical: Spacing.sm,
  },
  sectionLabel: {
    marginBottom: Spacing.sm,
  },
  goalItem: {
    paddingVertical: Spacing.md,
  },
  goalItemSimple: {
    paddingVertical: Spacing.md,
  },
  goalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  goalInfo: {
    flex: 1,
    marginRight: Spacing.md,
  },
  goalRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  goalAmounts: {
    alignItems: "flex-end",
  },
  progressTrack: {
    height: 2,
    borderRadius: 1,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 1,
  },
  archiveLink: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.md,
  },
  archiveRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  emptyState: {
    paddingVertical: Spacing.xxl,
    alignItems: "center",
  },
  emptyText: {
    marginBottom: Spacing.md,
  },
  addLink: {
    paddingVertical: Spacing.sm,
  },
  fab: {
    position: "absolute",
    right: Spacing.lg,
    bottom: 100,
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
    fontWeight: "200",
    textAlign: "center",
    minWidth: 100,
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
