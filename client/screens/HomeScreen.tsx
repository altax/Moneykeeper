import React, { useCallback, useState } from "react";
import {
  StyleSheet,
  ScrollView,
  View,
  RefreshControl,
  Pressable,
  Modal,
  TextInput,
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
  
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [quickAmount, setQuickAmount] = useState("");

  const loadData = useCallback(async () => {
    const activeGoals = await storage.getActiveGoals();
    const inProgressGoals = activeGoals.filter(g => g.currentAmount < g.targetAmount);
    setAllGoals(activeGoals);
    setDisplayGoals(inProgressGoals.slice(0, 5));
    
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

  const totalSaved = allGoals.reduce((sum, g) => sum + g.currentAmount, 0);

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + Spacing.xl,
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
          <ThemedText type="caption" secondary style={styles.headerLabel}>
            Накоплено
          </ThemedText>
          <ThemedText type="amountLarge" style={styles.totalAmount}>
            {formatCurrency(totalSaved)} <ThemedText type="h2" secondary>₽</ThemedText>
          </ThemedText>
        </View>

        <View style={[styles.divider, { backgroundColor: theme.divider }]} />

        <View style={styles.section}>
          {safe.balance > 0 && (
            <Pressable
              style={styles.listItem}
              onPress={() => navigation.navigate("SafeDetail")}
            >
              <View style={styles.listItemContent}>
                <ThemedText type="body">Сейф</ThemedText>
                <View style={styles.listItemRight}>
                  <ThemedText type="body" style={{ color: theme.accent }}>
                    {formatCurrency(safe.balance)} ₽
                  </ThemedText>
                  <MaterialCommunityIcons
                    name="chevron-right"
                    size={20}
                    color={theme.textTertiary}
                  />
                </View>
              </View>
            </Pressable>
          )}

          {activeSessions.length > 0 && (
            <Pressable
              style={styles.listItem}
              onPress={() => navigation.navigate("ShiftFlow")}
            >
              <View style={styles.listItemContent}>
                <ThemedText type="body">Активные смены</ThemedText>
                <View style={styles.listItemRight}>
                  <View style={[styles.badge, { backgroundColor: theme.accent }]}>
                    <ThemedText type="caption" style={styles.badgeText}>
                      {activeSessions.length}
                    </ThemedText>
                  </View>
                  <MaterialCommunityIcons
                    name="chevron-right"
                    size={20}
                    color={theme.textTertiary}
                  />
                </View>
              </View>
            </Pressable>
          )}
        </View>

        {(safe.balance > 0 || activeSessions.length > 0) && (
          <View style={[styles.divider, { backgroundColor: theme.divider }]} />
        )}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <ThemedText type="caption" secondary>
              Цели
            </ThemedText>
            <Pressable onPress={() => navigation.navigate("Main", { screen: "GoalsTab" })}>
              <ThemedText type="small" style={{ color: theme.accent }}>
                Все
              </ThemedText>
            </Pressable>
          </View>

          {displayGoals.length > 0 ? (
            displayGoals.map((goal, index) => {
              const progress = Math.round((goal.currentAmount / goal.targetAmount) * 100);
              const remaining = goal.targetAmount - goal.currentAmount;
              
              return (
                <Pressable
                  key={goal.id}
                  style={[
                    styles.goalItem,
                    index < displayGoals.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.divider },
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
                        {progress}% · осталось {formatCurrency(remaining)} ₽
                      </ThemedText>
                    </View>
                    <View style={styles.goalRight}>
                      <ThemedText type="amount">
                        {formatCurrency(goal.currentAmount)}
                      </ThemedText>
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
            })
          ) : (
            <View style={styles.emptyState}>
              <ThemedText type="body" secondary style={styles.emptyText}>
                Нет активных целей
              </ThemedText>
              <Pressable
                style={styles.addButton}
                onPress={() => navigation.navigate("AddGoal")}
              >
                <ThemedText type="body" style={{ color: theme.accent }}>
                  Создать цель
                </ThemedText>
              </Pressable>
            </View>
          )}
        </View>

        <View style={[styles.divider, { backgroundColor: theme.divider }]} />

        <View style={styles.section}>
          <Pressable
            style={styles.listItem}
            onPress={() => navigation.navigate("AddGoal")}
          >
            <View style={styles.listItemContent}>
              <ThemedText type="body">Новая цель</ThemedText>
              <MaterialCommunityIcons
                name="plus"
                size={20}
                color={theme.textTertiary}
              />
            </View>
          </Pressable>

          <Pressable
            style={styles.listItem}
            onPress={() => navigation.navigate("ShiftFlow")}
          >
            <View style={styles.listItemContent}>
              <ThemedText type="body">Управление сменами</ThemedText>
              <MaterialCommunityIcons
                name="chevron-right"
                size={20}
                color={theme.textTertiary}
              />
            </View>
          </Pressable>
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
    paddingVertical: Spacing.xl,
  },
  headerLabel: {
    marginBottom: Spacing.xs,
  },
  totalAmount: {
    textAlign: "center",
  },
  divider: {
    height: 1,
    marginVertical: Spacing.sm,
  },
  section: {
    paddingVertical: Spacing.sm,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.sm,
  },
  listItem: {
    paddingVertical: Spacing.md,
  },
  listItemContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  listItemRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  badgeText: {
    color: "#0A0A0A",
    fontSize: 11,
    fontWeight: "600",
  },
  goalItem: {
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
  progressTrack: {
    height: 2,
    borderRadius: 1,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 1,
  },
  emptyState: {
    paddingVertical: Spacing.xl,
    alignItems: "center",
  },
  emptyText: {
    marginBottom: Spacing.md,
  },
  addButton: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
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
