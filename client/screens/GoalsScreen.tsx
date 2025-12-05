import React, { useCallback, useState } from "react";
import { StyleSheet, ScrollView, View, RefreshControl, Modal, TextInput, Pressable, FlatList, Alert } from "react-native";
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

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("ru-RU", {
    style: "decimal",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
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
  
  const [workSessions, setWorkSessions] = useState<WorkSession[]>([]);
  const [showWorkModal, setShowWorkModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
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
    
    const activeSessions = await storage.getActiveWorkSessions();
    setWorkSessions(activeSessions);
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
    const remainingOverflow = overflowAmount - transferAmount;

    await storage.addContribution({
      goalId: targetGoal.id,
      amount: transferAmount,
      date: new Date().toISOString(),
      note: "Перенос излишка",
    });

    if (remainingOverflow > 0) {
      await storage.addToSafe(remainingOverflow, "Излишек от накопления");
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setOverflowModal(false);
    setOverflowAmount(0);
    setMainContribution(0);
    setMainGoalId(null);
    setOtherGoals([]);
    await loadData();
  };

  const handleSendToSafe = async () => {
    if (mainGoalId && mainContribution > 0) {
      await storage.addContribution({
        goalId: mainGoalId,
        amount: mainContribution,
        date: new Date().toISOString(),
      });
    }

    await storage.addToSafe(overflowAmount, "Излишек от накопления");
    
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

  const getDateOptions = (): { date: Date; label: string }[] => {
    const options: { date: Date; label: string }[] = [];
    const today = new Date();
    
    for (let i = 0; i < 14; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      
      let label = "";
      if (i === 0) {
        label = "Сегодня";
      } else if (i === 1) {
        label = "Завтра";
      } else if (i === 2) {
        label = "Послезавтра";
      } else {
        label = date.toLocaleDateString("ru-RU", { 
          day: "numeric", 
          month: "short",
          weekday: "short" 
        });
      }
      
      options.push({ date, label });
    }
    
    return options;
  };

  const handleSaveWorkSession = async () => {
    const earning = parseFloat(plannedEarning.replace(/[^\d.]/g, "")) || 0;
    const contribution = parseFloat(plannedContribution.replace(/[^\d.]/g, "")) || 0;

    if (earning <= 0) {
      setShowWorkModal(false);
      return;
    }

    await storage.addWorkSession({
      date: selectedDate.toISOString(),
      operationType: workOperation,
      plannedEarning: earning,
      plannedContribution: contribution,
      isCompleted: false,
    });

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowWorkModal(false);
    setPlannedEarning("");
    setPlannedContribution("");
    setSelectedDate(new Date());
    await loadData();
  };

  const handleCancelWorkSession = (session: WorkSession) => {
    Alert.alert(
      "Отменить запись?",
      "Вы уверены, что хотите отменить эту запись на работу?",
      [
        { text: "Нет", style: "cancel" },
        {
          text: "Да, отменить",
          style: "destructive",
          onPress: async () => {
            await storage.deleteWorkSession(session.id);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            await loadData();
          },
        },
      ]
    );
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

  const getRemainingFunds = (): number => {
    const earning = parseFloat(plannedEarning.replace(/[^\d.]/g, "")) || 0;
    const contribution = parseFloat(plannedContribution.replace(/[^\d.]/g, "")) || 0;
    return Math.max(0, earning - contribution);
  };

  const getTotalPlannedEarnings = (): number => {
    return workSessions.reduce((sum, s) => sum + s.plannedEarning, 0);
  };

  const getTotalPlannedContributions = (): number => {
    return workSessions.reduce((sum, s) => sum + s.plannedContribution, 0);
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
              tintColor={Colors.light.primary}
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
                  color={Colors.light.primary}
                />
              </View>
              <ThemedText type="h3">{greeting}</ThemedText>
            </View>
            <ThemedText type="small" secondary style={styles.subtitle}>
              {goals.length} {getGoalsWord(goals.length)}
            </ThemedText>
          </View>

          {workSessions.length > 0 ? (
            <View style={styles.workSessionsContainer}>
              <View style={styles.workSessionsHeader}>
                <ThemedText type="h4">Запланированные смены</ThemedText>
                <Pressable onPress={() => setShowWorkModal(true)}>
                  <MaterialCommunityIcons
                    name="plus-circle"
                    size={24}
                    color={Colors.light.primary}
                  />
                </Pressable>
              </View>
              
              {workSessions.length > 1 && (
                <View style={styles.totalStats}>
                  <View style={styles.totalStat}>
                    <ThemedText type="caption" secondary>Всего заработок</ThemedText>
                    <ThemedText type="body" style={styles.totalAmount}>
                      {formatCurrency(getTotalPlannedEarnings())} руб.
                    </ThemedText>
                  </View>
                  <View style={styles.totalStat}>
                    <ThemedText type="caption" secondary>Всего вложу</ThemedText>
                    <ThemedText type="body" style={styles.totalContribution}>
                      {formatCurrency(getTotalPlannedContributions())} руб.
                    </ThemedText>
                  </View>
                </View>
              )}

              {workSessions.map((session) => (
                <Pressable
                  key={session.id}
                  style={styles.workCard}
                  onPress={() => handleCancelWorkSession(session)}
                >
                  <View style={styles.workCardHeader}>
                    <View style={styles.workIconContainer}>
                      <MaterialCommunityIcons
                        name={session.operationType === "reception" ? "package-variant" : "package-variant-closed-remove"}
                        size={20}
                        color={Colors.light.primary}
                      />
                    </View>
                    <View style={styles.workCardContent}>
                      <ThemedText type="body" style={styles.workTitle}>
                        {session.operationType === "reception" ? "Приёмка" : "Возвраты"}
                      </ThemedText>
                      <ThemedText type="caption" secondary>
                        {new Date(session.date).toLocaleDateString("ru-RU", { 
                          day: "numeric", 
                          month: "long",
                          weekday: "short"
                        })}
                      </ThemedText>
                    </View>
                    <View style={styles.workAmounts}>
                      <ThemedText type="small" style={styles.workEarning}>
                        +{formatCurrency(session.plannedEarning)}
                      </ThemedText>
                      {session.plannedContribution > 0 && (
                        <ThemedText type="caption" style={styles.workContrib}>
                          -{formatCurrency(session.plannedContribution)} на цель
                        </ThemedText>
                      )}
                    </View>
                  </View>
                </Pressable>
              ))}
            </View>
          ) : (
            <Pressable style={styles.workPromptCard} onPress={() => setShowWorkModal(true)}>
              <MaterialCommunityIcons
                name="briefcase-plus-outline"
                size={24}
                color={Colors.light.primary}
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
                color={Colors.light.textSecondary}
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
                  Максимум: {formatCurrency(quickAddGoal.targetAmount - quickAddGoal.currentAmount)} руб.
                </ThemedText>
              )}
            </View>
            
            <View style={styles.quickAddInputContainer}>
              <TextInput
                style={styles.quickAddInput}
                value={quickAddAmount}
                onChangeText={formatQuickAmount}
                placeholder="0"
                placeholderTextColor={Colors.light.textDisabled}
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
        onRequestClose={() => {}}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.overflowModalContent}>
            <View style={styles.modalHeader}>
              <ThemedText type="h4">Излишек суммы</ThemedText>
              <ThemedText type="body" secondary>
                У вас осталось {formatCurrency(overflowAmount)} руб.
              </ThemedText>
              <ThemedText type="small" secondary style={styles.overflowHint}>
                Куда направить излишек?
              </ThemedText>
            </View>
            
            {otherGoals.length > 0 && (
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
                        Осталось: {formatCurrency(item.targetAmount - item.currentAmount)} руб.
                      </ThemedText>
                    </View>
                    <MaterialCommunityIcons
                      name="arrow-right"
                      size={24}
                      color={Colors.light.primary}
                    />
                  </Pressable>
                )}
                style={styles.overflowGoalsList}
                showsVerticalScrollIndicator={false}
              />
            )}

            <Pressable
              onPress={handleSendToSafe}
              style={styles.safeButton}
            >
              <MaterialCommunityIcons
                name="safe"
                size={20}
                color={Colors.light.safe}
              />
              <ThemedText type="body" style={styles.safeButtonText}>
                Отправить в сейф
              </ThemedText>
            </Pressable>
          </View>
        </View>
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

            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.dateScroll}
              contentContainerStyle={styles.dateScrollContent}
            >
              {getDateOptions().map(({ date, label }) => {
                const isSelected = date.toDateString() === selectedDate.toDateString();
                return (
                  <Pressable
                    key={date.toISOString()}
                    style={[
                      styles.dateOption,
                      isSelected && styles.dateOptionSelected
                    ]}
                    onPress={() => setSelectedDate(date)}
                  >
                    <ThemedText 
                      type="small" 
                      style={isSelected ? styles.dateTextSelected : undefined}
                    >
                      {label}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </ScrollView>

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
                  color={workOperation === "reception" ? Colors.light.buttonText : Colors.light.primary}
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
                  color={workOperation === "returns" ? Colors.light.buttonText : Colors.light.warning}
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
                onChangeText={(text) => formatWorkAmount(text, setPlannedEarning)}
                placeholder="0"
                placeholderTextColor={Colors.light.textDisabled}
                keyboardType="numeric"
              />
              <ThemedText type="body" secondary> руб.</ThemedText>
            </View>

            <ThemedText type="small" secondary style={styles.workLabel}>
              Сколько вложите в цель?
            </ThemedText>
            <View style={styles.workInputContainer}>
              <TextInput
                style={styles.workInput}
                value={plannedContribution}
                onChangeText={(text) => formatWorkAmount(text, setPlannedContribution)}
                placeholder="0"
                placeholderTextColor={Colors.light.textDisabled}
                keyboardType="numeric"
              />
              <ThemedText type="body" secondary> руб.</ThemedText>
            </View>

            {plannedEarning && (
              <View style={styles.remainingFundsCard}>
                <MaterialCommunityIcons
                  name="wallet-outline"
                  size={20}
                  color={Colors.light.primary}
                />
                <View style={styles.remainingFundsContent}>
                  <ThemedText type="small" secondary>
                    Останется свободных средств
                  </ThemedText>
                  <ThemedText type="h4" style={styles.remainingFundsAmount}>
                    {formatCurrency(getRemainingFunds())} руб.
                  </ThemedText>
                </View>
              </View>
            )}

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
                <ThemedText type="body" style={styles.confirmText}>Добавить</ThemedText>
              </Pressable>
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
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.md,
  },
  greetingContainer: {
    marginBottom: Spacing.lg,
  },
  greetingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  piggyIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0, 91, 255, 0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  subtitle: {
    marginLeft: 52,
  },
  workSessionsContainer: {
    marginBottom: Spacing.lg,
  },
  workSessionsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  totalStats: {
    flexDirection: "row",
    gap: Spacing.md,
    marginBottom: Spacing.sm,
    padding: Spacing.sm,
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: BorderRadius.md,
  },
  totalStat: {
    flex: 1,
  },
  totalAmount: {
    color: Colors.light.primary,
    fontWeight: "600",
  },
  totalContribution: {
    color: Colors.light.success,
    fontWeight: "600",
  },
  workCard: {
    backgroundColor: Colors.light.card,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  workCardHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  workIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0, 91, 255, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.sm,
  },
  workCardContent: {
    flex: 1,
  },
  workTitle: {
    fontWeight: "600",
  },
  workAmounts: {
    alignItems: "flex-end",
  },
  workEarning: {
    color: Colors.light.primary,
    fontWeight: "600",
  },
  workContrib: {
    color: Colors.light.success,
  },
  workPromptCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.light.card,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  workPromptContent: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.md,
  },
  modalContent: {
    backgroundColor: Colors.light.card,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    width: "100%",
    maxWidth: 360,
  },
  overflowModalContent: {
    backgroundColor: Colors.light.card,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    width: "100%",
    maxWidth: 360,
    maxHeight: "80%",
  },
  workModalContent: {
    backgroundColor: Colors.light.card,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    width: "100%",
    maxWidth: 400,
    maxHeight: "90%",
  },
  modalHeader: {
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  remainingHint: {
    marginTop: Spacing.xs,
  },
  overflowHint: {
    marginTop: Spacing.xs,
  },
  quickAddInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.lg,
  },
  quickAddInput: {
    fontSize: 40,
    fontWeight: "700",
    color: Colors.light.text,
    textAlign: "center",
    minWidth: 100,
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
    backgroundColor: Colors.light.backgroundSecondary,
  },
  modalButtonConfirm: {
    backgroundColor: Colors.light.primary,
  },
  confirmText: {
    color: Colors.light.buttonText,
    fontWeight: "600",
  },
  overflowGoalsList: {
    maxHeight: 200,
    marginBottom: Spacing.md,
  },
  overflowGoalItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.light.backgroundSecondary,
    marginBottom: Spacing.xs,
  },
  overflowGoalInfo: {
    flex: 1,
  },
  safeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.light.safeLight,
    marginBottom: Spacing.md,
  },
  safeButtonText: {
    color: Colors.light.safe,
    fontWeight: "600",
  },
  dateScroll: {
    marginBottom: Spacing.md,
  },
  dateScrollContent: {
    gap: Spacing.sm,
    paddingHorizontal: Spacing.xs,
  },
  dateOption: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.light.backgroundSecondary,
  },
  dateOptionSelected: {
    backgroundColor: Colors.light.primary,
  },
  dateTextSelected: {
    color: Colors.light.buttonText,
    fontWeight: "600",
  },
  workLabel: {
    marginBottom: Spacing.sm,
  },
  workOperationOptions: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  workOperationOption: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.light.backgroundSecondary,
  },
  workOperationOptionSelected: {
    backgroundColor: Colors.light.primary,
  },
  workOperationTextSelected: {
    color: Colors.light.buttonText,
    fontWeight: "600",
  },
  workInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.md,
  },
  workInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: "600",
    color: Colors.light.text,
    paddingVertical: Spacing.md,
  },
  remainingFundsCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 91, 255, 0.05)",
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  remainingFundsContent: {
    flex: 1,
  },
  remainingFundsAmount: {
    color: Colors.light.primary,
  },
});
