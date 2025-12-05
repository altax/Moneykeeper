import React, { useCallback, useState } from "react";
import { StyleSheet, ScrollView, View, RefreshControl, Pressable } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useHeaderHeight } from "@react-navigation/elements";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { ProgressBar } from "@/components/ProgressBar";
import { EmptyState } from "@/components/EmptyState";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import { storage } from "@/lib/storage";
import { Goal, Contribution } from "@/lib/types";
import { GoalsStackParamList } from "@/navigation/GoalsStackNavigator";

type NavigationProp = NativeStackNavigationProp<GoalsStackParamList>;

interface GoalSection {
  goal: Goal;
  data: Contribution[];
  totalAmount: number;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("ru-RU", {
    style: "decimal",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return "Сегодня";
  }
  if (date.toDateString() === yesterday.toDateString()) {
    return "Вчера";
  }
  return date.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
  });
}

function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function HistoryScreen() {
  const navigation = useNavigation<NavigationProp>();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const [sections, setSections] = useState<GoalSection[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedGoals, setExpandedGoals] = useState<Set<string>>(new Set());

  const loadData = useCallback(async () => {
    const allGoals = await storage.getGoals();
    const allContributions = await storage.getContributions();

    const goalsWithContributions: GoalSection[] = [];

    allGoals.forEach((goal) => {
      const goalContributions = allContributions
        .filter((c) => c.goalId === goal.id)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      if (goalContributions.length > 0) {
        const totalAmount = goalContributions.reduce((sum, c) => sum + c.amount, 0);
        goalsWithContributions.push({
          goal,
          data: goalContributions,
          totalAmount,
        });
      }
    });

    goalsWithContributions.sort((a, b) => {
      const aLatest = a.data[0]?.date || "";
      const bLatest = b.data[0]?.date || "";
      return new Date(bLatest).getTime() - new Date(aLatest).getTime();
    });

    setSections(goalsWithContributions);
    
    if (goalsWithContributions.length > 0 && expandedGoals.size === 0) {
      setExpandedGoals(new Set([goalsWithContributions[0].goal.id]));
    }
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

  const toggleGoalExpanded = (goalId: string) => {
    setExpandedGoals((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(goalId)) {
        newSet.delete(goalId);
      } else {
        newSet.add(goalId);
      }
      return newSet;
    });
  };

  const handleGoalPress = (goalId: string) => {
    navigation.navigate("GoalDetail", { goalId });
  };

  if (sections.length === 0) {
    return (
      <ThemedView style={styles.container}>
        <View
          style={[styles.emptyContainer, { paddingTop: headerHeight + Spacing.xl }]}
        >
          <EmptyState
            icon="history"
            title="История пуста"
            description="Здесь будут отображаться все ваши накопления, сгруппированные по целям"
          />
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: headerHeight + Spacing.lg,
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
        <View style={styles.summaryCard}>
          <MaterialCommunityIcons
            name="chart-timeline-variant"
            size={24}
            color={Colors.light.primary}
          />
          <View style={styles.summaryContent}>
            <ThemedText type="small" secondary>Всего накоплено</ThemedText>
            <ThemedText type="h3" style={styles.summaryAmount}>
              {formatCurrency(sections.reduce((sum, s) => sum + s.totalAmount, 0))} руб.
            </ThemedText>
          </View>
          <View style={styles.summaryStats}>
            <ThemedText type="caption" secondary>
              {sections.reduce((sum, s) => sum + s.data.length, 0)} пополнений
            </ThemedText>
          </View>
        </View>

        {sections.map((section) => {
          const isExpanded = expandedGoals.has(section.goal.id);
          const percentage = section.goal.targetAmount > 0 
            ? Math.min((section.goal.currentAmount / section.goal.targetAmount) * 100, 100) 
            : 0;
          const isCompleted = section.goal.currentAmount >= section.goal.targetAmount;

          return (
            <View key={section.goal.id} style={styles.goalSection}>
              <Pressable
                style={styles.goalHeader}
                onPress={() => toggleGoalExpanded(section.goal.id)}
              >
                <View style={[
                  styles.goalIconContainer,
                  isCompleted && styles.goalIconContainerCompleted,
                ]}>
                  <MaterialCommunityIcons
                    name={isCompleted ? "check-circle" : "target"}
                    size={20}
                    color={isCompleted ? Colors.light.success : Colors.light.primary}
                  />
                </View>
                <View style={styles.goalInfo}>
                  <ThemedText type="bodyLarge" style={styles.goalName} numberOfLines={1}>
                    {section.goal.name}
                  </ThemedText>
                  <View style={styles.goalProgress}>
                    <ProgressBar percentage={percentage} height={4} />
                  </View>
                  <View style={styles.goalStats}>
                    <ThemedText type="caption" style={styles.goalAmount}>
                      {formatCurrency(section.goal.currentAmount)} / {formatCurrency(section.goal.targetAmount)} руб.
                    </ThemedText>
                    <ThemedText type="caption" secondary>
                      {section.data.length} {getContributionsWord(section.data.length)}
                    </ThemedText>
                  </View>
                </View>
                <Pressable
                  style={styles.viewGoalButton}
                  onPress={() => handleGoalPress(section.goal.id)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <MaterialCommunityIcons
                    name="eye-outline"
                    size={20}
                    color={Colors.light.primary}
                  />
                </Pressable>
                <MaterialCommunityIcons
                  name={isExpanded ? "chevron-up" : "chevron-down"}
                  size={24}
                  color={Colors.light.textSecondary}
                />
              </Pressable>

              {isExpanded && (
                <View style={styles.contributionsList}>
                  {section.data.map((contribution, index) => (
                    <View 
                      key={contribution.id} 
                      style={[
                        styles.contributionItem,
                        index === section.data.length - 1 && styles.contributionItemLast,
                      ]}
                    >
                      <View style={styles.contributionTimeline}>
                        <View style={styles.timelineDot} />
                        {index < section.data.length - 1 && <View style={styles.timelineLine} />}
                      </View>
                      <View style={styles.contributionContent}>
                        <View style={styles.contributionHeader}>
                          <ThemedText type="bodyLarge" style={styles.contributionAmount}>
                            +{formatCurrency(contribution.amount)} руб.
                          </ThemedText>
                          <ThemedText type="caption" secondary>
                            {formatDate(contribution.date)}, {formatTime(contribution.date)}
                          </ThemedText>
                        </View>
                        {contribution.note && (
                          <ThemedText type="small" secondary style={styles.contributionNote}>
                            {contribution.note}
                          </ThemedText>
                        )}
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          );
        })}

        <View style={styles.infoCard}>
          <MaterialCommunityIcons
            name="information-outline"
            size={18}
            color={Colors.light.textSecondary}
          />
          <ThemedText type="small" secondary style={styles.infoText}>
            История накоплений доступна только для просмотра. Редактировать суммы можно в карточке цели.
          </ThemedText>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

function getContributionsWord(count: number): string {
  const lastTwo = count % 100;
  const lastOne = count % 10;
  
  if (lastTwo >= 11 && lastTwo <= 19) {
    return "пополнений";
  }
  if (lastOne === 1) {
    return "пополнение";
  }
  if (lastOne >= 2 && lastOne <= 4) {
    return "пополнения";
  }
  return "пополнений";
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
  summaryCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.light.card,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.light.primary,
    gap: Spacing.sm,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  summaryContent: {
    flex: 1,
  },
  summaryAmount: {
    color: Colors.light.primary,
  },
  summaryStats: {
    alignItems: "flex-end",
  },
  goalSection: {
    backgroundColor: Colors.light.card,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.light.border,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  goalHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  goalIconContainer: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.light.backgroundSecondary,
    justifyContent: "center",
    alignItems: "center",
  },
  goalIconContainerCompleted: {
    backgroundColor: "rgba(16, 185, 129, 0.15)",
  },
  goalInfo: {
    flex: 1,
  },
  goalName: {
    fontWeight: "600",
    marginBottom: 4,
  },
  goalProgress: {
    marginBottom: 4,
  },
  goalStats: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  goalAmount: {
    color: Colors.light.primary,
  },
  viewGoalButton: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.light.backgroundSecondary,
    justifyContent: "center",
    alignItems: "center",
  },
  contributionsList: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
  },
  contributionItem: {
    flexDirection: "row",
    paddingTop: Spacing.md,
  },
  contributionItemLast: {
    paddingBottom: 0,
  },
  contributionTimeline: {
    alignItems: "center",
    width: 20,
    marginRight: Spacing.sm,
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.light.success,
    marginTop: 4,
  },
  timelineLine: {
    flex: 1,
    width: 2,
    backgroundColor: Colors.light.border,
    marginTop: 4,
  },
  contributionContent: {
    flex: 1,
    paddingBottom: Spacing.sm,
  },
  contributionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  contributionAmount: {
    color: Colors.light.success,
    fontWeight: "600",
  },
  contributionNote: {
    marginTop: 4,
    fontStyle: "italic",
  },
  infoCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  infoText: {
    flex: 1,
  },
});
