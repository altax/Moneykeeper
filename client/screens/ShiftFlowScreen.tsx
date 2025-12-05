import React, { useCallback, useState } from "react";
import {
  StyleSheet,
  ScrollView,
  View,
  Pressable,
  TextInput,
  Alert,
  Modal,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { ProgressBar } from "@/components/ProgressBar";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";
import { storage } from "@/lib/storage";
import { Goal, WorkSession, WorkOperationType, ShiftType } from "@/lib/types";

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

export default function ShiftFlowScreen() {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  
  const [sessions, setSessions] = useState<WorkSession[]>([]);
  const [completedSessions, setCompletedSessions] = useState<WorkSession[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [shiftType, setShiftType] = useState<ShiftType>("day");
  const [operationType, setOperationType] = useState<WorkOperationType>("reception");
  
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [completingSession, setCompletingSession] = useState<WorkSession | null>(null);
  const [actualEarning, setActualEarning] = useState("");
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);

  const loadData = useCallback(async () => {
    const activeSessions = await storage.getActiveWorkSessions();
    setSessions(activeSessions);
    
    const completed = await storage.getCompletedWorkSessions();
    setCompletedSessions(completed.slice(0, 5));
    
    const activeGoals = await storage.getActiveGoals();
    setGoals(activeGoals.filter(g => g.currentAmount < g.targetAmount));
    
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
    await storage.addWorkSession({
      date: selectedDate.toISOString(),
      operationType,
      shiftType,
      plannedEarning: 0,
      plannedContribution: 0,
      isCompleted: false,
    });

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowAddModal(false);
    setSelectedDate(new Date());
    await loadData();
  };

  const handleDeleteShift = (session: WorkSession) => {
    Alert.alert(
      "Удалить смену?",
      "Вы уверены, что хотите удалить эту смену?",
      [
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
      ]
    );
  };

  const handleCompleteShift = async () => {
    if (!completingSession) return;

    const earning = parseFloat(actualEarning.replace(/[^\d.]/g, "")) || 0;
    if (earning <= 0) {
      Alert.alert("Ошибка", "Укажите сумму заработка");
      return;
    }

    const goalId = selectedGoal?.id;
    await storage.completeWorkSession(completingSession.id, earning, earning, goalId);
    
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

  const getDateOptions = () => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const dayAfter = new Date(today);
    dayAfter.setDate(today.getDate() + 2);
    
    return [
      { date: today, label: "Сегодня" },
      { date: tomorrow, label: "Завтра" },
      { date: dayAfter, label: "Послезавтра" },
    ];
  };

  const activeSessions = sessions.filter(s => isShiftActive(s.date, s.shiftType));
  const plannedSessions = sessions.filter(s => !isShiftActive(s.date, s.shiftType));

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + Spacing.xl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {activeSessions.length > 0 && (
          <View style={styles.section}>
            <ThemedText type="h4" style={styles.sectionTitle}>
              Активные смены
            </ThemedText>
            {activeSessions.map((session) => {
              const progress = getShiftProgress(session.date, session.shiftType);
              return (
                <Card key={session.id} style={{...styles.activeCard, borderColor: theme.warningMuted}}>
                  <View style={styles.shiftHeader}>
                    <View style={[styles.shiftIcon, { backgroundColor: theme.warningMuted }]}>
                      <MaterialCommunityIcons
                        name={session.shiftType === "day" ? "weather-sunny" : "weather-night"}
                        size={20}
                        color={theme.warning}
                      />
                    </View>
                    <View style={styles.shiftInfo}>
                      <ThemedText type="body" style={{ fontWeight: "600" }}>
                        {session.shiftType === "day" ? "Дневная" : "Ночная"} смена
                      </ThemedText>
                      <ThemedText type="caption" secondary>
                        {session.operationType === "reception" ? "Приёмка" : "Возвраты"}
                      </ThemedText>
                    </View>
                    <Pressable
                      style={[styles.deleteBtn, { backgroundColor: theme.errorMuted }]}
                      onPress={() => handleDeleteShift(session)}
                    >
                      <MaterialCommunityIcons name="close" size={16} color={theme.error} />
                    </Pressable>
                  </View>
                  <View style={styles.progressSection}>
                    <ProgressBar percentage={progress} height={6} color={theme.warning} />
                    <ThemedText type="caption" secondary style={styles.progressText}>
                      {Math.round(progress)}% выполнено
                    </ThemedText>
                  </View>
                  <Button
                    variant="success"
                    size="sm"
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
                  <View style={[styles.shiftIcon, { backgroundColor: theme.primaryMuted }]}>
                    <MaterialCommunityIcons
                      name={session.shiftType === "day" ? "weather-sunny" : "weather-night"}
                      size={20}
                      color={theme.primary}
                    />
                  </View>
                  <View style={styles.shiftInfo}>
                    <ThemedText type="body" style={{ fontWeight: "500" }}>
                      {session.shiftType === "day" ? "Дневная" : "Ночная"} смена
                    </ThemedText>
                    <ThemedText type="caption" secondary>
                      {getTimeUntilShift(session.date, session.shiftType)} • {session.operationType === "reception" ? "Приёмка" : "Возвраты"}
                    </ThemedText>
                  </View>
                  <Pressable
                    style={[styles.deleteBtn, { backgroundColor: theme.backgroundSecondary }]}
                    onPress={() => handleDeleteShift(session)}
                  >
                    <MaterialCommunityIcons name="close" size={16} color={theme.textSecondary} />
                  </Pressable>
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
            {completedSessions.map((session) => (
              <View key={session.id} style={styles.completedItem}>
                <View style={[styles.completedDot, { backgroundColor: theme.success }]} />
                <View style={styles.completedInfo}>
                  <ThemedText type="small">
                    {new Date(session.date).toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}
                  </ThemedText>
                  <ThemedText type="caption" secondary>
                    {session.shiftType === "day" ? "День" : "Ночь"}
                  </ThemedText>
                </View>
                <ThemedText type="body" style={{ color: theme.success, fontWeight: "600" }}>
                  +{formatCurrency(session.actualEarning || 0)} ₽
                </ThemedText>
              </View>
            ))}
          </View>
        )}

        {sessions.length === 0 && completedSessions.length === 0 && (
          <View style={styles.emptyState}>
            <View style={[styles.emptyIcon, { backgroundColor: theme.primaryMuted }]}>
              <MaterialCommunityIcons name="briefcase-clock" size={40} color={theme.primary} />
            </View>
            <ThemedText type="h4" style={styles.emptyTitle}>
              Нет смен
            </ThemedText>
            <ThemedText type="body" secondary style={styles.emptyText}>
              Добавьте свою первую рабочую смену
            </ThemedText>
          </View>
        )}
      </ScrollView>

      <View style={[styles.addButtonContainer, { paddingBottom: insets.bottom + Spacing.md }]}>
        <Button onPress={() => setShowAddModal(true)}>
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
          <Pressable style={[styles.modalContent, { backgroundColor: theme.card }]} onPress={() => {}}>
            <ThemedText type="h3" style={styles.modalTitle}>Новая смена</ThemedText>
            
            <ThemedText type="caption" secondary style={styles.fieldLabel}>ДАТА</ThemedText>
            <View style={styles.dateOptions}>
              {getDateOptions().map((option) => (
                <Pressable
                  key={option.label}
                  style={[
                    styles.dateOption,
                    { backgroundColor: theme.backgroundSecondary },
                    selectedDate.toDateString() === option.date.toDateString() && { backgroundColor: theme.primary },
                  ]}
                  onPress={() => setSelectedDate(option.date)}
                >
                  <ThemedText
                    type="small"
                    style={{ color: selectedDate.toDateString() === option.date.toDateString() ? "#FFFFFF" : theme.text }}
                  >
                    {option.label}
                  </ThemedText>
                </Pressable>
              ))}
            </View>

            <ThemedText type="caption" secondary style={styles.fieldLabel}>ВРЕМЯ</ThemedText>
            <View style={styles.shiftOptions}>
              <Pressable
                style={[
                  styles.shiftOption,
                  { backgroundColor: theme.backgroundSecondary },
                  shiftType === "day" && { backgroundColor: theme.primary },
                ]}
                onPress={() => setShiftType("day")}
              >
                <MaterialCommunityIcons
                  name="weather-sunny"
                  size={20}
                  color={shiftType === "day" ? "#FFFFFF" : theme.textSecondary}
                />
                <ThemedText
                  type="small"
                  style={{ color: shiftType === "day" ? "#FFFFFF" : theme.text, marginLeft: Spacing.xs }}
                >
                  День (8:00)
                </ThemedText>
              </Pressable>
              <Pressable
                style={[
                  styles.shiftOption,
                  { backgroundColor: theme.backgroundSecondary },
                  shiftType === "night" && { backgroundColor: theme.primary },
                ]}
                onPress={() => setShiftType("night")}
              >
                <MaterialCommunityIcons
                  name="weather-night"
                  size={20}
                  color={shiftType === "night" ? "#FFFFFF" : theme.textSecondary}
                />
                <ThemedText
                  type="small"
                  style={{ color: shiftType === "night" ? "#FFFFFF" : theme.text, marginLeft: Spacing.xs }}
                >
                  Ночь (20:00)
                </ThemedText>
              </Pressable>
            </View>

            <ThemedText type="caption" secondary style={styles.fieldLabel}>ТИП</ThemedText>
            <View style={styles.shiftOptions}>
              <Pressable
                style={[
                  styles.shiftOption,
                  { backgroundColor: theme.backgroundSecondary },
                  operationType === "reception" && { backgroundColor: theme.primary },
                ]}
                onPress={() => setOperationType("reception")}
              >
                <ThemedText
                  type="small"
                  style={{ color: operationType === "reception" ? "#FFFFFF" : theme.text }}
                >
                  Приёмка
                </ThemedText>
              </Pressable>
              <Pressable
                style={[
                  styles.shiftOption,
                  { backgroundColor: theme.backgroundSecondary },
                  operationType === "returns" && { backgroundColor: theme.primary },
                ]}
                onPress={() => setOperationType("returns")}
              >
                <ThemedText
                  type="small"
                  style={{ color: operationType === "returns" ? "#FFFFFF" : theme.text }}
                >
                  Возвраты
                </ThemedText>
              </Pressable>
            </View>

            <View style={styles.modalActions}>
              <Button variant="secondary" onPress={() => setShowAddModal(false)} style={styles.modalButton}>
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
        visible={showCompleteModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCompleteModal(false)}
      >
        <Pressable
          style={[styles.modalOverlay, { backgroundColor: theme.overlay }]}
          onPress={() => setShowCompleteModal(false)}
        >
          <Pressable style={[styles.modalContent, { backgroundColor: theme.card }]} onPress={() => {}}>
            <ThemedText type="h3" style={styles.modalTitle}>Завершить смену</ThemedText>
            
            <ThemedText type="caption" secondary style={styles.fieldLabel}>ЗАРАБОТОК</ThemedText>
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
              <ThemedText type="h3" style={{ color: theme.textTertiary }}>₽</ThemedText>
            </View>

            {goals.length > 1 && (
              <>
                <ThemedText type="caption" secondary style={styles.fieldLabel}>ЦЕЛЬ</ThemedText>
                <View style={styles.goalsGrid}>
                  {goals.map((goal) => (
                    <Pressable
                      key={goal.id}
                      style={[
                        styles.goalOption,
                        { backgroundColor: theme.backgroundSecondary },
                        selectedGoal?.id === goal.id && { backgroundColor: theme.primaryMuted, borderColor: theme.primary },
                      ]}
                      onPress={() => setSelectedGoal(goal)}
                    >
                      <ThemedText type="small" numberOfLines={1}>
                        {goal.name}
                      </ThemedText>
                    </Pressable>
                  ))}
                </View>
              </>
            )}

            <View style={styles.modalActions}>
              <Button variant="secondary" onPress={() => setShowCompleteModal(false)} style={styles.modalButton}>
                Отмена
              </Button>
              <Button variant="success" onPress={handleCompleteShift} style={styles.modalButton}>
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
  shiftHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  shiftIcon: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.md,
  },
  shiftInfo: {
    flex: 1,
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
  progressText: {
    marginTop: Spacing.xs,
    textAlign: "right",
  },
  completeButton: {
    marginTop: Spacing.xs,
  },
  completedItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.sm,
  },
  completedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
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
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    marginBottom: Spacing.xs,
  },
  emptyText: {
    textAlign: "center",
  },
  addButtonContainer: {
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
    maxWidth: 360,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    ...Shadows.lg,
  },
  modalTitle: {
    textAlign: "center",
    marginBottom: Spacing.lg,
  },
  fieldLabel: {
    marginBottom: Spacing.sm,
    letterSpacing: 1,
  },
  dateOptions: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  dateOption: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: "center",
  },
  shiftOptions: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  shiftOption: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.lg,
  },
  amountInput: {
    fontSize: 40,
    fontWeight: "700",
    textAlign: "center",
    minWidth: 120,
  },
  goalsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  goalOption: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: "transparent",
  },
  modalActions: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  modalButton: {
    flex: 1,
  },
});
