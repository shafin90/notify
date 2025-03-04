import React, { useEffect, useState } from "react";
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet } from "react-native";
import { collection, doc, addDoc, getDocs, query, where, onSnapshot, orderBy, setDoc } from "firebase/firestore";
import { db, auth } from "../constants/firebaseConfig";
import { COLORS, SIZES } from "../constants/theme";

const ChatScreen = ({ route }: any) => {
  const { userId } = route.params; // ID of the person we're chatting with
  const currentUser = auth.currentUser;

  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState("");
  const [chatId, setChatId] = useState("");

  useEffect(() => {
    const setupChat = async () => {
      const chatRef = collection(db, "chats");
      const chatQuery = query(chatRef, where("users", "array-contains", currentUser?.uid));

      const chatDocs = await getDocs(chatQuery);
      let existingChat = null;

      chatDocs.forEach((doc) => {
        const chatData = doc.data();
        if (chatData.users.includes(userId)) {
          existingChat = { id: doc.id, ...chatData };
        }
      });

      if (existingChat) {
        setChatId(existingChat.id);
      } else {
        const newChatRef = await addDoc(chatRef, {
          users: [currentUser?.uid, userId],
          lastMessage: "",
          timestamp: new Date(),
        });
        setChatId(newChatRef.id);
      }
    };

    setupChat();
  }, [userId]);

  useEffect(() => {
    if (chatId) {
      const messagesRef = collection(db, "chats", chatId, "messages");
      const messagesQuery = query(messagesRef, orderBy("timestamp", "asc"));

      const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
        setMessages(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
      });

      return () => unsubscribe();
    }
  }, [chatId]);

  const sendMessage = async () => {
    if (!text.trim()) return;
    if (!chatId) return;

    const messageRef = collection(db, "chats", chatId, "messages");
    await addDoc(messageRef, {
      senderId: currentUser?.uid,
      text,
      timestamp: new Date(),
    });

    setText("");
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={[styles.messageBubble, item.senderId === currentUser?.uid ? styles.myMessage : styles.otherMessage]}>
            <Text style={styles.messageText}>{item.text}</Text>
          </View>
        )}
      />
      <View style={styles.inputContainer}>
        <TextInput value={text} onChangeText={setText} placeholder="Type a message..." style={styles.input} />
        <TouchableOpacity onPress={sendMessage} style={styles.sendButton}>
          <Text style={styles.sendButtonText}>Send</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: SIZES.padding, backgroundColor: COLORS.secondary },
  messageBubble: { padding: 12, borderRadius: 12, marginBottom: 10 },
  myMessage: { alignSelf: "flex-end", backgroundColor: COLORS.primary },
  otherMessage: { alignSelf: "flex-start", backgroundColor: COLORS.white },
  messageText: { color: COLORS.text },
  inputContainer: { flexDirection: "row", alignItems: "center", marginTop: 10 },
  input: { flex: 1, padding: 12, borderWidth: 1, borderRadius: 12 },
  sendButton: { padding: 12, backgroundColor: COLORS.primary, borderRadius: 12, marginLeft: 10 },
  sendButtonText: { color: COLORS.white },
});

export default ChatScreen;
