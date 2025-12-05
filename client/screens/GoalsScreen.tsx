import React, { useCallback, useState } from "react";
import { StyleSheet, ScrollView, View, RefreshControl, Modal, TextInput, Pressable, FlatList } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useHeaderHeight } from "@react-navigation/elements";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { GoalCard } from "@/components/GoalCard";
import { FAB } from "@/components/FAB";
import { EmptyState } from "@/components/EmptyState";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import { storage } from "@/lib/storage";
import { Goal, AppSettings, WorkSession, WorkOperationType } from "@/lib/types";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { GoalsStackParamList } from "@/navigation/GoalsStackNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList & GoalsStackParamList>;

export default function GoalsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [quickAddGoal, setQuickAddGoal] = useState<Goal | null>(null);
  const [quickAddAmount, setQuickAddAmount] = useState("");
  
  const [overflowModal, setOverflowModal] = useState(false);
  const [overflowAmount, setOverflowAmount] = useState(0);
  const [mainContribution, setMainContribution] = useState(0);
  const [mainGoalId, setMainGoalId] = useState<string | null>(null);
  const [otherGoals, setOtherGoals] = useState<Goal[]>([]);
  
  const [workSession, setWorkSession] = useState<WorkSession | null>(null);
  const [showWorkModal, setShowWorkModal] = useState(false);
  const [workDate, setWorkDate] = useState<string>("today");
  const [workOperation, setWorkOperation] = useState<WorkOperationType>("reception");
  const [plannedEarning, setPlannedEarning] = useState("");
  const [plannedContribution, setPlannedContribution] = useState("");

  const loadData = useCallback(async () => {
    const activeGoals = await storage.getActiveGoals();
    setGoals(activeGoals.sort((a, b) => {
      const aCompleted = a.currentAmount >= a.targetAmount;
      const bCompleted = b.currentAmount >= b.targetAmount;
      if (aCompleted !== bCompleted) {
        return aCompleted ? 1 : -1;
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }));
    
    const appSettings = await storage.getSettings();
    setSettings(appSettings);
    
    const activeWorkSession = await storage.getActiveWorkSession();
    setWorkSession(activeWorkSession);
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

  const handleAddGoal = () => {
    navigation.navigate("AddGoal");
  };

  const handleGoalPress = (goalId: string) => {
    navigation.navigate("GoalDetail", { goalId });
  };

  const handleQuickAdd = (goal: Goal) => {
    setQuickAddGoal(goal);
    setQuickAddAmount("");
  };

  const formatQuickAmount = (text: string) => {
    const cleaned = text.replace(/[^\d]/g, "");
    if (!cleaned) {
      setQuickAddAmount("");
      return;
    }
    const number = parseInt(cleaned, 10);
    setQuickAddAmount(number.toLocaleString("ru-RU"));
  };

  const handleQuickAddSubmit = async () => {
    if (!quickAddGoal) return;
    
    const amount = parseFloat(quickAddAmount.replace(/[^\d.]/g, "")) || 0;
    if (amount <= 0) {
      setQuickAddGoal(null);
      return;
    }

    const remaining = quickAddGoal.targetAmount - quickAddGoal.currentAmount;
    
    if (amount > remaining && remaining > 0) {
      const overflow = amount - remaining;
      const availableGoals = goals.filter(g => 
        g.id !== quickAddGoal.id && 
        !g.isArchived && 
        g.currentAmount < g.targetAmount
      );
      
      if (availableGoals.length === 0) {
        await storage.addContribution({
          goalId: quickAddGoal.id,
          amount: remaining,
          date: new Date().toISOString(),
        });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setQuickAddGoal(null);
        await loadData();
        return;
      }
      
      setMainGoalId(quickAddGoal.id);
      setMainContribution(remaining);
      setOverflowAmount(overflow);
      setOtherGoals(availableGoals);
      setQuickAddGoal(null);
      setOverflowModal(true);
      return;
    }

    const finalAmount = Math.min(amount, remaining > 0 ? remaining : amount);

    await storage.addContribution({
      goalId: quickAddGoal.id,
      amount: finalAmount,
      date: new Date().toISOString(),
    });

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setQuickAddGoal(null);
    await loadData();
  };

  const handleOverflowTransfer = async (targetGoal: Goal) => {
    if (mainGoalId && mainContribution > 0) {
      await storage.addContribution({
        goalId: mainGoalId,
        amount: mainContribution,
        date: new Date().toISOString(),
      });
    }

    const targetRemaining = targetGoal.targetAmount - targetGoal.currentAmount;
    const transferAmount = Math.min(overflowAmount, targetRemaining);

    await storage.addContribution({
      goalId: targetGoal.id,
      amount: transferAmount,
      date: new Date().toISOString(),
      note: "Перенос излишка",
    });

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setOverflowModal(false);
    setOverflowAmount(0);
    setMainContribution(0);
    setMainGoalId(null);
    setOtherGoals([]);
    await loadData();
  };

  const handleSkipOverflow = async () => {
    if (mainGoalId && mainContribution > 0) {
      await storage.addContribution({
        goalId: mainGoalId,
        amount: mainContribution,
        date: new Date().toISOString(),
      });
    }
    
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setOverflowModal(false);
    setOverflowAmount(0);
    setMainContribution(0);
    setMainGoalId(null);
    setOtherGoals([]);
    await loadData();
  };

  const formatWorkAmount = (text: string, setter: (value: string) => void) => {
    const cleaned = text.replace(/[^\d]/g, "");
    if (!cleaned) {
      setter("");
      return;
    }
    const number = parseInt(cleaned, 10);
    setter(number.toLocaleString("ru-RU"));
  };

  const getWorkDateLabel = (date: string): string => {
    switch (date) {
      case "today": return "Сегодня";
      case "tomorrow": return "Завтра";
      case "dayAfterTomorrow": return "Послезавтра";
      default: return date;
    }
  };

  const getWorkDateValue = (date: string): Date => {
    const now = new Date();
    switch (date) {
      case "today": return now;
      case "tomorrow": 
        now.setDate(now.getDate() + 1);
        return now;
      case "dayAfterTomorrow":
        now.setDate(now.getDate() + 2);
        return now;
      default: return now;
    }
  };

  const handleSaveWorkSession = async () => {
    const earning = parseFloat(plannedEarning.replace(/[^\d.]/g, "")) || 0;
    const contribution = parseFloat(plannedContribution.replace(/[^\d.]/g, "")) || 0;

    if (earning <= 0) {
      setShowWorkModal(false);
      return;
    }

    await storage.addWorkSession({
      date: getWorkDateValue(workDate).toISOString(),
      operationType: workOperation,
      plannedEarning: earning,
      plannedContribution: contribution,
      isCompleted: false,
    });

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowWorkModal(false);
    setPlannedEarning("");
    setPlannedContribution("");
    await loadData();
  };

  const handleClearWorkSession = async () => {
    if (workSession) {
      await storage.deleteWorkSession(workSession.id);
      setWorkSession(null);
      await loadData();
    }
  };

  const calculateDaysToGoal = (goal: Goal): number | null => {
    if (!settings?.averageDailyEarning || settings.averageDailyEarning <= 0) {
      return null;
    }
    const remaining = Math.max(0, goal.targetAmount - goal.currentAmount);
    if (remaining === 0) return 0;
    return Math.ceil(remaining / settings.averageDailyEarning);
  };

  const greeting = settings?.userName 
    ? `Привет, ${settings.userName}!` 
    : "Мои цели";

  const getEncouragementMessage = (earning: number): string => {
    if (earning >= 5000) {
      return "Отличный план! Вы на пути к успеху!";
    } else if (earning >= 3000) {
      return "Хорошая сумма! Каждый шаг приближает к цели!";
    } else {
      return "Молодец! Регулярность — ключ к успеху!";
    }
  };

  return (
    <ThemedView style={styles.container}>
      {goals.length === 0 ? (
        <View style={[
          styles.emptyContainer,
          { paddingTop: headerHeight + Spacing.xl }
        ]}>
          <EmptyState
            icon="target"
            title="Нет целей"
            description="Создайте свою первую цель для накоплений"
            actionLabel="Создать цель"
            onAction={handleAddGoal}
          />
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingTop: headerHeight + Spacing.md,
              paddingBottom: tabBarHeight + Spacing.xl + Spacing.fabSize + Spacing.md,
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
          <View style={styles.greetingContainer}>
            <View style={styles.greetingRow}>
              <View style={styles.piggyIcon}>
                <MaterialCommunityIcons
                  name="piggy-bank"
                  size={24}
                  color={Colors.dark.primary}
                />
              </View>
              <ThemedText type="h3">{greeting}</ThemedText>
            </View>
            <ThemedText type="small" secondary style={styles.subtitle}>
              {goals.length} {getGoalsWord(goals.length)}
            </ThemedText>
          </View>

          {workSession ? (
            <Pressable style={styles.workCard} onPress={handleClearWorkSession}>
              <View style={styles.workCardHeader}>
                <View style={styles.workIconContainer}>
                  <MaterialCommunityIcons
                    name={workSession.operationType === "reception" ? "package-variant" : "package-variant-closed-remove"}
                    size={24}
                    color={Colors.dark.primary}
                  />
                </View>
                <View style={styles.workCardContent}>
                  <ThemedText type="bodyLarge" style={styles.workTitle}>
                    {workSession.operationType === "reception" ? "Приёмка" : "Возвраты"}
                  </ThemedText>
                  <ThemedText type="small" secondary>
                    {new Date(workSession.date).toLocaleDateString("ru-RU", { 
                      day: "numeric", 
                      month: "long" 
                    })}
                  </ThemedText>
                </View>
                <MaterialCommunityIcons
                  name="close"
                  size={20}
                  color={Colors.dark.textSecondary}
                />
              </View>
              <View style={styles.workCardDetails}>
                <View style={styles.workStat}>
                  <ThemedText type="caption" secondary>Планируемый заработок</ThemedText>
                  <ThemedText type="h4" style={styles.workAmount}>
                    {workSession.plannedEarning.toLocaleString("ru-RU")} руб.
                  </ThemedText>
                </View>
                {workSession.plannedContribution > 0 ? (
                  <View style={styles.workStat}>
                    <ThemedText type="caption" secondary>Вложу в цель</ThemedText>
                    <ThemedText type="h4" style={styles.workContribution}>
                      {workSession.plannedContribution.toLocaleString("ru-RU")} руб.
                    </ThemedText>
                  </View>
                ) : null}
              </View>
              <View style={styles.encouragementContainer}>
                <MaterialCommunityIcons
                  name="star"
                  size={16}
                  color={Colors.dark.warning}
                />
                <ThemedText type="small" style={styles.encouragementText}>
                  {getEncouragementMessage(workSession.plannedEarning)}
                </ThemedText>
              </View>
            </Pressable>
          ) : (
            <Pressable style={styles.workPromptCard} onPress={() => setShowWorkModal(true)}>
              <MaterialCommunityIcons
                name="briefcase-plus-outline"
                size={24}
                color={Colors.dark.primary}
              />
              <View style={styles.workPromptContent}>
                <ThemedText type="body">Планируете выйти на склад?</ThemedText>
                <ThemedText type="small" secondary>
                  Нажмите, чтобы добавить смену
                </ThemedText>
              </View>
              <MaterialCommunityIcons
                name="chevron-right"
                size={24}
                color={Colors.dark.textSecondary}
              />
            </Pressable>
          )}

          {goals.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              onPress={() => handleGoalPress(goal.id)}
              onQuickAdd={() => handleQuickAdd(goal)}
              daysToGoal={calculateDaysToGoal(goal)}
            />
          ))}
        </ScrollView>
      )}
      <FAB
        onPress={handleAddGoal}
        style={{
          bottom: tabBarHeight + Spacing.xl,
          right: Spacing.md,
        }}
      />

      <Modal
        visible={quickAddGoal !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setQuickAddGoal(null)}
      >
        <Pressable 
          style={styles.modalOverlay}
          onPress={() => setQuickAddGoal(null)}
        >
          <Pressable style={styles.modalContent} onPress={() => {}}>
            <View style={styles.modalHeader}>
              <ThemedText type="h4">Пополнить</ThemedText>
              <ThemedText type="body" secondary numberOfLines={1}>
                {quickAddGoal?.name}
              </ThemedText>
              {quickAddGoal && (
                <ThemedText type="small" secondary style={styles.remainingHint}>
                  Максимум: {(quickAddGoal.targetAmount - quickAddGoal.currentAmount).toLocaleString("ru-RU")} руб.
                </ThemedText>
              )}
            </View>
            
            <View style={styles.quickAddInputContainer}>
              <TextInput
                style={styles.quickAddInput}
                value={quickAddAmount}
                onChangeText={formatQuickAmount}
                placeholder="0"
                placeholderTextColor={Colors.dark.textDisabled}
                keyboardType="numeric"
                autoFocus
                onSubmitEditing={handleQuickAddSubmit}
                returnKeyType="done"
              />
              <ThemedText type="h3" secondary> руб.</ThemedText>
            </View>

            <View style={styles.modalActions}>
              <Pressable
                onPress={() => setQuickAddGoal(null)}
                style={[styles.modalButton, styles.modalButtonCancel]}
              >
                <ThemedText type="body" secondary>Отмена</ThemedText>
              </Pressable>
              <Pressable
                onPress={handleQuickAddSubmit}
                style={[styles.modalButton, styles.modalButtonConfirm]}
              >
                <ThemedText type="body" style={styles.confirmText}>Добавить</ThemedText>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={overflowModal}
        transparent
        animationType="fade"
        onRequestClose={handleSkipOverflow}
      >
        <Pressable 
          style={styles.modalOverlay}
          onPress={handleSkipOverflow}
        >
          <Pressable style={styles.overflowModalContent} onPress={() => {}}>
            <View style={styles.modalHeader}>
              <ThemedText type="h4">Излишек суммы</ThemedText>
              <ThemedText type="body" secondary>
                У вас осталось {overflowAmount.toLocaleString("ru-RU")} руб.
              </ThemedText>
              <ThemedText type="small" secondary style={styles.overflowHint}>
                Хотите перенести на другую цель?
              </ThemedText>
            </View>
            
            <FlatList
              data={otherGoals}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <Pressable
                  style={styles.overflowGoalItem}
                  onPress={() => handleOverflowTransfer(item)}
                >
                  <View style={styles.overflowGoalInfo}>
                    <ThemedText type="body" numberOfLines={1}>{item.name}</ThemedText>
                    <ThemedText type="small" secondary>
                      Осталось: {(item.targetAmount - item.currentAmount).toLocaleString("ru-RU")} руб.
                    </ThemedText>
                  </View>
                  <MaterialCommunityIcons
                    name="arrow-right"
                    size={24}
                    color={Colors.dark.primary}
                  />
                </Pressable>
              )}
              style={styles.overflowGoalsList}
              showsVerticalScrollIndicator={false}
            />

            <Pressable
              onPress={handleSkipOverflow}
              style={[styles.modalButton, styles.modalButtonCancel, styles.skipButton]}
            >
              <ThemedText type="body" secondary>Пропустить</ThemedText>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={showWorkModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowWorkModal(false)}
      >
        <Pressable 
          style={styles.modalOverlay}
          onPress={() => setShowWorkModal(false)}
        >
          <Pressable style={styles.workModalContent} onPress={() => {}}>
            <View style={styles.modalHeader}>
              <ThemedText type="h4">Планирование смены</ThemedText>
              <ThemedText type="small" secondary>
                Когда вы выходите на склад?
              </ThemedText>
            </View>

            <View style={styles.workDateOptions}>
              {["today", "tomorrow", "dayAfterTomorrow"].map((date) => (
                <Pressable
                  key={date}
                  style={[
                    styles.workDateOption,
                    workDate === date && styles.workDateOptionSelected
                  ]}
                  onPress={() => setWorkDate(date)}
                >
                  <ThemedText 
                    type="small" 
                    style={workDate === date ? styles.workDateTextSelected : undefined}
                  >
                    {getWorkDateLabel(date)}
                  </ThemedText>
                </Pressable>
              ))}
            </View>

            <ThemedText type="small" secondary style={styles.workLabel}>
              Тип операции
            </ThemedText>
            <View style={styles.workOperationOptions}>
              <Pressable
                style={[
                  styles.workOperationOption,
                  workOperation === "reception" && styles.workOperationOptionSelected
                ]}
                onPress={() => setWorkOperation("reception")}
              >
                <MaterialCommunityIcons
                  name="package-variant"
                  size={20}
                  color={workOperation === "reception" ? Colors.dark.buttonText : Colors.dark.primary}
                />
                <ThemedText 
                  type="small" 
                  style={workOperation === "reception" ? styles.workOperationTextSelected : undefined}
                >
                  Приёмка
                </ThemedText>
              </Pressable>
              <Pressable
                style={[
                  styles.workOperationOption,
                  workOperation === "returns" && styles.workOperationOptionSelected
                ]}
                onPress={() => setWorkOperation("returns")}
              >
                <MaterialCommunityIcons
                  name="package-variant-closed-remove"
                  size={20}
                  color={workOperation === "returns" ? Colors.dark.buttonText : Colors.dark.warning}
                />
                <ThemedText 
                  type="small" 
                  style={workOperation === "returns" ? styles.workOperationTextSelected : undefined}
                >
                  Возвраты
                </ThemedText>
              </Pressable>
            </View>

            <ThemedText type="small" secondary style={styles.workLabel}>
              Сколько планируете заработать?
            </ThemedText>
            <View style={styles.workInputContainer}>
              <TextInput
                style={styles.workInput}
                value={plannedEarning}
                onChangeText={(t) => formatWorkAmount(t, setPlannedEarning)}
                placeholder="0"
                placeholderTextColor={Colors.dark.textDisabled}
                keyboardType="numeric"
              />
              <ThemedText type="body" secondary>руб.</ThemedText>
            </View>

            <ThemedText type="small" secondary style={styles.workLabel}>
              Сколько хотите вложить в цель?
            </ThemedText>
            <View style={styles.workInputContainer}>
              <TextInput
                style={styles.workInput}
                value={plannedContribution}
                onChangeText={(t) => formatWorkAmount(t, setPlannedContribution)}
                placeholder="0"
                placeholderTextColor={Colors.dark.textDisabled}
                keyboardType="numeric"
              />
              <ThemedText type="body" secondary>руб.</ThemedText>
            </View>

            <View style={styles.modalActions}>
              <Pressable
                onPress={() => setShowWorkModal(false)}
                style={[styles.modalButton, styles.modalButtonCancel]}
              >
                <ThemedText type="body" secondary>Отмена</ThemedText>
              </Pressable>
              <Pressable
                onPress={handleSaveWorkSession}
                style={[styles.modalButton, styles.modalButtonConfirm]}
              >
                <ThemedText type="body" style={styles.confirmText}>Сохранить</ThemedText>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </ThemedView>
  );
}

function getGoalsWord(count: number): string {
  const lastTwo = count % 100;
  const lastOne = count % 10;
  
  if (lastTwo >= 11 && lastTwo <= 19) {
    return "целей";
  }
  if (lastOne === 1) {
    return "цель";
  }
  if (lastOne >= 2 && lastOne <= 4) {
    return "цели";
  }
  return "целей";
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
  greetingContainer: {
    marginBottom: Spacing.sm,
  },
  greetingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  piggyIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.dark.backgroundSecondary,
    justifyContent: "center",
    alignItems: "center",
  },
  subtitle: {
    marginTop: Spacing.xs,
    marginLeft: 52,
  },
  workPromptCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.dark.backgroundDefault,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    borderStyle: "dashed",
    gap: Spacing.sm,
  },
  workPromptContent: {
    flex: 1,
  },
  workCard: {
    backgroundColor: Colors.dark.backgroundDefault,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.dark.primary,
  },
  workCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  workIconContainer: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.dark.backgroundSecondary,
    justifyContent: "center",
    alignItems: "center",
  },
  workCardContent: {
    flex: 1,
  },
  workTitle: {
    fontWeight: "600",
  },
  workCardDetails: {
    flexDirection: "row",
    gap: Spacing.lg,
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.border,
  },
  workStat: {
    flex: 1,
  },
  workAmount: {
    color: Colors.dark.primary,
    marginTop: 2,
  },
  workContribution: {
    color: Colors.dark.success,
    marginTop: 2,
  },
  encouragementContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.border,
  },
  encouragementText: {
    color: Colors.dark.warning,
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.lg,
  },
  modalContent: {
    backgroundColor: Colors.dark.backgroundDefault,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    width: "100%",
    maxWidth: 340,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  overflowModalContent: {
    backgroundColor: Colors.dark.backgroundDefault,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    width: "100%",
    maxWidth: 340,
    maxHeight: "70%",
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  workModalContent: {
    backgroundColor: Colors.dark.backgroundDefault,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    width: "100%",
    maxWidth: 380,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  modalHeader: {
    marginBottom: Spacing.lg,
  },
  remainingHint: {
    marginTop: Spacing.xs,
    color: Colors.dark.warning,
  },
  overflowHint: {
    marginTop: Spacing.sm,
  },
  quickAddInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.lg,
  },
  quickAddInput: {
    fontSize: 36,
    fontWeight: "700",
    color: Colors.dark.primary,
    textAlign: "right",
    minWidth: 100,
  },
  overflowGoalsList: {
    maxHeight: 200,
    marginBottom: Spacing.md,
  },
  overflowGoalItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.dark.backgroundSecondary,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  overflowGoalInfo: {
    flex: 1,
  },
  skipButton: {
    marginTop: Spacing.sm,
  },
  workDateOptions: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  workDateOption: {
    flex: 1,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.dark.backgroundSecondary,
    alignItems: "center",
  },
  workDateOptionSelected: {
    backgroundColor: Colors.dark.primary,
  },
  workDateTextSelected: {
    color: Colors.dark.buttonText,
  },
  workLabel: {
    marginBottom: Spacing.xs,
    marginLeft: Spacing.xs,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  workOperationOptions: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  workOperationOption: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.dark.backgroundSecondary,
  },
  workOperationOptionSelected: {
    backgroundColor: Colors.dark.primary,
  },
  workOperationTextSelected: {
    color: Colors.dark.buttonText,
  },
  workInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.dark.backgroundSecondary,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  workInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: "600",
    color: Colors.dark.text,
    paddingVertical: Spacing.md,
  },
  modalActions: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  modalButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: "center",
  },
  modalButtonCancel: {
    backgroundColor: Colors.dark.backgroundSecondary,
  },
  modalButtonConfirm: {
    backgroundColor: Colors.dark.primary,
  },
  confirmText: {
    color: Colors.dark.buttonText,
    fontWeight: "600",
  },
});
