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
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { CircularProgress } from "@/components/CircularProgress";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { ContributionItem } from "@/components/ContributionItem";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import { storage } from "@/lib/storage";
import { Goal, Contribution } from "@/lib/types";
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

export default function GoalDetailScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteType>();
  const insets = useSafeAreaInsets();
  const { goalId } = route.params;

  const [goal, setGoal] = useState<Goal | null>(null);
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    const goals = await storage.getGoals();
    const foundGoal = goals.find((g) => g.id === goalId);
    setGoal(foundGoal || null);

    if (foundGoal) {
      const allContributions = await storage.getContributionsByGoal(goalId);
      setContributions(allContributions);
    }
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
    goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0;
  const remaining = Math.max(0, goal.targetAmount - goal.currentAmount);
  const recentContributions = contributions.slice(0, 5);

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
          <CircularProgress percentage={percentage} />
          <View style={styles.amountDisplay}>
            <ThemedText type="h2" style={styles.currentAmount}>
              {formatCurrency(goal.currentAmount)}
            </ThemedText>
            <ThemedText type="body" secondary>
              из {formatCurrency(goal.targetAmount)}
            </ThemedText>
          </View>
        </View>

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
                {formatCurrency(remaining)}
              </ThemedText>
            </View>
          </View>
        </Card>

        <Button onPress={handleAddContribution} style={styles.addButton}>
          Добавить накопление
        </Button>

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

        <Pressable onPress={handleDeleteGoal} style={styles.deleteButton}>
          <MaterialCommunityIcons
            name="delete-outline"
            size={20}
            color={Colors.dark.error}
          />
          <ThemedText style={styles.deleteText}>Удалить цель</ThemedText>
        </Pressable>
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
  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    marginTop: Spacing.lg,
  },
  deleteText: {
    color: Colors.dark.error,
    marginLeft: Spacing.xs,
  },
});
