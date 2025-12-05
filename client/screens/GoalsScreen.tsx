import React, { useCallback, useState } from "react";
import { StyleSheet, ScrollView, View, RefreshControl, Modal, TextInput, Pressable } from "react-native";
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
import { Goal, AppSettings } from "@/lib/types";
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

    await storage.addContribution({
      goalId: quickAddGoal.id,
      amount,
      date: new Date().toISOString(),
    });

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setQuickAddGoal(null);
    await loadData();
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
  modalHeader: {
    marginBottom: Spacing.lg,
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
