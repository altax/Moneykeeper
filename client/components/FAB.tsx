import React from "react";
import { StyleSheet, Pressable, ViewStyle } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";

interface FABProps {
  onPress: () => void;
  icon?: string;
  style?: ViewStyle;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function FAB({ onPress, icon = "plus", style }: FABProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.9, { damping: 15, stiffness: 150 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 150 });
  };

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[styles.fab, animatedStyle, style]}
    >
      <MaterialCommunityIcons
        name={icon as any}
        size={28}
        color={Colors.dark.buttonText}
      />
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: "absolute",
    width: Spacing.fabSize,
    height: Spacing.fabSize,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.dark.primary,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 4,
  },
});
