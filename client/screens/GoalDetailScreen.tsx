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
import { ContributionItem } from "@/components/ContributionItem";
import { Spacing, BorderRadius } from "@/constants/theme";
import { storage } from "@/lib/storage";
import { Goal, Contribution, AppSettings } from "@/lib/types";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { useTheme } from "@/hooks/useTheme";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteType = RouteProp<RootStackParamList, "GoalDetail">;

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
  const { theme } = useTheme();
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
            size={20}
            color={theme.text}
          />
        </HeaderButton>
      ),
    });
  }, [navigation, goal, goalId, theme]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
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
            paddingTop: Spacing.lg,
            paddingBottom: insets.bottom + Spacing.lg,
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
          <ThemedText type="caption" secondary>
            {isCompleted ? "Накоплено" : "Прогресс"}
          </ThemedText>
          <ThemedText type="amountLarge" style={isCompleted && { color: theme.accent }}>
            {formatCurrency(goal.currentAmount)} <ThemedText type="h2" secondary>₽</ThemedText>
          </ThemedText>
          <ThemedText type="small" secondary style={styles.targetText}>
            из {formatCurrency(goal.targetAmount)} ₽
          </ThemedText>
        </View>

        <View style={[styles.progressTrack, { backgroundColor: theme.divider }]}>
          <View
            style={[
              styles.progressFill,
              {
                backgroundColor: isCompleted ? theme.accent : theme.text,
                width: `${percentage}%`,
              },
            ]}
          />
        </View>

        <View style={[styles.divider, { backgroundColor: theme.divider }]} />

        <View style={styles.statsSection}>
          <View style={styles.statRow}>
            <ThemedText type="body" secondary>Выполнено</ThemedText>
            <ThemedText type="body">{Math.round(percentage)}%</ThemedText>
          </View>
          
          {!isCompleted && (
            <View style={styles.statRow}>
              <ThemedText type="body" secondary>Осталось</ThemedText>
              <ThemedText type="body">{formatCurrency(remaining)} ₽</ThemedText>
            </View>
          )}

          {daysToGoal !== null && (
            <View style={styles.statRow}>
              <ThemedText type="body" secondary>Прогноз</ThemedText>
              <ThemedText type="body">{daysToGoal} {getDaysWord(daysToGoal)}</ThemedText>
            </View>
          )}
        </View>

        {isCompleted && (
          <>
            <View style={[styles.divider, { backgroundColor: theme.divider }]} />
            <View style={styles.completedSection}>
              <ThemedText type="body" style={{ color: theme.accent }}>
                Цель достигнута
              </ThemedText>
              <Pressable
                style={styles.archiveLink}
                onPress={handleArchiveGoal}
              >
                <ThemedText type="small" secondary>
                  Переместить в архив
                </ThemedText>
                <MaterialCommunityIcons
                  name="chevron-right"
                  size={18}
                  color={theme.textTertiary}
                />
              </Pressable>
            </View>
          </>
        )}

        {contributions.length > 0 && (
          <>
            <View style={[styles.divider, { backgroundColor: theme.divider }]} />
            <View style={styles.historySection}>
              <View style={styles.sectionHeader}>
                <ThemedText type="caption" secondary>
                  История
                </ThemedText>
                {contributions.length > 5 && (
                  <ThemedText type="small" style={{ color: theme.accent }}>
                    Все ({contributions.length})
                  </ThemedText>
                )}
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
          </>
        )}

        <View style={[styles.divider, { backgroundColor: theme.divider }]} />

        <View style={styles.actionsSection}>
          <Pressable
            style={styles.actionItem}
            onPress={() => navigation.navigate("AddContribution", { goalId })}
          >
            <ThemedText type="body">Добавить накопление</ThemedText>
            <MaterialCommunityIcons
              name="plus"
              size={20}
              color={theme.textTertiary}
            />
          </Pressable>

          {!isCompleted && (
            <Pressable
              style={styles.actionItem}
              onPress={handleArchiveGoal}
            >
              <ThemedText type="body" secondary>В архив</ThemedText>
              <MaterialCommunityIcons
                name="archive-outline"
                size={20}
                color={theme.textTertiary}
              />
            </Pressable>
          )}

          <Pressable
            style={styles.actionItem}
            onPress={handleDeleteGoal}
          >
            <ThemedText type="body" style={{ color: theme.error }}>
              Удалить
            </ThemedText>
            <MaterialCommunityIcons
              name="delete-outline"
              size={20}
              color={theme.error}
            />
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
    paddingHorizontal: Spacing.lg,
  },
  header: {
    alignItems: "center",
    paddingVertical: Spacing.xl,
  },
  targetText: {
    marginTop: Spacing.xs,
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    overflow: "hidden",
    marginBottom: Spacing.lg,
  },
  progressFill: {
    height: "100%",
    borderRadius: 2,
  },
  divider: {
    height: 1,
    marginVertical: Spacing.sm,
  },
  statsSection: {
    paddingVertical: Spacing.sm,
  },
  statRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.sm,
  },
  completedSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.md,
  },
  archiveLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  historySection: {
    paddingVertical: Spacing.sm,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  contributionsList: {
    gap: Spacing.xs,
  },
  actionsSection: {
    paddingVertical: Spacing.sm,
  },
  actionItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.md,
  },
});
