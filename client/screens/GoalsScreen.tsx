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
import { Goal, AppSettings, WorkSession, WorkOperationType, ShiftType } from "@/lib/types";
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
  const [shiftType, setShiftType] = useState<ShiftType>("day");
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);

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

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [customDate, setCustomDate] = useState<Date>(new Date());
  const [pickerMonth, setPickerMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const getMonthDays = (monthDate: Date): (Date | null)[] => {
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days: (Date | null)[] = [];
    
    let startDay = firstDay.getDay();
    if (startDay === 0) startDay = 7;
    for (let i = 1; i < startDay; i++) {
      days.push(null);
    }
    
    for (let d = 1; d <= lastDay.getDate(); d++) {
      days.push(new Date(year, month, d));
    }
    
    return days;
  };

  const isDateDisabled = (date: Date): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);
    return checkDate < today;
  };

  const formatMonthYear = (date: Date): string => {
    return date.toLocaleDateString("ru-RU", { month: "long", year: "numeric" });
  };

  const handlePickerDateSelect = (date: Date) => {
    if (!isDateDisabled(date)) {
      setCustomDate(date);
    }
  };

  const handleOpenDatePicker = () => {
    setCustomDate(selectedDate);
    setPickerMonth(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));
    setShowDatePicker(true);
  };

  const handleConfirmCustomDate = () => {
    if (isDateDisabled(customDate)) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      setSelectedDate(today);
    } else {
      setSelectedDate(customDate);
    }
    setShowDatePicker(false);
  };

  const handlePrevMonth = () => {
    const now = new Date();
    const targetMonth = new Date(pickerMonth.getFullYear(), pickerMonth.getMonth() - 1, 1);
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    if (targetMonth >= currentMonth) {
      setPickerMonth(targetMonth);
    }
  };

  const handleNextMonth = () => {
    setPickerMonth(new Date(pickerMonth.getFullYear(), pickerMonth.getMonth() + 1, 1));
  };

  const canNavigatePrevMonth = () => {
    const now = new Date();
    const targetMonth = new Date(pickerMonth.getFullYear(), pickerMonth.getMonth() - 1, 1);
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    return targetMonth >= currentMonth;
  };

  const getDateOptions = (): { date: Date; label: string; isCustom?: boolean }[] => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const dayAfter = new Date(today);
    dayAfter.setDate(today.getDate() + 2);
    
    return [
      { date: today, label: "Сегодня" },
      { date: tomorrow, label: "Завтра" },
      { date: dayAfter, label: "Послезавтра" },
      { date: new Date(), label: "Другая дата...", isCustom: true },
    ];
  };

  const handleSaveWorkSession = async () => {
    const earning = parseFloat(plannedEarning.replace(/[^\d.]/g, "")) || 0;
    const contribution = parseFloat(plannedContribution.replace(/[^\d.]/g, "")) || 0;

    if (earning <= 0) {
      setShowWorkModal(false);
      return;
    }

    if (contribution > earning) {
      Alert.alert("Ошибка", "Сумма в цель не может превышать заработок");
      return;
    }

    const activeGoals = goals.filter(g => g.currentAmount < g.targetAmount);
    if (contribution > 0 && activeGoals.length > 1 && !selectedGoalId) {
      Alert.alert("Выберите цель", "Укажите, в какую цель направить средства");
      return;
    }

    const sessionDate = selectedDate.toDateString();
    const existingSession = workSessions.find(s => 
      new Date(s.date).toDateString() === sessionDate && s.shiftType === shiftType
    );
    
    if (existingSession) {
      Alert.alert("Ошибка", `У вас уже есть ${shiftType === "day" ? "дневная" : "ночная"} смена на эту дату`);
      return;
    }

    await storage.addWorkSession({
      date: selectedDate.toISOString(),
      operationType: workOperation,
      shiftType: shiftType,
      plannedEarning: earning,
      plannedContribution: contribution,
      goalId: selectedGoalId || undefined,
      isCompleted: false,
    });

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowWorkModal(false);
    setPlannedEarning("");
    setPlannedContribution("");
    setSelectedDate(new Date());
    setShiftType("day");
    setSelectedGoalId(null);
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

  const handleCloseWorkModal = () => {
    const hasData = plannedEarning.length > 0 || plannedContribution.length > 0;
    
    if (hasData) {
      Alert.alert(
        "Отменить запись?",
        "Вы ввели данные. Уверены, что хотите отменить?",
        [
          { text: "Продолжить", style: "cancel" },
          {
            text: "Отменить запись",
            style: "destructive",
            onPress: () => {
              setShowWorkModal(false);
              setPlannedEarning("");
              setPlannedContribution("");
              setSelectedDate(new Date());
              setShiftType("day");
              setSelectedGoalId(null);
            },
          },
        ]
      );
    } else {
      setShowWorkModal(false);
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
                <ThemedText type="h4">Запланированные смены ({workSessions.length})</ThemedText>
                <Pressable onPress={() => setShowWorkModal(true)}>
                  <MaterialCommunityIcons
                    name="plus-circle"
                    size={24}
                    color={Colors.light.primary}
                  />
                </Pressable>
              </View>
              
              <View style={styles.totalStatsCompact}>
                <View style={styles.totalStatCompact}>
                  <MaterialCommunityIcons name="cash-plus" size={16} color={Colors.light.primary} />
                  <ThemedText type="body" style={styles.totalAmount}>
                    {formatCurrency(getTotalPlannedEarnings())}
                  </ThemedText>
                </View>
                <View style={styles.totalStatCompact}>
                  <MaterialCommunityIcons name="arrow-right" size={14} color={Colors.light.textSecondary} />
                  <ThemedText type="body" style={styles.totalContribution}>
                    {formatCurrency(getTotalPlannedContributions())} в цель
                  </ThemedText>
                </View>
                <View style={styles.totalStatCompact}>
                  <MaterialCommunityIcons name="wallet" size={14} color={Colors.light.textSecondary} />
                  <ThemedText type="caption" secondary>
                    Останется: {formatCurrency(getTotalPlannedEarnings() - getTotalPlannedContributions())}
                  </ThemedText>
                </View>
              </View>

              <View style={styles.workSessionsCompact}>
                {workSessions.map((session, index) => (
                  <Pressable
                    key={session.id}
                    style={[
                      styles.workCardCompact,
                      index < workSessions.length - 1 && styles.workCardCompactBorder
                    ]}
                    onPress={() => handleCancelWorkSession(session)}
                  >
                    <View style={[
                      styles.workIconSmall,
                      session.operationType === "returns" && styles.workIconReturns
                    ]}>
                      <MaterialCommunityIcons
                        name={session.operationType === "reception" ? "package-variant" : "package-variant-closed-remove"}
                        size={14}
                        color={session.operationType === "reception" ? Colors.light.primary : Colors.light.warning}
                      />
                    </View>
                    <ThemedText type="small" style={styles.workDateCompact}>
                      {new Date(session.date).toLocaleDateString("ru-RU", { 
                        day: "numeric", 
                        month: "short"
                      })}
                    </ThemedText>
                    <View style={styles.workAmountsCompact}>
                      <ThemedText type="small" style={styles.workEarningCompact}>
                        +{formatCurrency(session.plannedEarning)}
                      </ThemedText>
                      {session.plannedContribution > 0 && (
                        <ThemedText type="caption" style={styles.workContribCompact}>
                          -{formatCurrency(session.plannedContribution)}
                        </ThemedText>
                      )}
                    </View>
                    <MaterialCommunityIcons
                      name="close-circle-outline"
                      size={16}
                      color={Colors.light.textDisabled}
                    />
                  </Pressable>
                ))}
              </View>
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
        onRequestClose={handleCloseWorkModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.workModalContent}>
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
              {getDateOptions().map(({ date, label, isCustom }, index) => {
                const isSelected = !isCustom && date.toDateString() === selectedDate.toDateString();
                return (
                  <Pressable
                    key={isCustom ? "custom" : date.toISOString()}
                    style={[
                      styles.dateOption,
                      isSelected && styles.dateOptionSelected,
                      isCustom && styles.dateOptionCustom,
                    ]}
                    onPress={() => {
                      if (isCustom) {
                        handleOpenDatePicker();
                      } else {
                        setSelectedDate(date);
                      }
                    }}
                  >
                    {isCustom && (
                      <MaterialCommunityIcons
                        name="calendar"
                        size={14}
                        color={Colors.light.textSecondary}
                        style={{ marginRight: 4 }}
                      />
                    )}
                    <ThemedText 
                      type="small" 
                      style={isSelected ? styles.dateTextSelected : (isCustom ? styles.dateTextCustom : undefined)}
                    >
                      {label}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </ScrollView>

            <ThemedText type="small" secondary style={styles.workLabel}>
              Тип смены
            </ThemedText>
            <View style={styles.workOperationOptions}>
              <Pressable
                style={[
                  styles.workOperationOption,
                  shiftType === "day" && styles.workOperationOptionSelected
                ]}
                onPress={() => setShiftType("day")}
              >
                <MaterialCommunityIcons
                  name="white-balance-sunny"
                  size={20}
                  color={shiftType === "day" ? Colors.light.buttonText : Colors.light.primary}
                />
                <ThemedText 
                  type="small" 
                  style={shiftType === "day" ? styles.workOperationTextSelected : undefined}
                >
                  Дневная
                </ThemedText>
              </Pressable>
              <Pressable
                style={[
                  styles.workOperationOption,
                  shiftType === "night" && styles.workOperationOptionSelected
                ]}
                onPress={() => setShiftType("night")}
              >
                <MaterialCommunityIcons
                  name="moon-waning-crescent"
                  size={20}
                  color={shiftType === "night" ? Colors.light.buttonText : Colors.light.textSecondary}
                />
                <ThemedText 
                  type="small" 
                  style={shiftType === "night" ? styles.workOperationTextSelected : undefined}
                >
                  Ночная
                </ThemedText>
              </Pressable>
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

            {(parseFloat(plannedContribution.replace(/[^\d.]/g, "")) || 0) > 0 && goals.filter(g => g.currentAmount < g.targetAmount).length > 1 && (
              <>
                <ThemedText type="small" secondary style={styles.workLabel}>
                  В какую цель?
                </ThemedText>
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  style={styles.goalSelectScroll}
                  contentContainerStyle={styles.goalSelectContent}
                >
                  {goals.filter(g => g.currentAmount < g.targetAmount).map((goal) => {
                    const isSelected = selectedGoalId === goal.id;
                    return (
                      <Pressable
                        key={goal.id}
                        style={[
                          styles.goalSelectOption,
                          isSelected && styles.goalSelectOptionSelected,
                        ]}
                        onPress={() => setSelectedGoalId(isSelected ? null : goal.id)}
                      >
                        <ThemedText 
                          type="small" 
                          style={isSelected ? styles.goalSelectTextSelected : undefined}
                          numberOfLines={1}
                        >
                          {goal.name}
                        </ThemedText>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </>
            )}

            {plannedEarning && (
              <View style={styles.remainingFundsCard}>
                <MaterialCommunityIcons
                  name="safe"
                  size={20}
                  color={Colors.light.safe}
                />
                <View style={styles.remainingFundsContent}>
                  <ThemedText type="small" secondary>
                    Пойдёт в сейф
                  </ThemedText>
                  <ThemedText type="h4" style={styles.remainingFundsAmount}>
                    {formatCurrency(getRemainingFunds())} руб.
                  </ThemedText>
                </View>
              </View>
            )}

            <View style={styles.modalActions}>
              <Pressable
                onPress={handleCloseWorkModal}
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
          </View>
        </View>
      </Modal>

      <Modal
        visible={showDatePicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDatePicker(false)}
      >
        <Pressable 
          style={styles.modalOverlay}
          onPress={() => setShowDatePicker(false)}
        >
          <Pressable style={styles.calendarContent} onPress={() => {}}>
            <View style={styles.modalHeader}>
              <ThemedText type="h4">Выберите дату</ThemedText>
            </View>
            
            <View style={styles.calendarNavigation}>
              <Pressable 
                onPress={handlePrevMonth} 
                style={[styles.calendarNavButton, !canNavigatePrevMonth() && styles.calendarNavButtonDisabled]}
                disabled={!canNavigatePrevMonth()}
              >
                <MaterialCommunityIcons 
                  name="chevron-left" 
                  size={24} 
                  color={canNavigatePrevMonth() ? Colors.light.text : Colors.light.textDisabled} 
                />
              </Pressable>
              <ThemedText type="body" style={styles.calendarMonthTitle}>
                {formatMonthYear(pickerMonth)}
              </ThemedText>
              <Pressable onPress={handleNextMonth} style={styles.calendarNavButton}>
                <MaterialCommunityIcons name="chevron-right" size={24} color={Colors.light.text} />
              </Pressable>
            </View>

            <View style={styles.calendarWeekHeader}>
              {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map((day) => (
                <ThemedText key={day} type="caption" secondary style={styles.calendarWeekDay}>
                  {day}
                </ThemedText>
              ))}
            </View>

            <View style={styles.calendarGrid}>
              {getMonthDays(pickerMonth).map((date, index) => {
                if (!date) {
                  return <View key={`empty-${index}`} style={styles.calendarDayEmpty} />;
                }
                const disabled = isDateDisabled(date);
                const isSelected = date.toDateString() === customDate.toDateString();
                const isToday = date.toDateString() === new Date().toDateString();
                return (
                  <Pressable
                    key={date.toISOString()}
                    style={[
                      styles.calendarDay,
                      disabled && styles.calendarDayDisabled,
                      isSelected && styles.calendarDaySelected,
                      isToday && !isSelected && styles.calendarDayToday,
                    ]}
                    onPress={() => handlePickerDateSelect(date)}
                    disabled={disabled}
                  >
                    <ThemedText
                      type="body"
                      style={[
                        styles.calendarDayText,
                        disabled && styles.calendarDayTextDisabled,
                        isSelected && styles.calendarDayTextSelected,
                      ]}
                    >
                      {date.getDate()}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.calendarSelectedInfo}>
              <ThemedText type="small" secondary>Выбранная дата:</ThemedText>
              <ThemedText type="body" style={styles.calendarSelectedDate}>
                {customDate.toLocaleDateString("ru-RU", { 
                  weekday: "long",
                  day: "numeric", 
                  month: "long",
                  year: "numeric"
                })}
              </ThemedText>
            </View>

            <View style={styles.modalActions}>
              <Pressable
                onPress={() => setShowDatePicker(false)}
                style={[styles.modalButton, styles.modalButtonCancel]}
              >
                <ThemedText type="body" secondary>Отмена</ThemedText>
              </Pressable>
              <Pressable
                onPress={handleConfirmCustomDate}
                style={[styles.modalButton, styles.modalButtonConfirm]}
              >
                <ThemedText type="body" style={styles.confirmText}>Выбрать</ThemedText>
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
  totalStatsCompact: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
    padding: Spacing.sm,
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: BorderRadius.md,
    alignItems: "center",
  },
  totalStatCompact: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  totalAmount: {
    color: Colors.light.primary,
    fontWeight: "600",
  },
  totalContribution: {
    color: Colors.light.success,
    fontWeight: "600",
  },
  workSessionsCompact: {
    backgroundColor: Colors.light.card,
    borderRadius: BorderRadius.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  workCardCompact: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.sm,
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  workCardCompactBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  workIconSmall: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(0, 91, 255, 0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  workIconReturns: {
    backgroundColor: "rgba(245, 158, 11, 0.1)",
  },
  workDateCompact: {
    minWidth: 50,
    color: Colors.light.textSecondary,
  },
  workAmountsCompact: {
    flex: 1,
    alignItems: "flex-end",
  },
  workEarningCompact: {
    color: Colors.light.primary,
    fontWeight: "600",
  },
  workContribCompact: {
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
  dateOptionCustom: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderStyle: "dashed",
  },
  dateTextCustom: {
    color: Colors.light.textSecondary,
  },
  calendarContent: {
    backgroundColor: Colors.light.card,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    width: "100%",
    maxWidth: 340,
  },
  calendarNavigation: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.md,
  },
  calendarNavButton: {
    padding: Spacing.xs,
  },
  calendarNavButtonDisabled: {
    opacity: 0.3,
  },
  calendarMonthTitle: {
    fontWeight: "600",
    textTransform: "capitalize",
  },
  calendarWeekHeader: {
    flexDirection: "row",
    marginBottom: Spacing.xs,
  },
  calendarWeekDay: {
    flex: 1,
    textAlign: "center",
  },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  calendarDay: {
    width: "14.28%",
    aspectRatio: 1,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 20,
  },
  calendarDayEmpty: {
    width: "14.28%",
    aspectRatio: 1,
  },
  calendarDayDisabled: {
    opacity: 0.3,
  },
  calendarDaySelected: {
    backgroundColor: Colors.light.primary,
  },
  calendarDayToday: {
    borderWidth: 1,
    borderColor: Colors.light.primary,
  },
  calendarDayText: {
    fontSize: 14,
  },
  calendarDayTextDisabled: {
    color: Colors.light.textDisabled,
  },
  calendarDayTextSelected: {
    color: Colors.light.buttonText,
    fontWeight: "600",
  },
  calendarSelectedInfo: {
    marginTop: Spacing.md,
    padding: Spacing.sm,
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: BorderRadius.md,
    alignItems: "center",
  },
  calendarSelectedDate: {
    fontWeight: "600",
    color: Colors.light.primary,
    textTransform: "capitalize",
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
  goalSelectScroll: {
    marginBottom: Spacing.md,
  },
  goalSelectContent: {
    gap: Spacing.sm,
    paddingHorizontal: Spacing.xs,
  },
  goalSelectOption: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.light.backgroundSecondary,
    maxWidth: 150,
  },
  goalSelectOptionSelected: {
    backgroundColor: Colors.light.primary,
  },
  goalSelectTextSelected: {
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
