import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { Platform, StyleSheet } from "react-native";
import GoalsStackNavigator from "@/navigation/GoalsStackNavigator";
import SafeStackNavigator from "@/navigation/SafeStackNavigator";
import HistoryStackNavigator from "@/navigation/HistoryStackNavigator";
import SettingsStackNavigator from "@/navigation/SettingsStackNavigator";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";

export type MainTabParamList = {
  GoalsTab: undefined;
  SafeTab: undefined;
  HistoryTab: undefined;
  SettingsTab: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

export default function MainTabNavigator() {
  return (
    <Tab.Navigator
      initialRouteName="GoalsTab"
      screenOptions={{
        tabBarActiveTintColor: Colors.light.primary,
        tabBarInactiveTintColor: Colors.light.textTertiary,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: Platform.select({
            ios: "rgba(18, 18, 26, 0.92)",
            android: Colors.light.backgroundDefault,
            web: Colors.light.backgroundDefault,
          }),
          borderTopWidth: 1,
          borderTopColor: Colors.light.border,
          elevation: 0,
          height: Platform.select({ ios: 85, android: 65, web: 65 }),
          paddingBottom: Platform.select({ ios: 28, android: 8, web: 8 }),
          paddingTop: 8,
        },
        tabBarBackground: () =>
          Platform.OS === "ios" ? (
            <BlurView
              intensity={80}
              tint="dark"
              style={StyleSheet.absoluteFill}
            />
          ) : null,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "500",
          marginTop: 2,
        },
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="GoalsTab"
        component={GoalsStackNavigator}
        options={{
          title: "Цели",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="target" size={24} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="SafeTab"
        component={SafeStackNavigator}
        options={{
          title: "Сейф",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="safe" size={24} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="HistoryTab"
        component={HistoryStackNavigator}
        options={{
          title: "История",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="history" size={24} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="SettingsTab"
        component={SettingsStackNavigator}
        options={{
          title: "Настройки",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="cog-outline" size={24} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
