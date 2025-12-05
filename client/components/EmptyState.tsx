import React from "react";
import { View, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { Colors, Spacing } from "@/constants/theme";

interface EmptyStateProps {
  icon: string;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <MaterialCommunityIcons
          name={icon as any}
          size={64}
          color={Colors.light.textDisabled}
        />
      </View>
      <ThemedText type="h3" style={styles.title}>
        {title}
      </ThemedText>
      <ThemedText type="body" secondary style={styles.description}>
        {description}
      </ThemedText>
      {actionLabel && onAction ? (
        <Button onPress={onAction} style={styles.button}>
          {actionLabel}
        </Button>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.xl,
  },
  iconContainer: {
    marginBottom: Spacing.lg,
  },
  title: {
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  description: {
    textAlign: "center",
    marginBottom: Spacing.lg,
  },
  button: {
    paddingHorizontal: Spacing.xl,
  },
});
