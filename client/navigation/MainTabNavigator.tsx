import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { Platform, StyleSheet } from "react-native";
import GoalsStackNavigator from "@/navigation/GoalsStackNavigator";
import SafeStackNavigator from "@/navigation/SafeStackNavigator";
import HistoryStackNavigator from "@/navigation/HistoryStackNavigator";
import SettingsStackNavigator from "@/navigation/SettingsStackNavigator";
import { useTheme } from "@/hooks/useTheme";
import { Colors } from "@/constants/theme";

export type MainTabParamList = {
  GoalsTab: undefined;
  SafeTab: undefined;
  HistoryTab: undefined;
  SettingsTab: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

export default function MainTabNavigator() {
  const { theme, isDark } = useTheme();

  return (
    <Tab.Navigator
      initialRouteName="GoalsTab"
      screenOptions={{
        tabBarActiveTintColor: theme.tabIconSelected,
        tabBarInactiveTintColor: theme.tabIconDefault,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: Platform.select({
            ios: "rgba(255, 255, 255, 0.95)",
            android: Colors.light.backgroundRoot,
            web: Colors.light.backgroundRoot,
          }),
          borderTopWidth: 1,
          borderTopColor: Colors.light.border,
          elevation: 0,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.05,
          shadowRadius: 8,
        },
        tabBarBackground: () =>
          Platform.OS === "ios" ? (
            <BlurView
              intensity={100}
              tint="light"
              style={StyleSheet.absoluteFill}
            />
          ) : null,
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="GoalsTab"
        component={GoalsStackNavigator}
        options={{
          title: "Цели",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="target" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="SafeTab"
        component={SafeStackNavigator}
        options={{
          title: "Сейф",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="safe" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="HistoryTab"
        component={HistoryStackNavigator}
        options={{
          title: "История",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="history" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="SettingsTab"
        component={SettingsStackNavigator}
        options={{
          title: "Настройки",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="cog" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
