import React, { useCallback, useState } from "react";
import {
  StyleSheet,
  ScrollView,
  View,
  RefreshControl,
  Alert,
  Pressable,
} from "react-native";
import {
  useFocusEffect,
  useNavigation,
  useRoute,
  RouteProp,
} from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { HeaderButton } from "@react-navigation/elements";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { CircularProgress } from "@/components/CircularProgress";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { ContributionItem } from "@/components/ContributionItem";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import { storage } from "@/lib/storage";
import { Goal, Contribution, AppSettings } from "@/lib/types";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { GoalsStackParamList } from "@/navigation/GoalsStackNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList & GoalsStackParamList>;
type RouteType = RouteProp<GoalsStackParamList, "GoalDetail">;

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("ru-RU", {
    style: "decimal",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function getDaysWord(days: number): string {
  const lastTwo = days % 100;
  const lastOne = days % 10;
  
  if (lastTwo >= 11 && lastTwo <= 19) {
    return "дней";
  }
  if (lastOne === 1) {
    return "день";
  }
  if (lastOne >= 2 && lastOne <= 4) {
    return "дня";
  }
  return "дней";
}

export default function GoalDetailScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteType>();
  const insets = useSafeAreaInsets();
  const { goalId } = route.params;

  const [goal, setGoal] = useState<Goal | null>(null);
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    const goals = await storage.getGoals();
    const foundGoal = goals.find((g) => g.id === goalId);
    setGoal(foundGoal || null);

    if (foundGoal) {
      const allContributions = await storage.getContributionsByGoal(goalId);
      setContributions(allContributions);
    }

    const appSettings = await storage.getSettings();
    setSettings(appSettings);
  }, [goalId]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: goal?.name || "Цель",
      headerRight: () => (
        <HeaderButton
          onPress={() => navigation.navigate("AddGoal", { goalId })}
        >
          <MaterialCommunityIcons
            name="pencil"
            size={22}
            color={Colors.dark.text}
          />
        </HeaderButton>
      ),
    });
  }, [navigation, goal, goalId]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleAddContribution = () => {
    navigation.navigate("AddContribution", { goalId });
  };

  const handleContributionPress = (contributionId: string) => {
    navigation.navigate("AddContribution", { goalId, contributionId });
  };

  const handleArchiveGoal = () => {
    if (!goal) return;
    
    const isCompleted = goal.currentAmount >= goal.targetAmount;
    Alert.alert(
      isCompleted ? "Архивировать цель?" : "Скрыть цель?",
      isCompleted 
        ? "Поздравляем с достижением цели! Переместить её в архив?"
        : "Цель будет перемещена в архив. Вы сможете восстановить её позже.",
      [
        { text: "Отмена", style: "cancel" },
        {
          text: "В архив",
          onPress: async () => {
            await storage.archiveGoal(goalId);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            navigation.goBack();
          },
        },
      ]
    );
  };

  const handleDeleteGoal = () => {
    Alert.alert(
      "Удалить цель?",
      "Все накопления для этой цели также будут удалены. Это действие нельзя отменить.",
      [
        { text: "Отмена", style: "cancel" },
        {
          text: "Удалить",
          style: "destructive",
          onPress: async () => {
            await storage.deleteGoal(goalId);
            navigation.goBack();
          },
        },
      ]
    );
  };

  if (!goal) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ThemedText secondary>Загрузка...</ThemedText>
        </View>
      </ThemedView>
    );
  }

  const percentage =
    goal.targetAmount > 0 ? Math.min((goal.currentAmount / goal.targetAmount) * 100, 100) : 0;
  const remaining = Math.max(0, goal.targetAmount - goal.currentAmount);
  const isCompleted = goal.currentAmount >= goal.targetAmount;
  const recentContributions = contributions.slice(0, 5);

  const daysToGoal = settings?.averageDailyEarning && settings.averageDailyEarning > 0 && remaining > 0
    ? Math.ceil(remaining / settings.averageDailyEarning)
    : null;

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: Spacing.md,
            paddingBottom: insets.bottom + Spacing.lg,
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
        <View style={styles.progressSection}>
          <CircularProgress 
            percentage={percentage} 
            color={isCompleted ? Colors.dark.success : undefined}
          />
          <View style={styles.amountDisplay}>
            <ThemedText type="h2" style={[
              styles.currentAmount,
              isCompleted && styles.currentAmountCompleted,
            ]}>
              {formatCurrency(goal.currentAmount)}
            </ThemedText>
            <ThemedText type="body" secondary>
              из {formatCurrency(goal.targetAmount)}
            </ThemedText>
          </View>
        </View>

        {isCompleted ? (
          <Card style={styles.completedCard}>
            <View style={styles.completedContent}>
              <MaterialCommunityIcons
                name="party-popper"
                size={32}
                color={Colors.dark.success}
              />
              <View style={styles.completedText}>
                <ThemedText type="h4" style={styles.completedTitle}>
                  Цель достигнута!
                </ThemedText>
                <ThemedText type="small" secondary>
                  Поздравляем! Вы накопили нужную сумму.
                </ThemedText>
              </View>
            </View>
            <Pressable
              onPress={handleArchiveGoal}
              style={({ pressed }) => [
                styles.archiveButton,
                pressed && styles.archiveButtonPressed,
              ]}
            >
              <MaterialCommunityIcons
                name="archive-arrow-down"
                size={18}
                color={Colors.dark.success}
              />
              <ThemedText type="small" style={styles.archiveButtonText}>
                Переместить в архив
              </ThemedText>
            </Pressable>
          </Card>
        ) : (
          <>
            <Card style={styles.remainingCard}>
              <View style={styles.remainingContent}>
                <MaterialCommunityIcons
                  name="flag-checkered"
                  size={24}
                  color={Colors.dark.warning}
                />
                <View style={styles.remainingText}>
                  <ThemedText type="small" secondary>
                    Осталось накопить
                  </ThemedText>
                  <ThemedText type="h3" style={styles.remainingAmount}>
                    {formatCurrency(remaining)} руб.
                  </ThemedText>
                </View>
              </View>
            </Card>

            {daysToGoal !== null ? (
              <Card style={styles.daysCard}>
                <View style={styles.daysContent}>
                  <MaterialCommunityIcons
                    name="calendar-clock"
                    size={24}
                    color={Colors.dark.primary}
                  />
                  <View style={styles.daysText}>
                    <ThemedText type="small" secondary>
                      При текущем заработке
                    </ThemedText>
                    <View style={styles.daysRow}>
                      <ThemedText type="h3" style={styles.daysAmount}>
                        {daysToGoal}
                      </ThemedText>
                      <ThemedText type="body" style={styles.daysLabel}>
                        {getDaysWord(daysToGoal)} до цели
                      </ThemedText>
                    </View>
                  </View>
                </View>
              </Card>
            ) : (
              <Card style={styles.daysCard}>
                <View style={styles.daysContent}>
                  <MaterialCommunityIcons
                    name="information-outline"
                    size={24}
                    color={Colors.dark.textSecondary}
                  />
                  <ThemedText type="small" secondary style={styles.daysHint}>
                    Укажите средний заработок в настройках для расчёта дней до цели
                  </ThemedText>
                </View>
              </Card>
            )}

            <Button onPress={handleAddContribution} style={styles.addButton}>
              Добавить накопление
            </Button>
          </>
        )}

        {contributions.length > 0 ? (
          <View style={styles.historySection}>
            <View style={styles.sectionHeader}>
              <ThemedText type="h4">Последние накопления</ThemedText>
              {contributions.length > 5 ? (
                <Pressable onPress={() => {}}>
                  <ThemedText type="link">Все</ThemedText>
                </Pressable>
              ) : null}
            </View>
            <View style={styles.contributionsList}>
              {recentContributions.map((contribution) => (
                <ContributionItem
                  key={contribution.id}
                  contribution={contribution}
                  onPress={() => handleContributionPress(contribution.id)}
                />
              ))}
            </View>
          </View>
        ) : null}

        <View style={styles.actionsSection}>
          {!isCompleted ? (
            <Pressable onPress={handleArchiveGoal} style={styles.archiveAction}>
              <MaterialCommunityIcons
                name="archive-outline"
                size={20}
                color={Colors.dark.textSecondary}
              />
              <ThemedText secondary>Переместить в архив</ThemedText>
            </Pressable>
          ) : null}

          <Pressable onPress={handleDeleteGoal} style={styles.deleteButton}>
            <MaterialCommunityIcons
              name="delete-outline"
              size={20}
              color={Colors.dark.error}
            />
            <ThemedText style={styles.deleteText}>Удалить цель</ThemedText>
          </Pressable>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.md,
  },
  progressSection: {
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  amountDisplay: {
    alignItems: "center",
    marginTop: Spacing.md,
  },
  currentAmount: {
    color: Colors.dark.primary,
  },
  currentAmountCompleted: {
    color: Colors.dark.success,
  },
  completedCard: {
    marginBottom: Spacing.md,
    backgroundColor: "rgba(76, 175, 80, 0.08)",
    borderColor: Colors.dark.success,
  },
  completedContent: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  completedText: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  completedTitle: {
    color: Colors.dark.success,
  },
  archiveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    backgroundColor: "rgba(76, 175, 80, 0.15)",
  },
  archiveButtonPressed: {
    opacity: 0.7,
  },
  archiveButtonText: {
    color: Colors.dark.success,
    fontWeight: "600",
  },
  remainingCard: {
    marginBottom: Spacing.md,
  },
  remainingContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  remainingText: {
    marginLeft: Spacing.md,
  },
  remainingAmount: {
    color: Colors.dark.warning,
  },
  daysCard: {
    marginBottom: Spacing.md,
  },
  daysContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  daysText: {
    marginLeft: Spacing.md,
    flex: 1,
  },
  daysRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: Spacing.xs,
  },
  daysAmount: {
    color: Colors.dark.primary,
  },
  daysLabel: {
    color: Colors.dark.primary,
  },
  daysHint: {
    flex: 1,
    marginLeft: Spacing.sm,
  },
  addButton: {
    marginBottom: Spacing.lg,
  },
  historySection: {
    marginBottom: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  contributionsList: {
    gap: Spacing.xs,
  },
  actionsSection: {
    marginTop: Spacing.lg,
    gap: Spacing.sm,
  },
  archiveAction: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
  },
  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
  },
  deleteText: {
    color: Colors.dark.error,
    marginLeft: Spacing.xs,
  },
});
