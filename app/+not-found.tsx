import React from "react";
import { View, Text } from "react-native";
import ThemedText from "../components/ThemedText"; // Adjust path accordingly

export default function NotFoundScreen() {
  return (
    <View>
      <ThemedText>This page could not be found.</ThemedText>
    </View>
  );
}
