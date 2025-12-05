import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import MainTabNavigator from "@/navigation/MainTabNavigator";
import AddGoalModal from "@/screens/AddGoalModal";
import AddContributionModal from "@/screens/AddContributionModal";
import ArchivedGoalsScreen from "@/screens/ArchivedGoalsScreen";
import GoalDetailScreen from "@/screens/GoalDetailScreen";
import SafeDetailScreen from "@/screens/SafeDetailScreen";
import ShiftFlowScreen from "@/screens/ShiftFlowScreen";
import { useScreenOptions } from "@/hooks/useScreenOptions";

export type RootStackParamList = {
  Main: { screen?: string } | undefined;
  AddGoal: { goalId?: string } | undefined;
  AddContribution: { goalId: string; contributionId?: string };
  ArchivedGoals: undefined;
  GoalDetail: { goalId: string };
  SafeDetail: undefined;
  ShiftFlow: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootStackNavigator() {
  const screenOptions = useScreenOptions();
  const opaqueOptions = useScreenOptions({ transparent: false });

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="Main"
        component={MainTabNavigator}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="AddGoal"
        component={AddGoalModal}
        options={{
          presentation: "modal",
          headerTitle: "Новая цель",
        }}
      />
      <Stack.Screen
        name="AddContribution"
        component={AddContributionModal}
        options={{
          presentation: "modal",
          headerTitle: "Добавить сумму",
        }}
      />
      <Stack.Screen
        name="ArchivedGoals"
        component={ArchivedGoalsScreen}
        options={{
          ...opaqueOptions,
          headerTitle: "Архив",
        }}
      />
      <Stack.Screen
        name="GoalDetail"
        component={GoalDetailScreen}
        options={{
          ...opaqueOptions,
          headerTitle: "Цель",
        }}
      />
      <Stack.Screen
        name="SafeDetail"
        component={SafeDetailScreen}
        options={{
          ...opaqueOptions,
          headerTitle: "Сейф",
        }}
      />
      <Stack.Screen
        name="ShiftFlow"
        component={ShiftFlowScreen}
        options={{
          presentation: "modal",
          headerTitle: "Мои смены",
        }}
      />
    </Stack.Navigator>
  );
}
