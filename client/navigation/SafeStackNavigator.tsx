import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useScreenOptions } from "@/hooks/useScreenOptions";
import SafeScreen from "@/screens/SafeScreen";
import { HeaderTitle } from "@/components/HeaderTitle";

export type SafeStackParamList = {
  Safe: undefined;
};

const Stack = createNativeStackNavigator<SafeStackParamList>();

export default function SafeStackNavigator() {
  const screenOptions = useScreenOptions();

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="Safe"
        component={SafeScreen}
        options={{
          headerTitle: () => <HeaderTitle title="Сейф" />,
        }}
      />
    </Stack.Navigator>
  );
}
