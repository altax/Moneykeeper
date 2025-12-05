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

function getTimeUntilShift(sessionDate: string, shiftType: ShiftType): string {
  const now = new Date();
  const shiftDate = new Date(sessionDate);
  
  if (shiftType === "day") {
    shiftDate.setHours(8, 0, 0, 0);
  } else {
    shiftDate.setHours(20, 0, 0, 0);
  }
  
  const diff = shiftDate.getTime() - now.getTime();
  
  if (diff <= 0) {
    return "Началась";
  }
  
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours < 1) {
    return `${minutes} мин`;
  } else if (hours < 24) {
    return `${hours} ч`;
  } else {
    const days = Math.floor(hours / 24);
    return `${days} д`;
  }
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

function getShiftProgress(sessionDate: string, shiftType: ShiftType): number {
  const now = new Date();
  const shiftDate = new Date(sessionDate);
  
  if (shiftType === "day") {
    shiftDate.setHours(8, 0, 0, 0);
  } else {
    shiftDate.setHours(20, 0, 0, 0);
  }
  
  const shiftDuration = 12 * 60 * 60 * 1000;
  const elapsed = now.getTime() - shiftDate.getTime();
  
  return Math.min(100, Math.max(0, (elapsed / shiftDuration) * 100));
}

function getShiftTimeRemaining(sessionDate: string, shiftType: ShiftType): string {
  const now = new Date();
  const shiftDate = new Date(sessionDate);
  
  if (shiftType === "day") {
    shiftDate.setHours(8, 0, 0, 0);
  } else {
    shiftDate.setHours(20, 0, 0, 0);
  }
  
  const shiftEndDate = new Date(shiftDate);
  shiftEndDate.setHours(shiftEndDate.getHours() + 12);
  
  const remaining = shiftEndDate.getTime() - now.getTime();
  
  if (remaining <= 0) {
    return "Завершается";
  }
  
  const hours = Math.floor(remaining / (1000 * 60 * 60));
  const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours < 1) {
    return `${minutes} мин`;
  }
  
  return `${hours}ч ${minutes}м`;
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
  const [completedSessions, setCompletedSessions] = useState<WorkSession[]>([]);
  const [showWorkModal, setShowWorkModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [workOperation, setWorkOperation] = useState<WorkOperationType>("reception");
  const [shiftType, setShiftType] = useState<ShiftType>("day");
  
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [completingSession, setCompletingSession] = useState<WorkSession | null>(null);
  const [actualEarning, setActualEarning] = useState("");
  const [actualContribution, setActualContribution] = useState("");
  const [completeGoalId, setCompleteGoalId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    await storage.autoCompleteExpiredSessions();
    
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
    
    const completed = await storage.getCompletedWorkSessions();
    setCompletedSessions(completed.slice(0, 10));
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
      { date: new Date(), label: "Другая", isCustom: true },
    ];
  };

  const handleSaveWorkSession = async () => {
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
      plannedEarning: 0,
      plannedContribution: 0,
      goalId: undefined,
      isCompleted: false,
    });

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowWorkModal(false);
    setSelectedDate(new Date());
    setShiftType("day");
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
    setActualEarning("");
    setActualContribution("");
    setCompleteGoalId(null);
    setShowCompleteModal(true);
  };

  const handleCompleteSession = async () => {
    if (!completingSession) return;

    const earning = parseFloat(actualEarning.replace(/[^\d.]/g, "")) || 0;
    const contribution = parseFloat(actualContribution.replace(/[^\d.]/g, "")) || 0;

    if (earning <= 0) {
      Alert.alert("Ошибка", "Укажите сумму заработка");
      return;
    }

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

  const handleCloseWorkModal = () => {
    setShowWorkModal(false);
    setSelectedDate(new Date());
    setShiftType("day");
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

  const getTotalCompletedEarnings = (): number => {
    return completedSessions.reduce((sum, s) => sum + (s.actualEarning || 0), 0);
  };

  const getMaxCompletedEarning = (): number => {
    if (completedSessions.length === 0) return 1;
    return Math.max(...completedSessions.map(s => s.actualEarning || 0), 1);
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
              paddingTop: headerHeight + Spacing.sm,
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
                <ThemedText type="small" style={styles.addButtonText}>+ Цель</ThemedText>
              </Pressable>
            </View>
            <ThemedText type="small" style={styles.subtitle}>
              {goals.length} {getGoalsWord(goals.length)} активно
            </ThemedText>
          </View>

          {(() => {
            const activeSessions = workSessions.filter(s => isShiftActive(s.date, s.shiftType));
            const plannedSessions = workSessions.filter(s => !isShiftActive(s.date, s.shiftType));
            
            return (
              <>
                {activeSessions.length > 0 && (
                  <View style={styles.activeShiftsCard}>
                    <View style={styles.compactShiftsHeader}>
                      <View style={styles.activeIndicatorDot} />
                      <ThemedText type="body" style={styles.compactShiftsTitle}>Активная смена</ThemedText>
                    </View>
                    
                    {activeSessions.map((session) => {
                      const progress = getShiftProgress(session.date, session.shiftType);
                      const timeRemaining = getShiftTimeRemaining(session.date, session.shiftType);
                      
                      return (
                        <View key={session.id} style={styles.activeShiftItem}>
                          <View style={styles.activeShiftRow}>
                            <View style={styles.activeShiftInfo}>
                              <MaterialCommunityIcons
                                name={session.shiftType === "day" ? "weather-sunny" : "weather-night"}
                                size={16}
                                color={Colors.light.warning}
                              />
                              <ThemedText type="body" style={styles.activeShiftType}>
                                {session.shiftType === "day" ? "День" : "Ночь"}
                              </ThemedText>
                              <View style={styles.operationBadge}>
                                <ThemedText type="caption" style={styles.operationText}>
                                  {session.operationType === "reception" ? "Приёмка" : "Возвраты"}
                                </ThemedText>
                              </View>
                            </View>
                            <Pressable 
                              style={styles.cancelButton}
                              onPress={() => handleCancelWorkSession(session)}
                            >
                              <MaterialCommunityIcons
                                name="close"
                                size={14}
                                color={Colors.light.textTertiary}
                              />
                            </Pressable>
                          </View>
                          
                          <View style={styles.progressContainer}>
                            <View style={styles.progressBar}>
                              <View style={[styles.progressFill, { width: `${progress}%` }]} />
                            </View>
                            <View style={styles.progressRow}>
                              <ThemedText type="caption" style={styles.progressText}>
                                {timeRemaining}
                              </ThemedText>
                              <Pressable 
                                style={styles.completeShiftBtn}
                                onPress={() => handleOpenCompleteModal(session)}
                              >
                                <MaterialCommunityIcons
                                  name="check"
                                  size={12}
                                  color={Colors.light.success}
                                />
                                <ThemedText type="caption" style={styles.completeShiftText}>
                                  Завершить
                                </ThemedText>
                              </Pressable>
                            </View>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                )}

                {plannedSessions.length > 0 && (
                  <View style={styles.plannedShiftsCard}>
                    <View style={styles.compactShiftsHeader}>
                      <MaterialCommunityIcons
                        name="calendar-clock"
                        size={16}
                        color={Colors.light.primary}
                      />
                      <ThemedText type="body" style={styles.compactShiftsTitle}>Запланировано</ThemedText>
                      <Pressable 
                        style={styles.addShiftBtn}
                        onPress={() => setShowWorkModal(true)}
                      >
                        <MaterialCommunityIcons
                          name="plus"
                          size={16}
                          color={Colors.light.primary}
                        />
                      </Pressable>
                    </View>
                    
                    <View style={styles.plannedShiftsList}>
                      {plannedSessions.map((session, index) => {
                        const timeUntil = getTimeUntilShift(session.date, session.shiftType);
                        
                        return (
                          <View
                            key={session.id}
                            style={[
                              styles.plannedShiftItem,
                              index < plannedSessions.length - 1 && styles.plannedShiftItemBorder
                            ]}
                          >
                            <View style={styles.plannedShiftLeft}>
                              <MaterialCommunityIcons
                                name={session.shiftType === "day" ? "weather-sunny" : "weather-night"}
                                size={14}
                                color={session.shiftType === "day" ? Colors.light.warning : Colors.light.accent}
                              />
                              <ThemedText type="small" style={styles.plannedShiftDate}>
                                {new Date(session.date).toLocaleDateString("ru-RU", { 
                                  day: "numeric", 
                                  month: "short"
                                })}
                              </ThemedText>
                              <View style={styles.opBadgeSmall}>
                                <ThemedText type="caption" style={styles.opTextSmall}>
                                  {session.operationType === "reception" ? "П" : "В"}
                                </ThemedText>
                              </View>
                            </View>
                            <View style={styles.plannedShiftRight}>
                              <ThemedText type="caption" style={styles.timeUntilText}>
                                {timeUntil}
                              </ThemedText>
                              <Pressable 
                                style={styles.cancelBtnSmall}
                                onPress={() => handleCancelWorkSession(session)}
                              >
                                <MaterialCommunityIcons
                                  name="close"
                                  size={12}
                                  color={Colors.light.textTertiary}
                                />
                              </Pressable>
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  </View>
                )}

                {workSessions.length === 0 && (
                  <Pressable style={styles.addShiftCard} onPress={() => setShowWorkModal(true)}>
                    <MaterialCommunityIcons
                      name="calendar-plus"
                      size={18}
                      color={Colors.light.primary}
                    />
                    <ThemedText type="small" style={styles.addShiftText}>Добавить смену</ThemedText>
                  </Pressable>
                )}
              </>
            );
          })()}

          {completedSessions.length > 0 && (
            <View style={styles.completedSection}>
              <View style={styles.completedHeader}>
                <MaterialCommunityIcons
                  name="check-circle"
                  size={16}
                  color={Colors.light.success}
                />
                <ThemedText type="body" style={styles.completedTitle}>Завершено</ThemedText>
              </View>
              <ThemedText type="h3" style={styles.completedTotal}>
                {formatCurrency(getTotalCompletedEarnings())} ₽
              </ThemedText>
              
              <View style={styles.barsContainer}>
                {completedSessions.slice(0, 7).reverse().map((session, index) => {
                  const maxEarning = getMaxCompletedEarning();
                  const barHeight = ((session.actualEarning || 0) / maxEarning) * 60;
                  
                  return (
                    <View key={session.id} style={styles.barWrapper}>
                      <View style={styles.barColumn}>
                        <View 
                          style={[
                            styles.bar, 
                            { height: Math.max(4, barHeight) }
                          ]} 
                        />
                      </View>
                      <ThemedText type="caption" style={styles.barLabel}>
                        {new Date(session.date).toLocaleDateString("ru-RU", { day: "numeric" })}
                      </ThemedText>
                    </View>
                  );
                })}
              </View>
            </View>
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

            <ThemedText type="caption" style={styles.workLabel}>Смена</ThemedText>
            <View style={styles.shiftOptions}>
              <Pressable
                style={[
                  styles.shiftOption,
                  shiftType === "day" && styles.shiftOptionSelected,
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
                  style={shiftType === "day" ? styles.shiftTextSelected : undefined}
                >
                  День
                </ThemedText>
              </Pressable>
              <Pressable
                style={[
                  styles.shiftOption,
                  shiftType === "night" && styles.shiftOptionSelected,
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
                  style={shiftType === "night" ? styles.shiftTextSelected : undefined}
                >
                  Ночь
                </ThemedText>
              </Pressable>
            </View>

            <ThemedText type="caption" style={styles.workLabel}>Операция</ThemedText>
            <View style={styles.shiftOptions}>
              <Pressable
                style={[
                  styles.shiftOption,
                  workOperation === "reception" && styles.shiftOptionSelected,
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
                  style={workOperation === "reception" ? styles.shiftTextSelected : undefined}
                >
                  Приёмка
                </ThemedText>
              </Pressable>
              <Pressable
                style={[
                  styles.shiftOption,
                  workOperation === "returns" && styles.shiftOptionSelected,
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
                  style={workOperation === "returns" ? styles.shiftTextSelected : undefined}
                >
                  Возвраты
                </ThemedText>
              </Pressable>
            </View>

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
                <ThemedText type="body" style={styles.confirmText}>Добавить</ThemedText>
              </Pressable>
            </View>
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
                    })} • {completingSession.shiftType === "day" ? "День" : "Ночь"}
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
                  autoFocus
                />
                <ThemedText type="body" style={styles.inputCurrency}>₽</ThemedText>
              </View>

              {goals.filter(g => g.currentAmount < g.targetAmount).length > 0 && (
                <>
                  <ThemedText type="caption" style={styles.workLabel}>Выберите цель</ThemedText>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.goalSelectScroll}
                    contentContainerStyle={styles.goalSelectContent}
                  >
                    {goals.filter(g => g.currentAmount < g.targetAmount).map((goal) => {
                      const remaining = goal.targetAmount - goal.currentAmount;
                      return (
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
                            style={completeGoalId === goal.id ? styles.goalSelectTextSelected : styles.goalSelectName}
                            numberOfLines={1}
                          >
                            {goal.name}
                          </ThemedText>
                          <ThemedText 
                            type="caption" 
                            style={completeGoalId === goal.id ? styles.goalRemainSelected : styles.goalRemain}
                          >
                            {formatCurrency(remaining)} ₽
                          </ThemedText>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                </>
              )}

              {completeGoalId && (
                <>
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
                </>
              )}

              {getActualFreeToSafe() > 0 && (
                <View style={styles.freeToSafeCard}>
                  <MaterialCommunityIcons
                    name="safe"
                    size={18}
                    color={Colors.light.success}
                  />
                  <View style={styles.freeToSafeContent}>
                    <ThemedText type="caption" style={styles.freeToSafeLabel}>В сейф</ThemedText>
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
                    size={16}
                    color={Colors.light.error}
                  />
                  <ThemedText type="caption" style={styles.skipButtonText}>Не отработал</ThemedText>
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
                  <ThemedText type="body" style={styles.confirmText}>Готово</ThemedText>
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
    marginBottom: Spacing.md,
  },
  greetingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 2,
  },
  greeting: {
    color: Colors.light.text,
  },
  addButton: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    backgroundColor: Colors.light.primaryMuted,
    borderRadius: BorderRadius.md,
  },
  addButtonText: {
    color: Colors.light.primary,
    fontWeight: "600",
  },
  subtitle: {
    color: Colors.light.textSecondary,
  },
  activeShiftsCard: {
    backgroundColor: Colors.light.card,
    borderRadius: BorderRadius.lg,
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.light.warningMuted,
  },
  compactShiftsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  activeIndicatorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.light.warning,
  },
  compactShiftsTitle: {
    color: Colors.light.text,
    fontWeight: "500",
    flex: 1,
  },
  activeShiftItem: {
    paddingTop: Spacing.xs,
  },
  activeShiftRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  activeShiftInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  activeShiftType: {
    color: Colors.light.warning,
    fontWeight: "600",
  },
  operationBadge: {
    backgroundColor: Colors.light.backgroundSecondary,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 1,
    borderRadius: BorderRadius.xs,
  },
  operationText: {
    color: Colors.light.textSecondary,
    fontSize: 10,
  },
  cancelButton: {
    padding: Spacing.xs,
  },
  progressContainer: {
    marginTop: Spacing.xs,
  },
  progressBar: {
    height: 3,
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: 2,
    marginBottom: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: Colors.light.warning,
    borderRadius: 2,
  },
  progressText: {
    color: Colors.light.textTertiary,
    fontSize: 10,
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  completeShiftBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    backgroundColor: Colors.light.successMuted,
    borderRadius: BorderRadius.xs,
  },
  completeShiftText: {
    color: Colors.light.success,
    fontSize: 10,
    fontWeight: "500",
  },
  plannedShiftsCard: {
    backgroundColor: Colors.light.card,
    borderRadius: BorderRadius.lg,
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.light.cardBorder,
  },
  addShiftBtn: {
    padding: Spacing.xs,
  },
  plannedShiftsList: {},
  plannedShiftItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.xs,
  },
  plannedShiftItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.borderLight,
  },
  plannedShiftLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  plannedShiftDate: {
    color: Colors.light.text,
    fontWeight: "500",
  },
  opBadgeSmall: {
    backgroundColor: Colors.light.backgroundSecondary,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
  },
  opTextSmall: {
    color: Colors.light.textTertiary,
    fontSize: 9,
  },
  plannedShiftRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  timeUntilText: {
    color: Colors.light.primary,
    fontSize: 11,
  },
  cancelBtnSmall: {
    padding: 4,
  },
  addShiftCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.light.card,
    borderRadius: BorderRadius.lg,
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.light.cardBorder,
    borderStyle: "dashed",
    gap: Spacing.xs,
  },
  addShiftText: {
    color: Colors.light.primary,
    fontWeight: "500",
  },
  completedSection: {
    backgroundColor: Colors.light.card,
    borderRadius: BorderRadius.lg,
    padding: Spacing.sm,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.light.cardBorder,
  },
  completedHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  completedTitle: {
    color: Colors.light.text,
    fontWeight: "500",
  },
  completedTotal: {
    color: Colors.light.success,
    marginBottom: Spacing.sm,
  },
  barsContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    height: 80,
  },
  barWrapper: {
    alignItems: "center",
    flex: 1,
  },
  barColumn: {
    width: 20,
    justifyContent: "flex-end",
    height: 60,
  },
  bar: {
    width: "100%",
    backgroundColor: Colors.light.success,
    borderRadius: 2,
  },
  barLabel: {
    color: Colors.light.textTertiary,
    fontSize: 9,
    marginTop: 2,
  },
  goalsSection: {
    gap: Spacing.sm,
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
    padding: Spacing.md,
    width: "100%",
    maxWidth: 320,
    borderWidth: 1,
    borderColor: Colors.light.cardBorder,
  },
  overflowModalContent: {
    backgroundColor: Colors.light.card,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    width: "100%",
    maxWidth: 320,
    maxHeight: "70%",
    borderWidth: 1,
    borderColor: Colors.light.cardBorder,
  },
  workModalContent: {
    backgroundColor: Colors.light.card,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    width: "100%",
    maxWidth: 340,
    borderWidth: 1,
    borderColor: Colors.light.cardBorder,
  },
  modalHeader: {
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  modalSubtitle: {
    color: Colors.light.textSecondary,
    marginTop: 2,
  },
  modalHint: {
    color: Colors.light.textTertiary,
    marginTop: 2,
  },
  quickAddInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.md,
  },
  quickAddInput: {
    fontSize: 32,
    fontWeight: "700",
    color: Colors.light.text,
    textAlign: "center",
    minWidth: 60,
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
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
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
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.light.successMuted,
    marginBottom: Spacing.sm,
  },
  safeButtonText: {
    color: Colors.light.success,
    fontWeight: "600",
  },
  orText: {
    color: Colors.light.textTertiary,
    textAlign: "center",
    marginBottom: Spacing.xs,
  },
  overflowGoalsList: {
    maxHeight: 160,
    marginBottom: Spacing.sm,
  },
  overflowGoalItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.md,
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
    marginBottom: Spacing.xs,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    fontSize: 10,
  },
  dateScroll: {
    marginBottom: Spacing.sm,
  },
  dateScrollContent: {
    gap: Spacing.xs,
  },
  dateOption: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
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
  shiftOptions: {
    flexDirection: "row",
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  shiftOption: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.light.backgroundSecondary,
  },
  shiftOptionSelected: {
    backgroundColor: Colors.light.primary,
  },
  shiftTextSelected: {
    color: Colors.light.buttonText,
    fontWeight: "600",
  },
  workInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  workInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: "600",
    color: Colors.light.text,
    paddingVertical: Spacing.sm,
  },
  inputCurrency: {
    color: Colors.light.textTertiary,
  },
  goalSelectScroll: {
    marginBottom: Spacing.sm,
  },
  goalSelectContent: {
    gap: Spacing.xs,
  },
  goalSelectOption: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.light.backgroundSecondary,
    minWidth: 100,
  },
  goalSelectOptionSelected: {
    backgroundColor: Colors.light.primary,
  },
  goalSelectTextSelected: {
    color: Colors.light.buttonText,
    fontWeight: "600",
  },
  goalSelectName: {
    color: Colors.light.text,
  },
  goalRemain: {
    color: Colors.light.textTertiary,
    fontSize: 10,
  },
  goalRemainSelected: {
    color: "rgba(255, 255, 255, 0.7)",
    fontSize: 10,
  },
  calendarContent: {
    backgroundColor: Colors.light.card,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    width: "100%",
    maxWidth: 320,
    borderWidth: 1,
    borderColor: Colors.light.cardBorder,
  },
  calendarNavigation: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.sm,
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
    marginBottom: Spacing.sm,
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
    fontSize: 13,
    color: Colors.light.text,
  },
  calendarDayTextDisabled: {
    color: Colors.light.textTertiary,
  },
  calendarDayTextSelected: {
    color: Colors.light.buttonText,
    fontWeight: "600",
  },
  completeModalContent: {
    backgroundColor: Colors.light.card,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    width: "100%",
    maxWidth: 340,
    maxHeight: "75%",
    borderWidth: 1,
    borderColor: Colors.light.cardBorder,
  },
  freeToSafeCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.light.successMuted,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
    gap: Spacing.xs,
  },
  freeToSafeContent: {
    flex: 1,
  },
  freeToSafeLabel: {
    color: Colors.light.success,
    fontSize: 10,
  },
  freeToSafeAmount: {
    color: Colors.light.success,
    fontWeight: "600",
  },
  completeActionsRow: {
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  skipButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.xs,
  },
  skipButtonText: {
    color: Colors.light.error,
    fontWeight: "500",
    fontSize: 12,
  },
});
