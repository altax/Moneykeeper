import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import MainTabNavigator from "@/navigation/MainTabNavigator";
import AddGoalModal from "@/screens/AddGoalModal";
import AddContributionModal from "@/screens/AddContributionModal";
import { useScreenOptions } from "@/hooks/useScreenOptions";

export type RootStackParamList = {
  Main: undefined;
  AddGoal: { goalId?: string } | undefined;
  AddContribution: { goalId: string; contributionId?: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootStackNavigator() {
  const screenOptions = useScreenOptions();

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
    </Stack.Navigator>
  );
}
