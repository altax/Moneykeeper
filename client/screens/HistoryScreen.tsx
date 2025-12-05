import React, { useCallback, useState } from "react";
import { StyleSheet, ScrollView, View, RefreshControl, SectionList } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useHeaderHeight } from "@react-navigation/elements";
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { ContributionItem } from "@/components/ContributionItem";
import { EmptyState } from "@/components/EmptyState";
import { Colors, Spacing } from "@/constants/theme";
import { storage } from "@/lib/storage";
import { Goal, Contribution } from "@/lib/types";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface Section {
  title: string;
  data: (Contribution & { goal?: Goal })[];
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
    month: "long",
    year: date.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
  });
}

export default function HistoryScreen() {
  const navigation = useNavigation<NavigationProp>();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const [sections, setSections] = useState<Section[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [goals, setGoals] = useState<Goal[]>([]);

  const loadData = useCallback(async () => {
    const allGoals = await storage.getGoals();
    setGoals(allGoals);

    const allContributions = await storage.getContributions();
    const sortedContributions = allContributions.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    const grouped: { [key: string]: (Contribution & { goal?: Goal })[] } = {};
    sortedContributions.forEach((contribution) => {
      const dateKey = new Date(contribution.date).toDateString();
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      const goal = allGoals.find((g) => g.id === contribution.goalId);
      grouped[dateKey].push({ ...contribution, goal });
    });

    const sectionData: Section[] = Object.entries(grouped).map(([dateKey, data]) => ({
      title: formatDate(dateKey),
      data,
    }));

    setSections(sectionData);
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

  const handleContributionPress = (contribution: Contribution) => {
    navigation.navigate("AddContribution", {
      goalId: contribution.goalId,
      contributionId: contribution.id,
    });
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
            description="Здесь будут отображаться все ваши накопления"
          />
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ContributionItem
            contribution={item}
            goal={item.goal}
            showGoalName
            onPress={() => handleContributionPress(item)}
          />
        )}
        renderSectionHeader={({ section: { title } }) => (
          <View style={styles.sectionHeader}>
            <ThemedText type="small" secondary style={styles.sectionTitle}>
              {title}
            </ThemedText>
          </View>
        )}
        contentContainerStyle={[
          styles.listContent,
          {
            paddingTop: headerHeight + Spacing.lg,
            paddingBottom: tabBarHeight + Spacing.xl,
          },
        ]}
        stickySectionHeadersEnabled={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.dark.primary}
          />
        }
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        SectionSeparatorComponent={() => <View style={styles.sectionSeparator} />}
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
  listContent: {
    paddingHorizontal: Spacing.md,
  },
  sectionHeader: {
    paddingVertical: Spacing.sm,
  },
  sectionTitle: {
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  separator: {
    height: Spacing.xs,
  },
  sectionSeparator: {
    height: Spacing.sm,
  },
});
