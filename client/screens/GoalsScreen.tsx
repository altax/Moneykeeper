import React, { useCallback, useState } from "react";
import { StyleSheet, ScrollView, View, RefreshControl, Modal, TextInput, Pressable, FlatList, Alert, Dimensions } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useHeaderHeight } from "@react-navigation/elements";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { GoalCard } from "@/components/GoalCard";
import { EmptyState } from "@/components/EmptyState";
import { Colors, Spacing, BorderRadius, Responsive } from "@/constants/theme";
import { storage } from "@/lib/storage";
import { Goal, AppSettings, WorkSession, WorkOperationType, ShiftType } from "@/lib/types";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { GoalsStackParamList } from "@/navigation/GoalsStackNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList & GoalsStackParamList>;

const { width: SCREEN_WIDTH } = Dimensions.get("window");

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
  
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [completingSession, setCompletingSession] = useState<WorkSession | null>(null);
  const [actualEarning, setActualEarning] = useState("");
  const [actualContribution, setActualContribution] = useState("");
  const [completeGoalId, setCompleteGoalId] = useState<string | null>(null);
  const [sessionsToComplete, setSessionsToComplete] = useState<WorkSession[]>([]);

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
    
    const toComplete = await storage.getTodayOrPastUncompletedSessions();
    setSessionsToComplete(toComplete);
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
      "Отменить смену?",
      "Вы уверены, что хотите удалить эту запись?",
      [
        { text: "Нет", style: "cancel" },
        {
          text: "Удалить",
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

  const handleOpenCompleteModal = (session: WorkSession) => {
    setCompletingSession(session);
    setActualEarning(session.plannedEarning.toLocaleString("ru-RU"));
    setActualContribution(session.plannedContribution.toLocaleString("ru-RU"));
    setCompleteGoalId(session.goalId || null);
    setShowCompleteModal(true);
  };

  const handleCompleteSession = async () => {
    if (!completingSession) return;

    const earning = parseFloat(actualEarning.replace(/[^\d.]/g, "")) || 0;
    const contribution = parseFloat(actualContribution.replace(/[^\d.]/g, "")) || 0;

    if (contribution > earning) {
      Alert.alert("Ошибка", "Взнос не может превышать заработок");
      return;
    }

    const activeGoals = goals.filter(g => g.currentAmount < g.targetAmount);
    if (contribution > 0 && activeGoals.length > 1 && !completeGoalId) {
      Alert.alert("Выберите цель", "Укажите, в какую цель направить средства");
      return;
    }

    const goalId = completeGoalId || (activeGoals.length === 1 ? activeGoals[0].id : undefined);
    await storage.completeWorkSession(completingSession.id, earning, contribution, goalId);
    
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowCompleteModal(false);
    setCompletingSession(null);
    setActualEarning("");
    setActualContribution("");
    setCompleteGoalId(null);
    await loadData();
  };

  const handleSkipSession = async () => {
    if (!completingSession) return;

    Alert.alert(
      "Пропустить смену?",
      "Смена будет удалена. Деньги не будут перемещены.",
      [
        { text: "Отмена", style: "cancel" },
        {
          text: "Пропустить",
          style: "destructive",
          onPress: async () => {
            await storage.skipWorkSession(completingSession.id);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setShowCompleteModal(false);
            setCompletingSession(null);
            await loadData();
          },
        },
      ]
    );
  };

  const formatActualAmount = (text: string, setter: (value: string) => void) => {
    const cleaned = text.replace(/[^\d]/g, "");
    if (!cleaned) {
      setter("");
      return;
    }
    const number = parseInt(cleaned, 10);
    setter(number.toLocaleString("ru-RU"));
  };

  const getActualFreeToSafe = (): number => {
    const earning = parseFloat(actualEarning.replace(/[^\d.]/g, "")) || 0;
    const contribution = parseFloat(actualContribution.replace(/[^\d.]/g, "")) || 0;
    return Math.max(0, earning - contribution);
  };

  const getGoalName = (goalId: string | undefined): string | null => {
    if (!goalId) return null;
    const goal = goals.find(g => g.id === goalId);
    return goal?.name || null;
  };

  const getTotalFreeToSafe = (): number => {
    return getTotalPlannedEarnings() - getTotalPlannedContributions();
  };

  const handleCloseWorkModal = () => {
    const hasData = plannedEarning.length > 0 || plannedContribution.length > 0;
    
    if (hasData) {
      Alert.alert(
        "Отменить?",
        "Вы ввели данные. Уверены, что хотите отменить?",
        [
          { text: "Продолжить", style: "cancel" },
          {
            text: "Отменить",
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
    ? `${settings.userName}` 
    : "Мои цели";

  const getTotalPlannedEarnings = (): number => {
    return workSessions.reduce((sum, s) => sum + s.plannedEarning, 0);
  };

  const getTotalPlannedContributions = (): number => {
    return workSessions.reduce((sum, s) => sum + s.plannedContribution, 0);
  };

  const getRemainingFunds = (): number => {
    const earning = parseFloat(plannedEarning.replace(/[^\d.]/g, "")) || 0;
    const contribution = parseFloat(plannedContribution.replace(/[^\d.]/g, "")) || 0;
    return Math.max(0, earning - contribution);
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
              paddingBottom: tabBarHeight + Spacing.xl,
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
          <View style={styles.headerSection}>
            <View style={styles.greetingRow}>
              <ThemedText type="h2" style={styles.greeting}>{greeting}</ThemedText>
              <Pressable 
                style={styles.addButton}
                onPress={handleAddGoal}
              >
                <ThemedText type="small" style={styles.addButtonText}>Новая цель</ThemedText>
              </Pressable>
            </View>
            <ThemedText type="small" style={styles.subtitle}>
              {goals.length} {getGoalsWord(goals.length)} активно
            </ThemedText>
          </View>

          {sessionsToComplete.length > 0 && (
            <Pressable 
              style={styles.completeShiftBanner}
              onPress={() => handleOpenCompleteModal(sessionsToComplete[0])}
            >
              <View style={styles.completeShiftBannerIcon}>
                <MaterialCommunityIcons
                  name="clock-check-outline"
                  size={20}
                  color={Colors.light.buttonText}
                />
              </View>
              <View style={styles.completeShiftBannerContent}>
                <ThemedText type="body" style={styles.completeShiftBannerTitle}>
                  Завершите смену
                </ThemedText>
                <ThemedText type="caption" style={styles.completeShiftBannerSubtitle}>
                  {new Date(sessionsToComplete[0].date).toLocaleDateString("ru-RU", {
                    day: "numeric",
                    month: "long"
                  })} • {sessionsToComplete[0].shiftType === "day" ? "Дневная" : "Ночная"}
                </ThemedText>
              </View>
              <MaterialCommunityIcons
                name="chevron-right"
                size={20}
                color={Colors.light.buttonText}
              />
            </Pressable>
          )}

          {workSessions.length > 0 ? (
            <View style={styles.shiftsCard}>
              <View style={styles.shiftsHeader}>
                <View style={styles.shiftsHeaderLeft}>
                  <View style={styles.shiftsIcon}>
                    <MaterialCommunityIcons
                      name="calendar-clock"
                      size={18}
                      color={Colors.light.primary}
                    />
                  </View>
                  <ThemedText type="h4" style={styles.shiftsTitle}>Запланировано</ThemedText>
                </View>
                <Pressable 
                  style={styles.addShiftButton}
                  onPress={() => setShowWorkModal(true)}
                >
                  <MaterialCommunityIcons
                    name="plus"
                    size={18}
                    color={Colors.light.primary}
                  />
                </Pressable>
              </View>
              
              <View style={styles.shiftsSummaryThree}>
                <View style={styles.shiftsSummaryItemThree}>
                  <ThemedText type="caption" style={styles.shiftsSummaryLabel}>Заработок</ThemedText>
                  <ThemedText type="body" style={styles.shiftsSummaryValue}>
                    {formatCurrency(getTotalPlannedEarnings())} ₽
                  </ThemedText>
                </View>
                <View style={styles.shiftsSummaryDividerVertical} />
                <View style={styles.shiftsSummaryItemThree}>
                  <ThemedText type="caption" style={styles.shiftsSummaryLabel}>В цели</ThemedText>
                  <ThemedText type="body" style={styles.shiftsSummaryValueAccent}>
                    {formatCurrency(getTotalPlannedContributions())} ₽
                  </ThemedText>
                </View>
                <View style={styles.shiftsSummaryDividerVertical} />
                <View style={styles.shiftsSummaryItemThree}>
                  <ThemedText type="caption" style={styles.shiftsSummaryLabel}>В сейф</ThemedText>
                  <ThemedText type="body" style={styles.shiftsSummaryValueSuccess}>
                    {formatCurrency(getTotalFreeToSafe())} ₽
                  </ThemedText>
                </View>
              </View>

              <View style={styles.shiftsList}>
                {workSessions.map((session, index) => {
                  const goalName = getGoalName(session.goalId);
                  const freeAmount = session.plannedEarning - session.plannedContribution;
                  const canComplete = sessionsToComplete.some(s => s.id === session.id);
                  
                  return (
                    <View
                      key={session.id}
                      style={[
                        styles.shiftItemNew,
                        index < workSessions.length - 1 && styles.shiftItemBorder
                      ]}
                    >
                      <View style={styles.shiftItemHeader}>
                        <View style={styles.shiftDateNew}>
                          <ThemedText type="body" style={styles.shiftDateTextNew}>
                            {new Date(session.date).toLocaleDateString("ru-RU", { 
                              day: "numeric", 
                              month: "short"
                            })}
                          </ThemedText>
                          <View style={styles.shiftTypeBadge}>
                            <MaterialCommunityIcons
                              name={session.shiftType === "day" ? "weather-sunny" : "weather-night"}
                              size={12}
                              color={Colors.light.textSecondary}
                            />
                            <ThemedText type="caption" style={styles.shiftTypeText}>
                              {session.shiftType === "day" ? "День" : "Ночь"}
                            </ThemedText>
                          </View>
                        </View>
                        <Pressable 
                          style={styles.shiftDeleteButton}
                          onPress={() => handleCancelWorkSession(session)}
                        >
                          <MaterialCommunityIcons
                            name="close"
                            size={16}
                            color={Colors.light.textTertiary}
                          />
                        </Pressable>
                      </View>

                      <View style={styles.shiftDetailsGrid}>
                        <View style={styles.shiftDetailItem}>
                          <ThemedText type="caption" style={styles.shiftDetailLabel}>Заработок</ThemedText>
                          <ThemedText type="body" style={styles.shiftDetailValue}>
                            {formatCurrency(session.plannedEarning)} ₽
                          </ThemedText>
                        </View>
                        {session.plannedContribution > 0 && (
                          <View style={styles.shiftDetailItem}>
                            <ThemedText type="caption" style={styles.shiftDetailLabel}>
                              {goalName ? `→ ${goalName}` : "В цель"}
                            </ThemedText>
                            <ThemedText type="body" style={styles.shiftDetailValueAccent}>
                              {formatCurrency(session.plannedContribution)} ₽
                            </ThemedText>
                          </View>
                        )}
                        {freeAmount > 0 && (
                          <View style={styles.shiftDetailItem}>
                            <ThemedText type="caption" style={styles.shiftDetailLabel}>→ Сейф</ThemedText>
                            <ThemedText type="body" style={styles.shiftDetailValueSuccess}>
                              {formatCurrency(freeAmount)} ₽
                            </ThemedText>
                          </View>
                        )}
                      </View>

                      {canComplete && (
                        <Pressable 
                          style={styles.completeShiftButton}
                          onPress={() => handleOpenCompleteModal(session)}
                        >
                          <MaterialCommunityIcons
                            name="check-circle-outline"
                            size={16}
                            color={Colors.light.primary}
                          />
                          <ThemedText type="small" style={styles.completeShiftButtonText}>
                            Завершить смену
                          </ThemedText>
                        </Pressable>
                      )}
                    </View>
                  );
                })}
              </View>
            </View>
          ) : (
            <Pressable style={styles.addShiftCard} onPress={() => setShowWorkModal(true)}>
              <View style={styles.addShiftIcon}>
                <MaterialCommunityIcons
                  name="calendar-plus"
                  size={20}
                  color={Colors.light.primary}
                />
              </View>
              <View style={styles.addShiftContent}>
                <ThemedText type="body" style={styles.addShiftTitle}>Добавить смену</ThemedText>
                <ThemedText type="caption" style={styles.addShiftSubtitle}>
                  Планируйте заработок
                </ThemedText>
              </View>
              <MaterialCommunityIcons
                name="chevron-right"
                size={20}
                color={Colors.light.textTertiary}
              />
            </Pressable>
          )}

          <View style={styles.goalsSection}>
            {goals.map((goal) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                onPress={() => handleGoalPress(goal.id)}
                onQuickAdd={() => handleQuickAdd(goal)}
                daysToGoal={calculateDaysToGoal(goal)}
              />
            ))}
          </View>
        </ScrollView>
      )}

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
              <ThemedText type="small" style={styles.modalSubtitle} numberOfLines={1}>
                {quickAddGoal?.name}
              </ThemedText>
              {quickAddGoal && (
                <ThemedText type="caption" style={styles.modalHint}>
                  Осталось: {formatCurrency(quickAddGoal.targetAmount - quickAddGoal.currentAmount)} ₽
                </ThemedText>
              )}
            </View>

            <View style={styles.quickAddInputContainer}>
              <TextInput
                style={styles.quickAddInput}
                value={quickAddAmount}
                onChangeText={formatQuickAmount}
                placeholder="0"
                placeholderTextColor={Colors.light.textTertiary}
                keyboardType="numeric"
                autoFocus
              />
              <ThemedText type="h3" style={styles.currencyLabel}> ₽</ThemedText>
            </View>

            <View style={styles.modalActions}>
              <Pressable
                onPress={() => setQuickAddGoal(null)}
                style={[styles.modalButton, styles.modalButtonCancel]}
              >
                <ThemedText type="body" style={styles.cancelText}>Отмена</ThemedText>
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
        onRequestClose={() => setOverflowModal(false)}
      >
        <Pressable 
          style={styles.modalOverlay}
          onPress={() => setOverflowModal(false)}
        >
          <Pressable style={styles.overflowModalContent} onPress={() => {}}>
            <View style={styles.modalHeader}>
              <ThemedText type="h4">Излишек: {formatCurrency(overflowAmount)} ₽</ThemedText>
              <ThemedText type="small" style={styles.modalSubtitle}>
                Куда направить остаток?
              </ThemedText>
            </View>

            <Pressable style={styles.safeButton} onPress={handleSendToSafe}>
              <MaterialCommunityIcons
                name="safe"
                size={20}
                color={Colors.light.success}
              />
              <ThemedText type="body" style={styles.safeButtonText}>Отправить в сейф</ThemedText>
            </Pressable>

            {otherGoals.length > 0 && (
              <>
                <ThemedText type="caption" style={styles.orText}>или выберите цель</ThemedText>
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
                        <ThemedText type="caption" style={styles.overflowGoalRemaining}>
                          Осталось: {formatCurrency(item.targetAmount - item.currentAmount)} ₽
                        </ThemedText>
                      </View>
                      <MaterialCommunityIcons
                        name="chevron-right"
                        size={20}
                        color={Colors.light.textTertiary}
                      />
                    </Pressable>
                  )}
                  style={styles.overflowGoalsList}
                  showsVerticalScrollIndicator={false}
                />
              </>
            )}

            <Pressable
              onPress={() => setOverflowModal(false)}
              style={[styles.modalButton, styles.modalButtonCancel, styles.fullWidth]}
            >
              <ThemedText type="body" style={styles.cancelText}>Отмена</ThemedText>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={showWorkModal}
        transparent
        animationType="fade"
        onRequestClose={handleCloseWorkModal}
      >
        <Pressable 
          style={styles.modalOverlay}
          onPress={handleCloseWorkModal}
        >
          <Pressable style={styles.workModalContent} onPress={() => {}}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalHeader}>
                <ThemedText type="h4">Новая смена</ThemedText>
              </View>

              <ThemedText type="caption" style={styles.workLabel}>Дата</ThemedText>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.dateScroll}
                contentContainerStyle={styles.dateScrollContent}
              >
                {getDateOptions().map((option, index) => {
                  const isSelected = !option.isCustom && 
                    option.date.toDateString() === selectedDate.toDateString();
                  
                  if (option.isCustom) {
                    return (
                      <Pressable
                        key="custom"
                        style={[styles.dateOption, styles.dateOptionCustom]}
                        onPress={handleOpenDatePicker}
                      >
                        <ThemedText type="small" style={styles.dateTextCustom}>
                          {option.label}
                        </ThemedText>
                      </Pressable>
                    );
                  }
                  
                  return (
                    <Pressable
                      key={index}
                      style={[
                        styles.dateOption,
                        isSelected && styles.dateOptionSelected,
                      ]}
                      onPress={() => setSelectedDate(option.date)}
                    >
                      <ThemedText 
                        type="small"
                        style={isSelected ? styles.dateTextSelected : undefined}
                      >
                        {option.label}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </ScrollView>

              <ThemedText type="caption" style={styles.workLabel}>Тип смены</ThemedText>
              <View style={styles.workOperationOptions}>
                <Pressable
                  style={[
                    styles.workOperationOption,
                    shiftType === "day" && styles.workOperationOptionSelected,
                  ]}
                  onPress={() => setShiftType("day")}
                >
                  <MaterialCommunityIcons
                    name="weather-sunny"
                    size={18}
                    color={shiftType === "day" ? Colors.light.buttonText : Colors.light.textSecondary}
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
                    shiftType === "night" && styles.workOperationOptionSelected,
                  ]}
                  onPress={() => setShiftType("night")}
                >
                  <MaterialCommunityIcons
                    name="weather-night"
                    size={18}
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

              <ThemedText type="caption" style={styles.workLabel}>Операция</ThemedText>
              <View style={styles.workOperationOptions}>
                <Pressable
                  style={[
                    styles.workOperationOption,
                    workOperation === "reception" && styles.workOperationOptionSelected,
                  ]}
                  onPress={() => setWorkOperation("reception")}
                >
                  <MaterialCommunityIcons
                    name="package-variant"
                    size={18}
                    color={workOperation === "reception" ? Colors.light.buttonText : Colors.light.textSecondary}
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
                    workOperation === "returns" && styles.workOperationOptionSelected,
                  ]}
                  onPress={() => setWorkOperation("returns")}
                >
                  <MaterialCommunityIcons
                    name="package-variant-closed-remove"
                    size={18}
                    color={workOperation === "returns" ? Colors.light.buttonText : Colors.light.textSecondary}
                  />
                  <ThemedText 
                    type="small"
                    style={workOperation === "returns" ? styles.workOperationTextSelected : undefined}
                  >
                    Возвраты
                  </ThemedText>
                </Pressable>
              </View>

              <ThemedText type="caption" style={styles.workLabel}>Планируемый заработок</ThemedText>
              <View style={styles.workInputContainer}>
                <TextInput
                  style={styles.workInput}
                  value={plannedEarning}
                  onChangeText={(text) => formatWorkAmount(text, setPlannedEarning)}
                  placeholder="0"
                  placeholderTextColor={Colors.light.textTertiary}
                  keyboardType="numeric"
                />
                <ThemedText type="body" style={styles.inputCurrency}>₽</ThemedText>
              </View>

              <ThemedText type="caption" style={styles.workLabel}>Сумма в цель</ThemedText>
              <View style={styles.workInputContainer}>
                <TextInput
                  style={styles.workInput}
                  value={plannedContribution}
                  onChangeText={(text) => formatWorkAmount(text, setPlannedContribution)}
                  placeholder="0"
                  placeholderTextColor={Colors.light.textTertiary}
                  keyboardType="numeric"
                />
                <ThemedText type="body" style={styles.inputCurrency}>₽</ThemedText>
              </View>

              {goals.filter(g => g.currentAmount < g.targetAmount).length > 1 && (
                <>
                  <ThemedText type="caption" style={styles.workLabel}>Цель</ThemedText>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.goalSelectScroll}
                    contentContainerStyle={styles.goalSelectContent}
                  >
                    {goals.filter(g => g.currentAmount < g.targetAmount).map((goal) => (
                      <Pressable
                        key={goal.id}
                        style={[
                          styles.goalSelectOption,
                          selectedGoalId === goal.id && styles.goalSelectOptionSelected,
                        ]}
                        onPress={() => setSelectedGoalId(goal.id)}
                      >
                        <ThemedText 
                          type="small"
                          style={selectedGoalId === goal.id ? styles.goalSelectTextSelected : undefined}
                          numberOfLines={1}
                        >
                          {goal.name}
                        </ThemedText>
                      </Pressable>
                    ))}
                  </ScrollView>
                </>
              )}

              {getRemainingFunds() > 0 && (
                <View style={styles.remainingFundsCard}>
                  <MaterialCommunityIcons
                    name="wallet-outline"
                    size={18}
                    color={Colors.light.textSecondary}
                  />
                  <View style={styles.remainingFundsContent}>
                    <ThemedText type="caption" style={styles.remainingFundsLabel}>Останется на руках</ThemedText>
                    <ThemedText type="body" style={styles.remainingFundsAmount}>
                      {formatCurrency(getRemainingFunds())} ₽
                    </ThemedText>
                  </View>
                </View>
              )}

              <View style={styles.modalActions}>
                <Pressable
                  onPress={handleCloseWorkModal}
                  style={[styles.modalButton, styles.modalButtonCancel]}
                >
                  <ThemedText type="body" style={styles.cancelText}>Отмена</ThemedText>
                </Pressable>
                <Pressable
                  onPress={handleSaveWorkSession}
                  style={[styles.modalButton, styles.modalButtonConfirm]}
                >
                  <ThemedText type="body" style={styles.confirmText}>Сохранить</ThemedText>
                </Pressable>
              </View>
            </ScrollView>
          </Pressable>
        </Pressable>
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
            <View style={styles.calendarNavigation}>
              <Pressable
                style={[
                  styles.calendarNavButton,
                  !canNavigatePrevMonth() && styles.calendarNavButtonDisabled,
                ]}
                onPress={handlePrevMonth}
                disabled={!canNavigatePrevMonth()}
              >
                <MaterialCommunityIcons
                  name="chevron-left"
                  size={24}
                  color={Colors.light.text}
                />
              </Pressable>
              <ThemedText type="body" style={styles.calendarMonthTitle}>
                {formatMonthYear(pickerMonth)}
              </ThemedText>
              <Pressable style={styles.calendarNavButton} onPress={handleNextMonth}>
                <MaterialCommunityIcons
                  name="chevron-right"
                  size={24}
                  color={Colors.light.text}
                />
              </Pressable>
            </View>

            <View style={styles.calendarWeekHeader}>
              {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map((day) => (
                <ThemedText key={day} type="caption" style={styles.calendarWeekDay}>
                  {day}
                </ThemedText>
              ))}
            </View>

            <View style={styles.calendarGrid}>
              {getMonthDays(pickerMonth).map((date, index) => {
                if (!date) {
                  return <View key={`empty-${index}`} style={styles.calendarDayEmpty} />;
                }
                
                const isDisabled = isDateDisabled(date);
                const isSelected = date.toDateString() === customDate.toDateString();
                const isToday = date.toDateString() === new Date().toDateString();
                
                return (
                  <Pressable
                    key={date.toISOString()}
                    style={[
                      styles.calendarDay,
                      isDisabled && styles.calendarDayDisabled,
                      isSelected && styles.calendarDaySelected,
                      isToday && !isSelected && styles.calendarDayToday,
                    ]}
                    onPress={() => handlePickerDateSelect(date)}
                    disabled={isDisabled}
                  >
                    <ThemedText
                      type="small"
                      style={[
                        styles.calendarDayText,
                        isDisabled && styles.calendarDayTextDisabled,
                        isSelected && styles.calendarDayTextSelected,
                      ]}
                    >
                      {date.getDate()}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.modalActions}>
              <Pressable
                onPress={() => setShowDatePicker(false)}
                style={[styles.modalButton, styles.modalButtonCancel]}
              >
                <ThemedText type="body" style={styles.cancelText}>Отмена</ThemedText>
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

      <Modal
        visible={showCompleteModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCompleteModal(false)}
      >
        <Pressable 
          style={styles.modalOverlay}
          onPress={() => setShowCompleteModal(false)}
        >
          <Pressable style={styles.completeModalContent} onPress={() => {}}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalHeader}>
                <ThemedText type="h4">Завершение смены</ThemedText>
                {completingSession && (
                  <ThemedText type="small" style={styles.modalSubtitle}>
                    {new Date(completingSession.date).toLocaleDateString("ru-RU", {
                      day: "numeric",
                      month: "long"
                    })} • {completingSession.shiftType === "day" ? "Дневная" : "Ночная"}
                  </ThemedText>
                )}
              </View>

              <ThemedText type="caption" style={styles.workLabel}>Сколько заработали?</ThemedText>
              <View style={styles.workInputContainer}>
                <TextInput
                  style={styles.workInput}
                  value={actualEarning}
                  onChangeText={(text) => formatActualAmount(text, setActualEarning)}
                  placeholder="0"
                  placeholderTextColor={Colors.light.textTertiary}
                  keyboardType="numeric"
                />
                <ThemedText type="body" style={styles.inputCurrency}>₽</ThemedText>
              </View>

              <ThemedText type="caption" style={styles.workLabel}>Сколько вложить в цель?</ThemedText>
              <View style={styles.workInputContainer}>
                <TextInput
                  style={styles.workInput}
                  value={actualContribution}
                  onChangeText={(text) => formatActualAmount(text, setActualContribution)}
                  placeholder="0"
                  placeholderTextColor={Colors.light.textTertiary}
                  keyboardType="numeric"
                />
                <ThemedText type="body" style={styles.inputCurrency}>₽</ThemedText>
              </View>

              {goals.filter(g => g.currentAmount < g.targetAmount).length > 1 && (
                <>
                  <ThemedText type="caption" style={styles.workLabel}>Цель для взноса</ThemedText>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.goalSelectScroll}
                    contentContainerStyle={styles.goalSelectContent}
                  >
                    {goals.filter(g => g.currentAmount < g.targetAmount).map((goal) => (
                      <Pressable
                        key={goal.id}
                        style={[
                          styles.goalSelectOption,
                          completeGoalId === goal.id && styles.goalSelectOptionSelected,
                        ]}
                        onPress={() => setCompleteGoalId(goal.id)}
                      >
                        <ThemedText 
                          type="small"
                          style={completeGoalId === goal.id ? styles.goalSelectTextSelected : undefined}
                          numberOfLines={1}
                        >
                          {goal.name}
                        </ThemedText>
                      </Pressable>
                    ))}
                  </ScrollView>
                </>
              )}

              {getActualFreeToSafe() > 0 && (
                <View style={styles.freeToSafeCard}>
                  <MaterialCommunityIcons
                    name="safe"
                    size={20}
                    color={Colors.light.success}
                  />
                  <View style={styles.freeToSafeContent}>
                    <ThemedText type="caption" style={styles.freeToSafeLabel}>Свободные средства → Сейф</ThemedText>
                    <ThemedText type="body" style={styles.freeToSafeAmount}>
                      {formatCurrency(getActualFreeToSafe())} ₽
                    </ThemedText>
                  </View>
                </View>
              )}

              <View style={styles.completeActionsRow}>
                <Pressable
                  onPress={handleSkipSession}
                  style={styles.skipButton}
                >
                  <MaterialCommunityIcons
                    name="close-circle-outline"
                    size={18}
                    color={Colors.light.error}
                  />
                  <ThemedText type="small" style={styles.skipButtonText}>Не отработал</ThemedText>
                </Pressable>
              </View>

              <View style={styles.modalActions}>
                <Pressable
                  onPress={() => {
                    setShowCompleteModal(false);
                    setCompletingSession(null);
                  }}
                  style={[styles.modalButton, styles.modalButtonCancel]}
                >
                  <ThemedText type="body" style={styles.cancelText}>Отмена</ThemedText>
                </Pressable>
                <Pressable
                  onPress={handleCompleteSession}
                  style={[styles.modalButton, styles.modalButtonConfirm]}
                >
                  <ThemedText type="body" style={styles.confirmText}>Завершить</ThemedText>
                </Pressable>
              </View>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.backgroundRoot,
  },
  emptyContainer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Responsive.horizontalPadding,
  },
  headerSection: {
    marginBottom: Spacing.lg,
  },
  greetingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.xs,
  },
  greeting: {
    color: Colors.light.text,
  },
  addButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.light.primaryMuted,
    borderRadius: BorderRadius.lg,
  },
  addButtonText: {
    color: Colors.light.primary,
    fontWeight: "600",
  },
  subtitle: {
    color: Colors.light.textSecondary,
  },
  shiftsCard: {
    backgroundColor: Colors.light.card,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.light.cardBorder,
  },
  shiftsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  shiftsHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  shiftsIcon: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.light.primaryMuted,
    justifyContent: "center",
    alignItems: "center",
  },
  shiftsTitle: {
    color: Colors.light.text,
  },
  addShiftButton: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.light.primaryMuted,
    justifyContent: "center",
    alignItems: "center",
  },
  shiftsSummary: {
    flexDirection: "row",
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  shiftsSummaryItem: {
    flex: 1,
    alignItems: "center",
  },
  shiftsSummaryDivider: {
    width: 1,
    backgroundColor: Colors.light.border,
    marginHorizontal: Spacing.md,
  },
  shiftsSummaryLabel: {
    color: Colors.light.textTertiary,
    marginBottom: 2,
  },
  shiftsSummaryValue: {
    color: Colors.light.text,
  },
  shiftsSummaryValueAccent: {
    color: Colors.light.success,
  },
  shiftsList: {
    borderRadius: BorderRadius.md,
    overflow: "hidden",
  },
  shiftItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.sm,
    gap: Spacing.md,
  },
  shiftItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.borderLight,
  },
  shiftDate: {
    minWidth: 60,
  },
  shiftDateText: {
    color: Colors.light.text,
    fontWeight: "500",
  },
  shiftType: {
    color: Colors.light.textTertiary,
  },
  shiftAmounts: {
    flex: 1,
    alignItems: "flex-end",
  },
  shiftEarning: {
    color: Colors.light.text,
    fontWeight: "500",
  },
  shiftContrib: {
    color: Colors.light.success,
  },
  addShiftCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.light.card,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.light.cardBorder,
    gap: Spacing.md,
  },
  addShiftIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.light.primaryMuted,
    justifyContent: "center",
    alignItems: "center",
  },
  addShiftContent: {
    flex: 1,
  },
  addShiftTitle: {
    color: Colors.light.text,
    fontWeight: "500",
  },
  addShiftSubtitle: {
    color: Colors.light.textTertiary,
  },
  goalsSection: {
    gap: Spacing.md,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: Colors.light.overlay,
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.md,
  },
  modalContent: {
    backgroundColor: Colors.light.card,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    width: "100%",
    maxWidth: 340,
    borderWidth: 1,
    borderColor: Colors.light.cardBorder,
  },
  overflowModalContent: {
    backgroundColor: Colors.light.card,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    width: "100%",
    maxWidth: 340,
    maxHeight: "70%",
    borderWidth: 1,
    borderColor: Colors.light.cardBorder,
  },
  workModalContent: {
    backgroundColor: Colors.light.card,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    width: "100%",
    maxWidth: 380,
    maxHeight: "85%",
    borderWidth: 1,
    borderColor: Colors.light.cardBorder,
  },
  modalHeader: {
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  modalSubtitle: {
    color: Colors.light.textSecondary,
    marginTop: 4,
  },
  modalHint: {
    color: Colors.light.textTertiary,
    marginTop: 4,
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
    color: Colors.light.text,
    textAlign: "center",
    minWidth: 80,
  },
  currencyLabel: {
    color: Colors.light.textTertiary,
  },
  modalActions: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  modalButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
  },
  modalButtonCancel: {
    backgroundColor: Colors.light.backgroundSecondary,
  },
  modalButtonConfirm: {
    backgroundColor: Colors.light.primary,
  },
  fullWidth: {
    flex: undefined,
    width: "100%",
  },
  cancelText: {
    color: Colors.light.textSecondary,
    fontWeight: "500",
  },
  confirmText: {
    color: Colors.light.buttonText,
    fontWeight: "600",
  },
  safeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.light.successMuted,
    marginBottom: Spacing.md,
  },
  safeButtonText: {
    color: Colors.light.success,
    fontWeight: "600",
  },
  orText: {
    color: Colors.light.textTertiary,
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  overflowGoalsList: {
    maxHeight: 180,
    marginBottom: Spacing.md,
  },
  overflowGoalItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.light.backgroundSecondary,
    marginBottom: Spacing.xs,
  },
  overflowGoalInfo: {
    flex: 1,
  },
  overflowGoalRemaining: {
    color: Colors.light.textTertiary,
  },
  workLabel: {
    color: Colors.light.textTertiary,
    marginBottom: Spacing.sm,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  dateScroll: {
    marginBottom: Spacing.md,
  },
  dateScrollContent: {
    gap: Spacing.sm,
  },
  dateOption: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
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
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderStyle: "dashed",
    backgroundColor: "transparent",
  },
  dateTextCustom: {
    color: Colors.light.textSecondary,
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
    borderRadius: BorderRadius.lg,
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
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.md,
  },
  workInput: {
    flex: 1,
    fontSize: 20,
    fontWeight: "600",
    color: Colors.light.text,
    paddingVertical: Spacing.md,
  },
  inputCurrency: {
    color: Colors.light.textTertiary,
  },
  goalSelectScroll: {
    marginBottom: Spacing.md,
  },
  goalSelectContent: {
    gap: Spacing.sm,
  },
  goalSelectOption: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.light.backgroundSecondary,
    maxWidth: 140,
  },
  goalSelectOptionSelected: {
    backgroundColor: Colors.light.primary,
  },
  goalSelectTextSelected: {
    color: Colors.light.buttonText,
    fontWeight: "600",
  },
  remainingFundsCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  remainingFundsContent: {
    flex: 1,
  },
  remainingFundsLabel: {
    color: Colors.light.textTertiary,
  },
  remainingFundsAmount: {
    color: Colors.light.text,
    fontWeight: "600",
  },
  calendarContent: {
    backgroundColor: Colors.light.card,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    width: "100%",
    maxWidth: 340,
    borderWidth: 1,
    borderColor: Colors.light.cardBorder,
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
    color: Colors.light.text,
  },
  calendarWeekHeader: {
    flexDirection: "row",
    marginBottom: Spacing.xs,
  },
  calendarWeekDay: {
    flex: 1,
    textAlign: "center",
    color: Colors.light.textTertiary,
  },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: Spacing.md,
  },
  calendarDay: {
    width: "14.28%",
    aspectRatio: 1,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: BorderRadius.full,
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
    color: Colors.light.text,
  },
  calendarDayTextDisabled: {
    color: Colors.light.textTertiary,
  },
  calendarDayTextSelected: {
    color: Colors.light.buttonText,
    fontWeight: "600",
  },
  completeShiftBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.light.primary,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    gap: Spacing.md,
  },
  completeShiftBannerIcon: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.md,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  completeShiftBannerContent: {
    flex: 1,
  },
  completeShiftBannerTitle: {
    color: Colors.light.buttonText,
    fontWeight: "600",
  },
  completeShiftBannerSubtitle: {
    color: "rgba(255,255,255,0.8)",
  },
  shiftsSummaryThree: {
    flexDirection: "row",
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.sm,
    marginBottom: Spacing.md,
  },
  shiftsSummaryItemThree: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: Spacing.xs,
  },
  shiftsSummaryDividerVertical: {
    width: 1,
    backgroundColor: Colors.light.border,
    marginVertical: 4,
  },
  shiftsSummaryValueSuccess: {
    color: Colors.light.success,
  },
  shiftItemNew: {
    paddingVertical: Spacing.md,
  },
  shiftItemHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.sm,
  },
  shiftDateNew: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  shiftDateTextNew: {
    color: Colors.light.text,
    fontWeight: "600",
  },
  shiftTypeBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    gap: 4,
  },
  shiftTypeText: {
    color: Colors.light.textSecondary,
  },
  shiftDeleteButton: {
    padding: Spacing.xs,
  },
  shiftDetailsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.md,
  },
  shiftDetailItem: {
    minWidth: 80,
  },
  shiftDetailLabel: {
    color: Colors.light.textTertiary,
    marginBottom: 2,
  },
  shiftDetailValue: {
    color: Colors.light.text,
    fontWeight: "500",
  },
  shiftDetailValueAccent: {
    color: Colors.light.primary,
    fontWeight: "500",
  },
  shiftDetailValueSuccess: {
    color: Colors.light.success,
    fontWeight: "500",
  },
  completeShiftButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    marginTop: Spacing.sm,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.light.primaryMuted,
    borderRadius: BorderRadius.md,
  },
  completeShiftButtonText: {
    color: Colors.light.primary,
    fontWeight: "500",
  },
  completeModalContent: {
    backgroundColor: Colors.light.card,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    width: "100%",
    maxWidth: 380,
    maxHeight: "80%",
    borderWidth: 1,
    borderColor: Colors.light.cardBorder,
  },
  freeToSafeCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.light.successMuted,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  freeToSafeContent: {
    flex: 1,
  },
  freeToSafeLabel: {
    color: Colors.light.success,
  },
  freeToSafeAmount: {
    color: Colors.light.success,
    fontWeight: "600",
  },
  completeActionsRow: {
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  skipButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
  },
  skipButtonText: {
    color: Colors.light.error,
    fontWeight: "500",
  },
});
