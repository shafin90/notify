import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { COLORS, SIZES } from "../constants/theme";

interface ChatBubbleProps {
  message: string;
  isMe?: boolean;
}

const ChatBubble: React.FC<ChatBubbleProps> = ({ message, isMe = false }) => {
  return (
    <View style={[styles.bubble, isMe ? styles.myMessage : styles.otherMessage]}>
      <Text style={styles.text}>{message}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  bubble: {
    padding: SIZES.padding,
    borderRadius: SIZES.borderRadius,
    maxWidth: "75%",
    marginVertical: 4,
  },
  myMessage: {
    backgroundColor: COLORS.primary,
    alignSelf: "flex-end",
  },
  otherMessage: {
    backgroundColor: COLORS.secondary,
    alignSelf: "flex-start",
  },
  text: {
    color: COLORS.white,
  },
});

export default ChatBubble;
