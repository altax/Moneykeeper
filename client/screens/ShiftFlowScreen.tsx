import React, { useCallback, useState } from "react";
import {
  StyleSheet,
  ScrollView,
  View,
  Pressable,
  TextInput,
  Alert,
  Modal,
  Platform,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Calendar, LocaleConfig } from "react-native-calendars";
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { ProgressBar } from "@/components/ProgressBar";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { storage } from "@/lib/storage";
import { Goal, WorkSession, WorkOperationType, ShiftType } from "@/lib/types";

LocaleConfig.locales["ru"] = {
  monthNames: [
    "Январь",
    "Февраль",
    "Март",
    "Апрель",
    "Май",
    "Июнь",
    "Июль",
    "Август",
    "Сентябрь",
    "Октябрь",
    "Ноябрь",
    "Декабрь",
  ],
  monthNamesShort: [
    "Янв",
    "Фев",
    "Мар",
    "Апр",
    "Май",
    "Июн",
    "Июл",
    "Авг",
    "Сен",
    "Окт",
    "Ноя",
    "Дек",
  ],
  dayNames: [
    "Воскресенье",
    "Понедельник",
    "Вторник",
    "Среда",
    "Четверг",
    "Пятница",
    "Суббота",
  ],
  dayNamesShort: ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"],
  today: "Сегодня",
};
LocaleConfig.defaultLocale = "ru";

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

function getTimeUntilShift(sessionDate: string, shiftType: ShiftType): string {
  const now = new Date();
  const shiftDate = new Date(sessionDate);

  if (shiftType === "day") {
    shiftDate.setHours(8, 0, 0, 0);
  } else {
    shiftDate.setHours(20, 0, 0, 0);
  }

  const diff = shiftDate.getTime() - now.getTime();

  if (diff <= 0) return "Сейчас";

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (hours < 1) return `через ${minutes} мин`;
  if (hours < 24) return `через ${hours} ч`;
  return `через ${Math.floor(hours / 24)} д`;
}

function formatDateLabel(date: Date): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const checkDate = new Date(date);
  checkDate.setHours(0, 0, 0, 0);

  const diff = Math.floor(
    (checkDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diff === 0) return "Сегодня";
  if (diff === 1) return "Завтра";
  if (diff === 2) return "Послезавтра";

  return date.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    weekday: "short",
  });
}

export default function ShiftFlowScreen() {
  const navigation = useNavigation();
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const [sessions, setSessions] = useState<WorkSession[]>([]);
  const [completedSessions, setCompletedSessions] = useState<WorkSession[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [shiftType, setShiftType] = useState<ShiftType>("day");
  const [operationType, setOperationType] =
    useState<WorkOperationType>("reception");

  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [completingSession, setCompletingSession] =
    useState<WorkSession | null>(null);
  const [actualEarning, setActualEarning] = useState("");
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);

  const loadData = useCallback(async () => {
    const activeSessions = await storage.getActiveWorkSessions();
    setSessions(activeSessions);

    const completed = await storage.getCompletedWorkSessions();
    setCompletedSessions(completed.slice(0, 5));

    const activeGoals = await storage.getActiveGoals();
    setGoals(activeGoals.filter((g) => g.currentAmount < g.targetAmount));

    const expiredSessions = await storage.getExpiredUncompletedSessions();
    if (expiredSessions.length > 0 && !showCompleteModal) {
      openCompleteModal(expiredSessions[0]);
    }
  }, [showCompleteModal]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const openCompleteModal = (session: WorkSession) => {
    setCompletingSession(session);
    setActualEarning("");
    setSelectedGoal(goals.length === 1 ? goals[0] : null);
    setShowCompleteModal(true);
  };

  const handleAddShift = async () => {
    const newSession = await storage.addWorkSession({
      date: selectedDate.toISOString(),
      operationType,
      shiftType,
      plannedEarning: 0,
      plannedContribution: 0,
      isCompleted: false,
    });

    if (!newSession) {
      Alert.alert(
        "Смена уже существует",
        `${shiftType === "day" ? "Дневная" : "Ночная"} смена на ${formatDateLabel(selectedDate)} уже запланирована. Вы можете добавить ${shiftType === "day" ? "ночную" : "дневную"} смену на этот день.`,
        [{ text: "Понятно", style: "default" }]
      );
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowAddModal(false);
    setSelectedDate(new Date());
    await loadData();
  };

  const handleDeleteShift = (session: WorkSession) => {
    Alert.alert("Удалить смену?", "Вы уверены, что хотите удалить эту смену?", [
      { text: "Отмена", style: "cancel" },
      {
        text: "Удалить",
        style: "destructive",
        onPress: async () => {
          await storage.deleteWorkSession(session.id);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          await loadData();
        },
      },
    ]);
  };

  const handleCompleteShift = async () => {
    if (!completingSession) return;

    const earning = parseFloat(actualEarning.replace(/[^\d.]/g, "")) || 0;
    if (earning <= 0) {
      Alert.alert("Ошибка", "Укажите сумму заработка");
      return;
    }

    const goalId = selectedGoal?.id;
    let contributionAmount = earning;
    let excessAmount = 0;

    if (selectedGoal) {
      const remaining = selectedGoal.targetAmount - selectedGoal.currentAmount;
      if (earning > remaining) {
        contributionAmount = remaining;
        excessAmount = earning - remaining;

        Alert.alert(
          "Цель перевыполнена!",
          `Сумма заработка (${formatCurrency(earning)} ₽) превышает оставшуюся сумму цели "${selectedGoal.name}" (${formatCurrency(remaining)} ₽).\n\nИзлишек ${formatCurrency(excessAmount)} ₽ будет добавлен в общие накопления (Сейф).`,
          [
            {
              text: "Отмена",
              style: "cancel",
            },
            {
              text: "Продолжить",
              onPress: async () => {
                await completeShiftWithDistribution(
                  contributionAmount,
                  excessAmount,
                  goalId
                );
              },
            },
          ]
        );
        return;
      }
    }

    await completeShiftWithDistribution(contributionAmount, excessAmount, goalId);
  };

  const completeShiftWithDistribution = async (
    contribution: number,
    excess: number,
    goalId?: string
  ) => {
    if (!completingSession) return;

    const totalEarning = contribution + excess;

    await storage.completeWorkSession(
      completingSession.id,
      totalEarning,
      contribution,
      goalId
    );

    if (excess > 0) {
      await storage.addToSafe(
        excess,
        `Излишек от смены ${new Date(completingSession.date).toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}`
      );
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowCompleteModal(false);
    setCompletingSession(null);
    await loadData();
  };

  const formatEarningInput = (text: string) => {
    const cleaned = text.replace(/[^\d]/g, "");
    if (!cleaned) {
      setActualEarning("");
      return;
    }
    const number = parseInt(cleaned, 10);
    setActualEarning(number.toLocaleString("ru-RU"));
  };

  const handleDateSelect = (day: { dateString: string }) => {
    const date = new Date(day.dateString);
    date.setHours(12, 0, 0, 0);
    setSelectedDate(date);
    setShowCalendar(false);
  };

  const getMarkedDates = () => {
    const marked: {
      [key: string]: { marked: boolean; dotColor: string; selected?: boolean };
    } = {};

    sessions.forEach((session) => {
      const dateKey = new Date(session.date).toISOString().split("T")[0];
      marked[dateKey] = {
        marked: true,
        dotColor: session.shiftType === "day" ? theme.warning : theme.primary,
      };
    });

    const selectedKey = selectedDate.toISOString().split("T")[0];
    marked[selectedKey] = {
      ...marked[selectedKey],
      selected: true,
    };

    return marked;
  };

  const getTodayString = () => new Date().toISOString().split("T")[0];

  const activeSessions = sessions.filter((s) =>
    isShiftActive(s.date, s.shiftType)
  );
  const plannedSessions = sessions.filter(
    (s) => !isShiftActive(s.date, s.shiftType)
  );

  const getWeekStats = () => {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay() + 1);
    weekStart.setHours(0, 0, 0, 0);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    const weekCompleted = completedSessions.filter((s) => {
      const date = new Date(s.completedAt || s.date);
      return date >= weekStart && date <= weekEnd;
    });

    const totalEarnings = weekCompleted.reduce(
      (sum, s) => sum + (s.actualEarning || 0),
      0
    );
    const shiftsCount = weekCompleted.length;

    return { totalEarnings, shiftsCount };
  };

  const weekStats = getWeekStats();

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + Spacing.xl + 80 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: theme.card }]}>
            <ThemedText type="caption" secondary>
              ЗА НЕДЕЛЮ
            </ThemedText>
            <ThemedText
              type="h2"
              style={{ color: theme.success, marginTop: Spacing.xs }}
            >
              {formatCurrency(weekStats.totalEarnings)} ₽
            </ThemedText>
            <ThemedText type="small" secondary style={{ marginTop: 2 }}>
              {weekStats.shiftsCount} смен
            </ThemedText>
          </View>
          <View style={[styles.statCard, { backgroundColor: theme.card }]}>
            <ThemedText type="caption" secondary>
              ЗАПЛАНИРОВАНО
            </ThemedText>
            <ThemedText
              type="h2"
              style={{ color: theme.text, marginTop: Spacing.xs }}
            >
              {sessions.length}
            </ThemedText>
            <ThemedText type="small" secondary style={{ marginTop: 2 }}>
              {activeSessions.length > 0
                ? `${activeSessions.length} активных`
                : "смен"}
            </ThemedText>
          </View>
        </View>

        {activeSessions.length > 0 && (
          <View style={styles.section}>
            <ThemedText type="h4" style={styles.sectionTitle}>
              Активные смены
            </ThemedText>
            {activeSessions.map((session) => {
              const progress = getShiftProgress(session.date, session.shiftType);
              return (
                <Card
                  key={session.id}
                  style={{ ...styles.activeCard, borderColor: theme.warningMuted }}
                >
                  <View style={styles.shiftHeader}>
                    <View
                      style={[styles.shiftIcon, { backgroundColor: theme.warningMuted }]}
                    >
                      <MaterialCommunityIcons
                        name={
                          session.shiftType === "day"
                            ? "weather-sunny"
                            : "weather-night"
                        }
                        size={24}
                        color={theme.warning}
                      />
                    </View>
                    <View style={styles.shiftInfo}>
                      <ThemedText type="body" style={{ fontWeight: "600" }}>
                        {session.shiftType === "day" ? "Дневная" : "Ночная"} смена
                      </ThemedText>
                      <ThemedText type="small" secondary>
                        {session.operationType === "reception"
                          ? "Приёмка"
                          : "Возвраты"}{" "}
                        •{" "}
                        {new Date(session.date).toLocaleDateString("ru-RU", {
                          day: "numeric",
                          month: "short",
                        })}
                      </ThemedText>
                    </View>
                    <Pressable
                      style={[styles.deleteBtn, { backgroundColor: theme.errorMuted }]}
                      onPress={() => handleDeleteShift(session)}
                    >
                      <MaterialCommunityIcons
                        name="close"
                        size={16}
                        color={theme.error}
                      />
                    </Pressable>
                  </View>
                  <View style={styles.progressSection}>
                    <ProgressBar percentage={progress} height={8} color={theme.warning} />
                    <View style={styles.progressMeta}>
                      <ThemedText type="small" secondary>
                        {session.shiftType === "day" ? "08:00 — 20:00" : "20:00 — 08:00"}
                      </ThemedText>
                      <ThemedText type="small" style={{ color: theme.warning }}>
                        {Math.round(progress)}%
                      </ThemedText>
                    </View>
                  </View>
                  <Button
                    variant="success"
                    size="md"
                    onPress={() => openCompleteModal(session)}
                    style={styles.completeButton}
                  >
                    Завершить смену
                  </Button>
                </Card>
              );
            })}
          </View>
        )}

        {plannedSessions.length > 0 && (
          <View style={styles.section}>
            <ThemedText type="h4" style={styles.sectionTitle}>
              Запланированные
            </ThemedText>
            {plannedSessions.map((session) => (
              <Card key={session.id} style={styles.plannedCard}>
                <View style={styles.shiftHeader}>
                  <View
                    style={[styles.shiftIcon, { backgroundColor: theme.primaryMuted }]}
                  >
                    <MaterialCommunityIcons
                      name={
                        session.shiftType === "day"
                          ? "weather-sunny"
                          : "weather-night"
                      }
                      size={22}
                      color={theme.primary}
                    />
                  </View>
                  <View style={styles.shiftInfo}>
                    <ThemedText type="body" style={{ fontWeight: "500" }}>
                      {session.shiftType === "day" ? "Дневная" : "Ночная"} смена
                    </ThemedText>
                    <ThemedText type="small" secondary>
                      {formatDateLabel(new Date(session.date))} •{" "}
                      {session.operationType === "reception"
                        ? "Приёмка"
                        : "Возвраты"}
                    </ThemedText>
                  </View>
                  <View style={styles.plannedMeta}>
                    <ThemedText
                      type="caption"
                      style={{
                        color: theme.textSecondary,
                        backgroundColor: theme.backgroundSecondary,
                        paddingHorizontal: Spacing.sm,
                        paddingVertical: 2,
                        borderRadius: BorderRadius.xs,
                      }}
                    >
                      {getTimeUntilShift(session.date, session.shiftType)}
                    </ThemedText>
                    <Pressable
                      style={[styles.deleteBtn, { backgroundColor: theme.backgroundSecondary }]}
                      onPress={() => handleDeleteShift(session)}
                    >
                      <MaterialCommunityIcons
                        name="close"
                        size={16}
                        color={theme.textSecondary}
                      />
                    </Pressable>
                  </View>
                </View>
              </Card>
            ))}
          </View>
        )}

        {completedSessions.length > 0 && (
          <View style={styles.section}>
            <ThemedText type="h4" style={styles.sectionTitle}>
              Недавние
            </ThemedText>
            <Card style={styles.historyCard}>
              {completedSessions.map((session, index) => (
                <View
                  key={session.id}
                  style={[
                    styles.completedItem,
                    index < completedSessions.length - 1 && {
                      borderBottomWidth: 1,
                      borderBottomColor: theme.divider,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.completedIcon,
                      { backgroundColor: theme.successMuted },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name={
                        session.shiftType === "day"
                          ? "weather-sunny"
                          : "weather-night"
                      }
                      size={18}
                      color={theme.success}
                    />
                  </View>
                  <View style={styles.completedInfo}>
                    <ThemedText type="body">
                      {new Date(session.date).toLocaleDateString("ru-RU", {
                        day: "numeric",
                        month: "short",
                      })}
                    </ThemedText>
                    <ThemedText type="small" secondary>
                      {session.shiftType === "day" ? "Дневная" : "Ночная"} •{" "}
                      {session.operationType === "reception"
                        ? "Приёмка"
                        : "Возвраты"}
                    </ThemedText>
                  </View>
                  <ThemedText
                    type="body"
                    style={{ color: theme.success, fontWeight: "600" }}
                  >
                    +{formatCurrency(session.actualEarning || 0)} ₽
                  </ThemedText>
                </View>
              ))}
            </Card>
          </View>
        )}

        {sessions.length === 0 && completedSessions.length === 0 && (
          <View style={styles.emptyState}>
            <View style={[styles.emptyIcon, { backgroundColor: theme.primaryMuted }]}>
              <MaterialCommunityIcons
                name="briefcase-clock"
                size={48}
                color={theme.primary}
              />
            </View>
            <ThemedText type="h3" style={styles.emptyTitle}>
              Нет смен
            </ThemedText>
            <ThemedText type="body" secondary style={styles.emptyText}>
              Добавьте свою первую рабочую смену, чтобы начать отслеживать
              заработок
            </ThemedText>
          </View>
        )}
      </ScrollView>

      <View
        style={[
          styles.addButtonContainer,
          { paddingBottom: insets.bottom + Spacing.md },
        ]}
      >
        <Button onPress={() => setShowAddModal(true)} size="lg">
          Добавить смену
        </Button>
      </View>

      <Modal
        visible={showAddModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAddModal(false)}
      >
        <Pressable
          style={[styles.modalOverlay, { backgroundColor: theme.overlay }]}
          onPress={() => setShowAddModal(false)}
        >
          <Pressable
            style={[styles.modalContent, { backgroundColor: theme.card }]}
            onPress={() => {}}
          >
            <ThemedText type="h3" style={styles.modalTitle}>
              Новая смена
            </ThemedText>

            <ThemedText type="caption" secondary style={styles.fieldLabel}>
              ДАТА
            </ThemedText>
            <Pressable
              style={[
                styles.dateSelector,
                { backgroundColor: theme.backgroundSecondary },
              ]}
              onPress={() => setShowCalendar(true)}
            >
              <MaterialCommunityIcons
                name="calendar"
                size={22}
                color={theme.primary}
              />
              <ThemedText type="body" style={{ marginLeft: Spacing.sm, flex: 1 }}>
                {formatDateLabel(selectedDate)}
              </ThemedText>
              <MaterialCommunityIcons
                name="chevron-down"
                size={22}
                color={theme.textSecondary}
              />
            </Pressable>

            <ThemedText type="caption" secondary style={styles.fieldLabel}>
              ВРЕМЯ СМЕНЫ
            </ThemedText>
            <View style={styles.shiftOptions}>
              <Pressable
                style={[
                  styles.shiftOption,
                  { backgroundColor: theme.backgroundSecondary },
                  shiftType === "day" && {
                    backgroundColor: theme.warningMuted,
                    borderColor: theme.warning,
                    borderWidth: 2,
                  },
                ]}
                onPress={() => setShiftType("day")}
              >
                <MaterialCommunityIcons
                  name="weather-sunny"
                  size={24}
                  color={shiftType === "day" ? theme.warning : theme.textSecondary}
                />
                <ThemedText
                  type="body"
                  style={{
                    color: shiftType === "day" ? theme.text : theme.textSecondary,
                    fontWeight: shiftType === "day" ? "600" : "400",
                    marginTop: Spacing.xs,
                  }}
                >
                  Дневная
                </ThemedText>
                <ThemedText
                  type="small"
                  style={{
                    color:
                      shiftType === "day" ? theme.textSecondary : theme.textTertiary,
                  }}
                >
                  08:00 — 20:00
                </ThemedText>
              </Pressable>
              <Pressable
                style={[
                  styles.shiftOption,
                  { backgroundColor: theme.backgroundSecondary },
                  shiftType === "night" && {
                    backgroundColor: theme.primaryMuted,
                    borderColor: theme.primary,
                    borderWidth: 2,
                  },
                ]}
                onPress={() => setShiftType("night")}
              >
                <MaterialCommunityIcons
                  name="weather-night"
                  size={24}
                  color={shiftType === "night" ? theme.primary : theme.textSecondary}
                />
                <ThemedText
                  type="body"
                  style={{
                    color:
                      shiftType === "night" ? theme.text : theme.textSecondary,
                    fontWeight: shiftType === "night" ? "600" : "400",
                    marginTop: Spacing.xs,
                  }}
                >
                  Ночная
                </ThemedText>
                <ThemedText
                  type="small"
                  style={{
                    color:
                      shiftType === "night"
                        ? theme.textSecondary
                        : theme.textTertiary,
                  }}
                >
                  20:00 — 08:00
                </ThemedText>
              </Pressable>
            </View>

            <ThemedText type="caption" secondary style={styles.fieldLabel}>
              ТИП РАБОТЫ
            </ThemedText>
            <View style={styles.typeOptions}>
              <Pressable
                style={[
                  styles.typeOption,
                  { backgroundColor: theme.backgroundSecondary },
                  operationType === "reception" && {
                    backgroundColor: theme.primary,
                  },
                ]}
                onPress={() => setOperationType("reception")}
              >
                <ThemedText
                  type="body"
                  style={{
                    color:
                      operationType === "reception" ? "#FFFFFF" : theme.text,
                    fontWeight: operationType === "reception" ? "600" : "400",
                  }}
                >
                  Приёмка
                </ThemedText>
              </Pressable>
              <Pressable
                style={[
                  styles.typeOption,
                  { backgroundColor: theme.backgroundSecondary },
                  operationType === "returns" && {
                    backgroundColor: theme.primary,
                  },
                ]}
                onPress={() => setOperationType("returns")}
              >
                <ThemedText
                  type="body"
                  style={{
                    color: operationType === "returns" ? "#FFFFFF" : theme.text,
                    fontWeight: operationType === "returns" ? "600" : "400",
                  }}
                >
                  Возвраты
                </ThemedText>
              </Pressable>
            </View>

            <View style={styles.modalActions}>
              <Button
                variant="secondary"
                onPress={() => setShowAddModal(false)}
                style={styles.modalButton}
              >
                Отмена
              </Button>
              <Button onPress={handleAddShift} style={styles.modalButton}>
                Добавить
              </Button>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={showCalendar}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCalendar(false)}
      >
        <Pressable
          style={[styles.modalOverlay, { backgroundColor: theme.overlay }]}
          onPress={() => setShowCalendar(false)}
        >
          <View
            style={[styles.calendarContainer, { backgroundColor: theme.card }]}
          >
            <ThemedText type="h4" style={styles.calendarTitle}>
              Выберите дату
            </ThemedText>
            <Calendar
              current={selectedDate.toISOString().split("T")[0]}
              minDate={getTodayString()}
              markedDates={getMarkedDates()}
              onDayPress={handleDateSelect}
              firstDay={1}
              theme={{
                backgroundColor: theme.card,
                calendarBackground: theme.card,
                textSectionTitleColor: theme.textSecondary,
                selectedDayBackgroundColor: theme.primary,
                selectedDayTextColor: "#ffffff",
                todayTextColor: theme.primary,
                dayTextColor: theme.text,
                textDisabledColor: theme.textTertiary,
                dotColor: theme.primary,
                selectedDotColor: "#ffffff",
                arrowColor: theme.text,
                monthTextColor: theme.text,
                textDayFontWeight: "400",
                textMonthFontWeight: "600",
                textDayHeaderFontWeight: "500",
                textDayFontSize: 16,
                textMonthFontSize: 18,
                textDayHeaderFontSize: 13,
              }}
              style={styles.calendar}
            />
            <Button
              variant="secondary"
              onPress={() => setShowCalendar(false)}
              style={styles.calendarCloseBtn}
            >
              Закрыть
            </Button>
          </View>
        </Pressable>
      </Modal>

      <Modal
        visible={showCompleteModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCompleteModal(false)}
      >
        <Pressable
          style={[styles.modalOverlay, { backgroundColor: theme.overlay }]}
          onPress={() => setShowCompleteModal(false)}
        >
          <Pressable
            style={[styles.modalContent, { backgroundColor: theme.card }]}
            onPress={() => {}}
          >
            <ThemedText type="h3" style={styles.modalTitle}>
              Завершить смену
            </ThemedText>

            {completingSession && (
              <View
                style={[
                  styles.shiftSummary,
                  { backgroundColor: theme.backgroundSecondary },
                ]}
              >
                <MaterialCommunityIcons
                  name={
                    completingSession.shiftType === "day"
                      ? "weather-sunny"
                      : "weather-night"
                  }
                  size={20}
                  color={theme.textSecondary}
                />
                <ThemedText type="small" secondary style={{ marginLeft: Spacing.sm }}>
                  {completingSession.shiftType === "day" ? "Дневная" : "Ночная"}{" "}
                  смена •{" "}
                  {new Date(completingSession.date).toLocaleDateString("ru-RU", {
                    day: "numeric",
                    month: "short",
                  })}
                </ThemedText>
              </View>
            )}

            <ThemedText type="caption" secondary style={styles.fieldLabel}>
              ЗАРАБОТОК
            </ThemedText>
            <View style={styles.inputContainer}>
              <TextInput
                style={[styles.amountInput, { color: theme.text }]}
                value={actualEarning}
                onChangeText={formatEarningInput}
                placeholder="0"
                placeholderTextColor={theme.textTertiary}
                keyboardType="numeric"
                autoFocus
              />
              <ThemedText type="h3" style={{ color: theme.textTertiary }}>
                ₽
              </ThemedText>
            </View>

            {goals.length > 0 && (
              <>
                <ThemedText type="caption" secondary style={styles.fieldLabel}>
                  РАСПРЕДЕЛИТЬ НА ЦЕЛЬ
                </ThemedText>
                <View style={styles.goalsGrid}>
                  {goals.map((goal) => {
                    const remaining = goal.targetAmount - goal.currentAmount;
                    return (
                      <Pressable
                        key={goal.id}
                        style={[
                          styles.goalOption,
                          { backgroundColor: theme.backgroundSecondary },
                          selectedGoal?.id === goal.id && {
                            backgroundColor: theme.primaryMuted,
                            borderColor: theme.primary,
                            borderWidth: 2,
                          },
                        ]}
                        onPress={() => setSelectedGoal(goal)}
                      >
                        <ThemedText type="body" numberOfLines={1}>
                          {goal.name}
                        </ThemedText>
                        <ThemedText type="small" secondary>
                          осталось {formatCurrency(remaining)} ₽
                        </ThemedText>
                      </Pressable>
                    );
                  })}
                </View>
              </>
            )}

            {selectedGoal && actualEarning && (
              <View
                style={[
                  styles.distributionPreview,
                  { backgroundColor: theme.backgroundSecondary },
                ]}
              >
                {(() => {
                  const earning =
                    parseFloat(actualEarning.replace(/[^\d.]/g, "")) || 0;
                  const remaining =
                    selectedGoal.targetAmount - selectedGoal.currentAmount;
                  const toGoal = Math.min(earning, remaining);
                  const toSafe = Math.max(0, earning - remaining);

                  return (
                    <>
                      <View style={styles.distributionRow}>
                        <ThemedText type="small" secondary>
                          На цель "{selectedGoal.name}":
                        </ThemedText>
                        <ThemedText type="body" style={{ fontWeight: "600" }}>
                          {formatCurrency(toGoal)} ₽
                        </ThemedText>
                      </View>
                      {toSafe > 0 && (
                        <View style={styles.distributionRow}>
                          <ThemedText type="small" style={{ color: theme.success }}>
                            В общие накопления:
                          </ThemedText>
                          <ThemedText
                            type="body"
                            style={{ fontWeight: "600", color: theme.success }}
                          >
                            +{formatCurrency(toSafe)} ₽
                          </ThemedText>
                        </View>
                      )}
                    </>
                  );
                })()}
              </View>
            )}

            <View style={styles.modalActions}>
              <Button
                variant="secondary"
                onPress={() => setShowCompleteModal(false)}
                style={styles.modalButton}
              >
                Отмена
              </Button>
              <Button
                variant="success"
                onPress={handleCompleteShift}
                style={styles.modalButton}
              >
                Завершить
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
    paddingTop: Spacing.lg,
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
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    marginBottom: Spacing.md,
  },
  activeCard: {
    marginBottom: Spacing.md,
    borderWidth: 2,
  },
  plannedCard: {
    marginBottom: Spacing.sm,
  },
  historyCard: {
    padding: 0,
    overflow: "hidden",
  },
  shiftHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  shiftIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.md,
  },
  shiftInfo: {
    flex: 1,
  },
  plannedMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  deleteBtn: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.full,
    justifyContent: "center",
    alignItems: "center",
  },
  progressSection: {
    marginTop: Spacing.md,
    marginBottom: Spacing.md,
  },
  progressMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: Spacing.xs,
  },
  completeButton: {
    marginTop: Spacing.xs,
  },
  completedItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
  },
  completedIcon: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.sm,
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.md,
  },
  completedInfo: {
    flex: 1,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: Spacing.xxl,
  },
  emptyIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  emptyTitle: {
    marginBottom: Spacing.sm,
  },
  emptyText: {
    textAlign: "center",
    maxWidth: 280,
  },
  addButtonContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.lg,
  },
  modalContent: {
    width: "100%",
    maxWidth: 400,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
  },
  modalTitle: {
    textAlign: "center",
    marginBottom: Spacing.lg,
  },
  fieldLabel: {
    marginBottom: Spacing.sm,
    marginTop: Spacing.md,
  },
  dateSelector: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  shiftOptions: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  shiftOption: {
    flex: 1,
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    borderColor: "transparent",
  },
  typeOptions: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  typeOption: {
    flex: 1,
    alignItems: "center",
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  calendarContainer: {
    width: "100%",
    maxWidth: 400,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
  },
  calendarTitle: {
    textAlign: "center",
    marginBottom: Spacing.md,
  },
  calendar: {
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
  },
  calendarCloseBtn: {
    marginTop: Spacing.sm,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.sm,
  },
  amountInput: {
    fontSize: 48,
    fontWeight: "300",
    textAlign: "center",
    minWidth: 120,
  },
  goalsGrid: {
    gap: Spacing.sm,
  },
  goalOption: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    borderColor: "transparent",
  },
  shiftSummary: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
  },
  distributionPreview: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.md,
    gap: Spacing.xs,
  },
  distributionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  modalActions: {
    flexDirection: "row",
    marginTop: Spacing.lg,
    gap: Spacing.sm,
  },
  modalButton: {
    flex: 1,
  },
});
