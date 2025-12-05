import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useScreenOptions } from "@/hooks/useScreenOptions";
import GoalsScreen from "@/screens/GoalsScreen";
import GoalDetailScreen from "@/screens/GoalDetailScreen";
import { HeaderTitle } from "@/components/HeaderTitle";

export type GoalsStackParamList = {
  Goals: undefined;
  GoalDetail: { goalId: string };
};

const Stack = createNativeStackNavigator<GoalsStackParamList>();

export default function GoalsStackNavigator() {
  const screenOptions = useScreenOptions();
  const opaqueOptions = useScreenOptions({ transparent: false });

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="Goals"
        component={GoalsScreen}
        options={{
          headerTitle: () => <HeaderTitle title="Копилка" />,
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
    </Stack.Navigator>
  );
}
