import React, { useCallback, useState } from "react";
import { StyleSheet, ScrollView, View, RefreshControl } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useHeaderHeight } from "@react-navigation/elements";
import { ThemedView } from "@/components/ThemedView";
import { GoalCard } from "@/components/GoalCard";
import { FAB } from "@/components/FAB";
import { EmptyState } from "@/components/EmptyState";
import { Colors, Spacing } from "@/constants/theme";
import { storage } from "@/lib/storage";
import { Goal } from "@/lib/types";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { GoalsStackParamList } from "@/navigation/GoalsStackNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList & GoalsStackParamList>;

export default function GoalsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadGoals = useCallback(async () => {
    const data = await storage.getGoals();
    setGoals(data.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    ));
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadGoals();
    }, [loadGoals])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadGoals();
    setRefreshing(false);
  };

  const handleAddGoal = () => {
    navigation.navigate("AddGoal");
  };

  const handleGoalPress = (goalId: string) => {
    navigation.navigate("GoalDetail", { goalId });
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
              paddingTop: headerHeight + Spacing.lg,
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
          {goals.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              onPress={() => handleGoalPress(goal.id)}
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
    </ThemedView>
  );
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
});
