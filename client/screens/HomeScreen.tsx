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
import { Card } from "@/components/Card";
import { GoalCard } from "@/components/GoalCard";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Shadows, QUICK_AMOUNTS } from "@/constants/theme";
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

export default function HomeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  
  const [goals, setGoals] = useState<Goal[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [safe, setSafe] = useState<Safe>({ balance: 0, updatedAt: "" });
  const [activeSessions, setActiveSessions] = useState<WorkSession[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [quickAmount, setQuickAmount] = useState("");

  const loadData = useCallback(async () => {
    const activeGoals = await storage.getActiveGoals();
    setGoals(activeGoals.filter(g => g.currentAmount < g.targetAmount).slice(0, 3));
    
    const appSettings = await storage.getSettings();
    setSettings(appSettings);
    
    const safeData = await storage.getSafe();
    setSafe(safeData);
    
    const sessions = await storage.getActiveWorkSessions();
    setActiveSessions(sessions.filter(s => isShiftActive(s.date, s.shiftType)));
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

  const totalSaved = goals.reduce((sum, g) => sum + g.currentAmount, 0);
  const totalTarget = goals.reduce((sum, g) => sum + g.targetAmount, 0);
  const overallProgress = totalTarget > 0 ? (totalSaved / totalTarget) * 100 : 0;

  const greeting = settings?.userName 
    ? `Привет, ${settings.userName}!` 
    : "Привет!";

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + Spacing.md,
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
        <View style={styles.header}>
          <ThemedText type="h1">{greeting}</ThemedText>
          <ThemedText type="body" secondary style={styles.subtitle}>
            Ваш прогресс накоплений
          </ThemedText>
        </View>

        <View style={[styles.overviewCard, { backgroundColor: theme.primary }]}>
          <View style={styles.overviewContent}>
            <View style={styles.overviewMain}>
              <ThemedText type="caption" style={styles.overviewLabel}>
                Общий прогресс
              </ThemedText>
              <ThemedText type="hero" style={styles.overviewAmount}>
                {formatCurrency(totalSaved)} ₽
              </ThemedText>
              <ThemedText type="body" style={styles.overviewTarget}>
                из {formatCurrency(totalTarget)} ₽
              </ThemedText>
            </View>
            <View style={styles.overviewProgress}>
              <View style={[styles.progressCircle, { borderColor: "rgba(255,255,255,0.3)" }]}>
                <View 
                  style={[
                    styles.progressCircleInner, 
                    { backgroundColor: theme.card }
                  ]}
                >
                  <ThemedText type="h3" style={{ color: theme.primary }}>
                    {Math.round(overallProgress)}%
                  </ThemedText>
                </View>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.quickActions}>
          <Pressable
            style={[styles.quickAction, { backgroundColor: theme.successMuted }]}
            onPress={() => navigation.navigate("ShiftFlow")}
          >
            <MaterialCommunityIcons name="briefcase-clock" size={24} color={theme.success} />
            <ThemedText type="small" style={{ color: theme.success, marginTop: 4 }}>
              Смены
            </ThemedText>
            {activeSessions.length > 0 && (
              <View style={[styles.badge, { backgroundColor: theme.success }]}>
                <ThemedText type="caption" style={styles.badgeText}>
                  {activeSessions.length}
                </ThemedText>
              </View>
            )}
          </Pressable>
          
          <Pressable
            style={[styles.quickAction, { backgroundColor: theme.primaryMuted }]}
            onPress={() => navigation.navigate("SafeDetail")}
          >
            <MaterialCommunityIcons name="safe" size={24} color={theme.primary} />
            <ThemedText type="small" style={{ color: theme.primary, marginTop: 4 }}>
              Сейф
            </ThemedText>
            {safe.balance > 0 && (
              <ThemedText type="caption" style={{ color: theme.primary }}>
                {formatCurrency(safe.balance)} ₽
              </ThemedText>
            )}
          </Pressable>
          
          <Pressable
            style={[styles.quickAction, { backgroundColor: theme.warningMuted }]}
            onPress={() => navigation.navigate("AddGoal")}
          >
            <MaterialCommunityIcons name="plus-circle" size={24} color={theme.warning} />
            <ThemedText type="small" style={{ color: theme.warning, marginTop: 4 }}>
              Новая цель
            </ThemedText>
          </Pressable>
        </View>

        {goals.length > 0 ? (
          <View style={styles.goalsSection}>
            <View style={styles.sectionHeader}>
              <ThemedText type="h3">Активные цели</ThemedText>
              <Pressable onPress={() => navigation.navigate("Main", { screen: "GoalsTab" })}>
                <ThemedText type="link">Все цели</ThemedText>
              </Pressable>
            </View>
            {goals.map((goal) => (
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
        ) : (
          <Card style={styles.emptyCard}>
            <View style={styles.emptyContent}>
              <View style={[styles.emptyIcon, { backgroundColor: theme.primaryMuted }]}>
                <MaterialCommunityIcons name="target" size={32} color={theme.primary} />
              </View>
              <ThemedText type="h4" style={styles.emptyTitle}>
                Начните копить!
              </ThemedText>
              <ThemedText type="body" secondary style={styles.emptyText}>
                Создайте свою первую цель и начните путь к финансовой свободе
              </ThemedText>
              <Button onPress={() => navigation.navigate("AddGoal")} style={styles.emptyButton}>
                Создать цель
              </Button>
            </View>
          </Card>
        )}

        {safe.balance > 0 && goals.length > 0 && (
          <Card style={{...styles.safeCard, borderColor: theme.successMuted }}>
            <View style={styles.safeContent}>
              <View style={[styles.safeIcon, { backgroundColor: theme.successMuted }]}>
                <MaterialCommunityIcons name="safe" size={24} color={theme.success} />
              </View>
              <View style={styles.safeInfo}>
                <ThemedText type="small" secondary>В сейфе</ThemedText>
                <ThemedText type="h4" style={{ color: theme.success }}>
                  {formatCurrency(safe.balance)} ₽
                </ThemedText>
              </View>
              <Pressable
                style={[styles.distributeButton, { backgroundColor: theme.success }]}
                onPress={() => navigation.navigate("SafeDetail")}
              >
                <ThemedText type="small" style={{ color: "#FFFFFF" }}>
                  Распределить
                </ThemedText>
              </Pressable>
            </View>
          </Card>
        )}
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
  header: {
    marginBottom: Spacing.lg,
  },
  subtitle: {
    marginTop: Spacing.xs,
  },
  overviewCard: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    ...Shadows.lg,
  },
  overviewContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  overviewMain: {
    flex: 1,
  },
  overviewLabel: {
    color: "rgba(255,255,255,0.8)",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: Spacing.xs,
  },
  overviewAmount: {
    color: "#FFFFFF",
    marginBottom: 4,
  },
  overviewTarget: {
    color: "rgba(255,255,255,0.8)",
  },
  overviewProgress: {
    marginLeft: Spacing.md,
  },
  progressCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    justifyContent: "center",
    alignItems: "center",
  },
  progressCircleInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  quickActions: {
    flexDirection: "row",
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  quickAction: {
    flex: 1,
    alignItems: "center",
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.lg,
  },
  badge: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "600",
  },
  goalsSection: {
    marginBottom: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  emptyCard: {
    marginBottom: Spacing.lg,
  },
  emptyContent: {
    alignItems: "center",
    paddingVertical: Spacing.xl,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    marginBottom: Spacing.sm,
  },
  emptyText: {
    textAlign: "center",
    marginBottom: Spacing.lg,
  },
  emptyButton: {
    minWidth: 160,
  },
  safeCard: {
    marginBottom: Spacing.lg,
    borderWidth: 2,
  },
  safeContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  safeIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.md,
  },
  safeInfo: {
    flex: 1,
  },
  distributeButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
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
