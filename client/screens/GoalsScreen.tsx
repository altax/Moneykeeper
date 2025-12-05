import React, { useCallback, useState } from "react";
import {
  StyleSheet,
  ScrollView,
  View,
  RefreshControl,
  Pressable,
  Modal,
  TextInput,
  Alert,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useHeaderHeight } from "@react-navigation/elements";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { ProgressBar } from "@/components/ProgressBar";
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
      Alert.alert(
        "Цель перевыполнена!",
        `${formatCurrency(toGoal)} ₽ добавлено к цели "${selectedGoal.name}".\n\nИзлишек ${formatCurrency(toSafe)} ₽ сохранён в общие накопления.`,
        [{ text: "Отлично", style: "default" }]
      );
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

  const activeGoals = goals.filter((g) => g.currentAmount < g.targetAmount);
  const completedGoals = goals.filter((g) => g.currentAmount >= g.targetAmount);
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
          <ThemedText type="small" secondary>
            Всего накоплено
          </ThemedText>
          <ThemedText type="amountLarge">
            {formatCurrency(totalSaved)}{" "}
            <ThemedText type="h2" secondary>
              ₽
            </ThemedText>
          </ThemedText>
          {totalTarget > 0 && (
            <ThemedText type="small" secondary style={styles.targetText}>
              из {formatCurrency(totalTarget)} ₽
            </ThemedText>
          )}
        </View>

        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: theme.card }]}>
            <ThemedText type="h2" style={{ color: theme.primary }}>
              {activeGoals.length}
            </ThemedText>
            <ThemedText type="small" secondary>
              активных
            </ThemedText>
          </View>
          <View style={[styles.statCard, { backgroundColor: theme.card }]}>
            <ThemedText type="h2" style={{ color: theme.success }}>
              {completedGoals.length}
            </ThemedText>
            <ThemedText type="small" secondary>
              достигнуто
            </ThemedText>
          </View>
          {archivedCount > 0 && (
            <Pressable
              style={[styles.statCard, { backgroundColor: theme.card }]}
              onPress={() => navigation.navigate("ArchivedGoals")}
            >
              <ThemedText type="h2" secondary>
                {archivedCount}
              </ThemedText>
              <ThemedText type="small" secondary>
                в архиве
              </ThemedText>
            </Pressable>
          )}
        </View>

        {activeGoals.length > 0 && (
          <View style={styles.section}>
            <ThemedText type="h4" style={styles.sectionTitle}>
              Активные цели
            </ThemedText>
            <Card style={styles.goalsCard}>
              {activeGoals.map((goal, index) => {
                const progress = Math.round(
                  (goal.currentAmount / goal.targetAmount) * 100
                );
                const remaining = goal.targetAmount - goal.currentAmount;
                const daysToGoal =
                  settings?.averageDailyEarning && settings.averageDailyEarning > 0
                    ? Math.ceil(remaining / settings.averageDailyEarning)
                    : null;

                return (
                  <Pressable
                    key={goal.id}
                    style={[
                      styles.goalItem,
                      index < activeGoals.length - 1 && {
                        borderBottomWidth: 1,
                        borderBottomColor: theme.divider,
                      },
                    ]}
                    onPress={() =>
                      navigation.navigate("GoalDetail", { goalId: goal.id })
                    }
                    onLongPress={() => handleQuickAddOpen(goal)}
                  >
                    <View style={styles.goalHeader}>
                      <View style={styles.goalTitleRow}>
                        <ThemedText type="body" numberOfLines={1} style={{ fontWeight: "600" }}>
                          {goal.name}
                        </ThemedText>
                        <Pressable
                          style={[styles.quickAddBtn, { backgroundColor: theme.backgroundSecondary }]}
                          onPress={() => handleQuickAddOpen(goal)}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <MaterialCommunityIcons name="plus" size={18} color={theme.text} />
                        </Pressable>
                      </View>
                    </View>

                    <View style={styles.goalAmountRow}>
                      <View>
                        <ThemedText type="h3">{formatCurrency(goal.currentAmount)} ₽</ThemedText>
                        <ThemedText type="small" secondary>
                          из {formatCurrency(goal.targetAmount)} ₽
                        </ThemedText>
                      </View>
                      {daysToGoal !== null && daysToGoal > 0 && (
                        <View style={[styles.daysTag, { backgroundColor: theme.accentMuted }]}>
                          <MaterialCommunityIcons
                            name="clock-outline"
                            size={14}
                            color={theme.accent}
                          />
                          <ThemedText
                            type="small"
                            style={{ color: theme.accent, marginLeft: 4, fontWeight: "500" }}
                          >
                            ~{daysToGoal} {getDaysWord(daysToGoal)}
                          </ThemedText>
                        </View>
                      )}
                    </View>

                    <View style={styles.progressRow}>
                      <ProgressBar percentage={progress} height={6} />
                      <View style={styles.progressMeta}>
                        <ThemedText type="small" secondary>
                          {progress}%
                        </ThemedText>
                        <ThemedText type="small" secondary>
                          осталось {formatCurrency(remaining)} ₽
                        </ThemedText>
                      </View>
                    </View>
                  </Pressable>
                );
              })}
            </Card>
          </View>
        )}

        {completedGoals.length > 0 && (
          <View style={styles.section}>
            <ThemedText type="h4" style={styles.sectionTitle}>
              Достигнутые цели
            </ThemedText>
            <Card style={styles.goalsCard}>
              {completedGoals.map((goal, index) => (
                <Pressable
                  key={goal.id}
                  style={[
                    styles.completedGoalItem,
                    index < completedGoals.length - 1 && {
                      borderBottomWidth: 1,
                      borderBottomColor: theme.divider,
                    },
                  ]}
                  onPress={() =>
                    navigation.navigate("GoalDetail", { goalId: goal.id })
                  }
                >
                  <View style={[styles.completedIcon, { backgroundColor: theme.successMuted }]}>
                    <MaterialCommunityIcons name="check" size={20} color={theme.success} />
                  </View>
                  <View style={styles.completedInfo}>
                    <ThemedText type="body" numberOfLines={1} style={{ fontWeight: "500" }}>
                      {goal.name}
                    </ThemedText>
                    <ThemedText type="small" style={{ color: theme.success }}>
                      {formatCurrency(goal.targetAmount)} ₽ достигнуто
                    </ThemedText>
                  </View>
                  <MaterialCommunityIcons
                    name="chevron-right"
                    size={22}
                    color={theme.textTertiary}
                  />
                </Pressable>
              ))}
            </Card>
          </View>
        )}

        {archivedCount > 0 && (
          <Pressable
            style={[styles.archiveLink, { backgroundColor: theme.card }]}
            onPress={() => navigation.navigate("ArchivedGoals")}
          >
            <View style={styles.archiveLinkContent}>
              <MaterialCommunityIcons name="archive" size={22} color={theme.textSecondary} />
              <ThemedText type="body" secondary style={{ marginLeft: Spacing.md }}>
                Архив целей
              </ThemedText>
            </View>
            <View style={styles.archiveRight}>
              <ThemedText type="body" secondary>
                {archivedCount}
              </ThemedText>
              <MaterialCommunityIcons
                name="chevron-right"
                size={22}
                color={theme.textTertiary}
              />
            </View>
          </Pressable>
        )}

        {goals.length === 0 && (
          <View style={[styles.emptyState, { backgroundColor: theme.card }]}>
            <View style={[styles.emptyIcon, { backgroundColor: theme.primaryMuted }]}>
              <MaterialCommunityIcons name="flag-outline" size={48} color={theme.primary} />
            </View>
            <ThemedText type="h3" style={{ marginTop: Spacing.lg }}>
              Нет целей
            </ThemedText>
            <ThemedText type="body" secondary style={{ textAlign: "center", marginTop: Spacing.sm }}>
              Создайте свою первую финансовую цель и начните копить
            </ThemedText>
            <Button onPress={() => navigation.navigate("AddGoal")} style={{ marginTop: Spacing.lg }}>
              Создать цель
            </Button>
          </View>
        )}
      </ScrollView>

      <Pressable
        style={[styles.fab, { backgroundColor: theme.text }]}
        onPress={() => navigation.navigate("AddGoal")}
      >
        <MaterialCommunityIcons name="plus" size={28} color={theme.backgroundDefault} />
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
          <Pressable
            style={[styles.modalContent, { backgroundColor: theme.card }]}
            onPress={() => {}}
          >
            <View style={styles.modalHeader}>
              <ThemedText type="h3">Пополнить</ThemedText>
              <ThemedText type="body" secondary style={styles.modalGoalName}>
                {selectedGoal?.name}
              </ThemedText>
              {selectedGoal && (
                <ThemedText type="small" style={{ color: theme.accent, marginTop: 2 }}>
                  Осталось: {formatCurrency(selectedGoal.targetAmount - selectedGoal.currentAmount)} ₽
                </ThemedText>
              )}
            </View>

            <View style={styles.quickAmounts}>
              {QUICK_AMOUNTS.map((amount) => (
                <Pressable
                  key={amount}
                  style={[
                    styles.quickAmountButton,
                    { backgroundColor: theme.backgroundSecondary },
                  ]}
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
              <ThemedText type="h3" style={{ color: theme.textTertiary }}>
                ₽
              </ThemedText>
            </View>

            {selectedGoal && quickAmount && (() => {
              const amount = parseFloat(quickAmount.replace(/[^\d.]/g, "")) || 0;
              const remaining = selectedGoal.targetAmount - selectedGoal.currentAmount;
              const excess = Math.max(0, amount - remaining);
              
              if (excess > 0) {
                return (
                  <View style={[styles.excessNote, { backgroundColor: theme.successMuted }]}>
                    <MaterialCommunityIcons name="information" size={18} color={theme.success} />
                    <ThemedText type="small" style={{ color: theme.success, marginLeft: Spacing.xs, flex: 1 }}>
                      Излишек {formatCurrency(excess)} ₽ уйдёт в общие накопления
                    </ThemedText>
                  </View>
                );
              }
              return null;
            })()}

            <View style={styles.modalActions}>
              <Button
                variant="secondary"
                onPress={() => setShowQuickAdd(false)}
                style={styles.modalButton}
              >
                Отмена
              </Button>
              <Button onPress={handleQuickAddSubmit} style={styles.modalButton}>
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
  statsRow: {
    flexDirection: "row",
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  statCard: {
    flex: 1,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    alignItems: "center",
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    marginBottom: Spacing.md,
  },
  goalsCard: {
    padding: 0,
    overflow: "hidden",
  },
  goalItem: {
    padding: Spacing.md,
  },
  goalHeader: {
    marginBottom: Spacing.sm,
  },
  goalTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  quickAddBtn: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.sm,
    justifyContent: "center",
    alignItems: "center",
  },
  goalAmountRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: Spacing.md,
  },
  daysTag: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  progressRow: {
    gap: Spacing.xs,
  },
  progressMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  completedGoalItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
  },
  completedIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.md,
  },
  completedInfo: {
    flex: 1,
  },
  archiveLink: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.xl,
  },
  archiveLinkContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  archiveRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  emptyState: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    alignItems: "center",
    marginTop: Spacing.lg,
  },
  emptyIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: "center",
    alignItems: "center",
  },
  fab: {
    position: "absolute",
    right: Spacing.lg,
    bottom: 100,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
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
    fontSize: 48,
    fontWeight: "300",
    textAlign: "center",
    minWidth: 120,
  },
  excessNote: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
  },
  modalActions: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  modalButton: {
    flex: 1,
  },
});
