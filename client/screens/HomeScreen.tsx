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
import { useSafeAreaInsets } from "react-native-safe-area-context";
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
import { Goal, AppSettings, Safe, WorkSession, ShiftType } from "@/lib/types";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("ru-RU", {
    style: "decimal",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function isShiftActive(sessionDate: string, shiftType: ShiftType): boolean {
  const now = new Date();
  const shiftDate = new Date(sessionDate);

  if (shiftType === "day") {
    shiftDate.setHours(8, 0, 0, 0);
  } else {
    shiftDate.setHours(20, 0, 0, 0);
  }

  const shiftEndDate = new Date(shiftDate);
  shiftEndDate.setHours(shiftEndDate.getHours() + 12);

  return now >= shiftDate && now < shiftEndDate;
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

export default function HomeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();

  const [allGoals, setAllGoals] = useState<Goal[]>([]);
  const [displayGoals, setDisplayGoals] = useState<Goal[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [safe, setSafe] = useState<Safe>({ balance: 0, updatedAt: "" });
  const [activeSessions, setActiveSessions] = useState<WorkSession[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [earningsStats, setEarningsStats] = useState({
    today: 0,
    thisWeek: 0,
    thisMonth: 0,
    allTime: 0,
  });

  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [quickAmount, setQuickAmount] = useState("");

  const loadData = useCallback(async () => {
    const activeGoals = await storage.getActiveGoals();
    const inProgressGoals = activeGoals.filter(
      (g) => g.currentAmount < g.targetAmount
    );
    setAllGoals(activeGoals);
    setDisplayGoals(inProgressGoals.slice(0, 5));

    const appSettings = await storage.getSettings();
    setSettings(appSettings);

    const safeData = await storage.getSafe();
    setSafe(safeData);

    const sessions = await storage.getActiveWorkSessions();
    setActiveSessions(
      sessions.filter((s) => isShiftActive(s.date, s.shiftType))
    );

    const stats = await storage.getEarningsStats();
    setEarningsStats(stats);
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

  const totalSaved = allGoals.reduce((sum, g) => sum + g.currentAmount, 0);
  const totalTarget = allGoals.reduce((sum, g) => sum + g.targetAmount, 0);
  const overallProgress = totalTarget > 0 ? (totalSaved / totalTarget) * 100 : 0;

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + Spacing.lg,
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
          <ThemedText type="small" secondary style={styles.headerLabel}>
            Всего накоплено
          </ThemedText>
          <ThemedText type="amountLarge" style={styles.totalAmount}>
            {formatCurrency(totalSaved)}{" "}
            <ThemedText type="h2" secondary>
              ₽
            </ThemedText>
          </ThemedText>
          {totalTarget > 0 && (
            <View style={styles.overallProgressContainer}>
              <ProgressBar
                percentage={overallProgress}
                height={4}
                color={theme.success}
              />
              <ThemedText type="small" secondary style={{ marginTop: Spacing.xs }}>
                {Math.round(overallProgress)}% от всех целей
              </ThemedText>
            </View>
          )}
        </View>

        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: theme.card }]}>
            <MaterialCommunityIcons
              name="calendar-week"
              size={20}
              color={theme.textSecondary}
            />
            <ThemedText
              type="h3"
              style={{ marginTop: Spacing.xs, color: theme.success }}
            >
              {formatCurrency(earningsStats.thisWeek)} ₽
            </ThemedText>
            <ThemedText type="small" secondary>
              за неделю
            </ThemedText>
          </View>
          <View style={[styles.statCard, { backgroundColor: theme.card }]}>
            <MaterialCommunityIcons
              name="calendar-month"
              size={20}
              color={theme.textSecondary}
            />
            <ThemedText type="h3" style={{ marginTop: Spacing.xs }}>
              {formatCurrency(earningsStats.thisMonth)} ₽
            </ThemedText>
            <ThemedText type="small" secondary>
              за месяц
            </ThemedText>
          </View>
        </View>

        {(safe.balance > 0 || activeSessions.length > 0) && (
          <View style={styles.quickActions}>
            {safe.balance > 0 && (
              <Pressable
                style={[styles.quickActionCard, { backgroundColor: theme.successMuted }]}
                onPress={() => navigation.navigate("SafeDetail")}
              >
                <View style={styles.quickActionHeader}>
                  <MaterialCommunityIcons
                    name="safe"
                    size={24}
                    color={theme.success}
                  />
                  <MaterialCommunityIcons
                    name="chevron-right"
                    size={20}
                    color={theme.success}
                  />
                </View>
                <ThemedText type="h3" style={{ color: theme.success }}>
                  {formatCurrency(safe.balance)} ₽
                </ThemedText>
                <ThemedText type="small" style={{ color: theme.success }}>
                  Общие накопления
                </ThemedText>
              </Pressable>
            )}

            {activeSessions.length > 0 && (
              <Pressable
                style={[styles.quickActionCard, { backgroundColor: theme.warningMuted }]}
                onPress={() => navigation.navigate("ShiftFlow")}
              >
                <View style={styles.quickActionHeader}>
                  <MaterialCommunityIcons
                    name="briefcase-clock"
                    size={24}
                    color={theme.warning}
                  />
                  <View style={[styles.liveBadge, { backgroundColor: theme.warning }]}>
                    <ThemedText type="caption" style={{ color: "#FFFFFF", fontSize: 10 }}>
                      СЕЙЧАС
                    </ThemedText>
                  </View>
                </View>
                <ThemedText type="h3" style={{ color: theme.warning }}>
                  {activeSessions.length} смена
                </ThemedText>
                <ThemedText type="small" style={{ color: theme.warning }}>
                  Активная смена
                </ThemedText>
              </Pressable>
            )}
          </View>
        )}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <ThemedText type="h4">Цели</ThemedText>
            <Pressable
              onPress={() => navigation.navigate("Main", { screen: "GoalsTab" })}
            >
              <ThemedText type="body" style={{ color: theme.accent }}>
                Все
              </ThemedText>
            </Pressable>
          </View>

          {displayGoals.length > 0 ? (
            <Card style={styles.goalsCard}>
              {displayGoals.map((goal, index) => {
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
                      index < displayGoals.length - 1 && {
                        borderBottomWidth: 1,
                        borderBottomColor: theme.divider,
                      },
                    ]}
                    onPress={() =>
                      navigation.navigate("GoalDetail", { goalId: goal.id })
                    }
                    onLongPress={() => handleQuickAddOpen(goal)}
                  >
                    <View style={styles.goalMain}>
                      <View style={styles.goalInfo}>
                        <ThemedText type="body" numberOfLines={1} style={{ fontWeight: "500" }}>
                          {goal.name}
                        </ThemedText>
                        <View style={styles.goalMeta}>
                          <ThemedText type="small" secondary>
                            {progress}%
                          </ThemedText>
                          {daysToGoal !== null && daysToGoal > 0 && (
                            <>
                              <View
                                style={[styles.metaDot, { backgroundColor: theme.divider }]}
                              />
                              <ThemedText type="small" style={{ color: theme.accent }}>
                                ~{daysToGoal} {getDaysWord(daysToGoal)}
                              </ThemedText>
                            </>
                          )}
                        </View>
                      </View>
                      <View style={styles.goalAmounts}>
                        <ThemedText type="body" style={{ fontWeight: "600" }}>
                          {formatCurrency(goal.currentAmount)}
                        </ThemedText>
                        <ThemedText type="small" secondary>
                          / {formatCurrency(goal.targetAmount)} ₽
                        </ThemedText>
                      </View>
                    </View>
                    <ProgressBar
                      percentage={progress}
                      height={4}
                      color={progress >= 100 ? theme.success : theme.text}
                    />
                  </Pressable>
                );
              })}
            </Card>
          ) : (
            <View style={[styles.emptyGoals, { backgroundColor: theme.card }]}>
              <MaterialCommunityIcons
                name="flag-outline"
                size={40}
                color={theme.textTertiary}
              />
              <ThemedText type="body" secondary style={{ marginTop: Spacing.sm }}>
                Нет активных целей
              </ThemedText>
              <Button
                variant="secondary"
                size="sm"
                onPress={() => navigation.navigate("AddGoal")}
                style={{ marginTop: Spacing.md }}
              >
                Создать цель
              </Button>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <ThemedText type="h4" style={styles.sectionTitle}>
            Быстрые действия
          </ThemedText>
          <View style={styles.actionsGrid}>
            <Pressable
              style={[styles.actionCard, { backgroundColor: theme.card }]}
              onPress={() => navigation.navigate("AddGoal")}
            >
              <View style={[styles.actionIcon, { backgroundColor: theme.primaryMuted }]}>
                <MaterialCommunityIcons name="plus" size={24} color={theme.primary} />
              </View>
              <ThemedText type="body">Новая цель</ThemedText>
            </Pressable>
            <Pressable
              style={[styles.actionCard, { backgroundColor: theme.card }]}
              onPress={() => navigation.navigate("ShiftFlow")}
            >
              <View style={[styles.actionIcon, { backgroundColor: theme.warningMuted }]}>
                <MaterialCommunityIcons
                  name="briefcase-plus"
                  size={24}
                  color={theme.warning}
                />
              </View>
              <ThemedText type="body">Добавить смену</ThemedText>
            </Pressable>
          </View>
        </View>
      </ScrollView>

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
  headerLabel: {
    marginBottom: Spacing.xs,
  },
  totalAmount: {
    textAlign: "center",
  },
  overallProgressContainer: {
    width: "100%",
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.xl,
  },
  statsRow: {
    flexDirection: "row",
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  statCard: {
    flex: 1,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    alignItems: "center",
  },
  quickActions: {
    flexDirection: "row",
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  quickActionCard: {
    flex: 1,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  quickActionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  liveBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
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
  goalMain: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: Spacing.sm,
  },
  goalInfo: {
    flex: 1,
    marginRight: Spacing.md,
  },
  goalMeta: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  metaDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginHorizontal: Spacing.xs,
  },
  goalAmounts: {
    alignItems: "flex-end",
  },
  emptyGoals: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    alignItems: "center",
  },
  actionsGrid: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  actionCard: {
    flex: 1,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    alignItems: "center",
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.sm,
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
