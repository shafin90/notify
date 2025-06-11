import React, { useEffect, useRef, useState } from "react";
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, Image, Keyboard, Animated, Alert, ActivityIndicator, Modal } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { collection, doc, addDoc, getDoc, getDocs, query, where, onSnapshot, orderBy, updateDoc, Timestamp } from "firebase/firestore";
import { db, auth } from "../constants/firebaseConfig";
import { COLORS, SIZES } from "../constants/theme";
import { Audio } from "expo-av";
import moment from "moment";

import ImageViewing from "react-native-image-viewing";
import * as FileSystem from "expo-file-system";
import * as MediaLibrary from "expo-media-library";
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { GestureHandlerRootView, LongPressGestureHandler } from 'react-native-gesture-handler';

const IMAGE_BB_API_KEY = "a237535b7fbf5b30479eaa33f84bc462"; // 🔥 Replace with your ImageBB API Key

const REACTIONS = [
  { id: 'favorite', name: 'favorite', color: '#FF4B4B' },
  { id: 'mood', name: 'sentiment-satisfied', color: '#FFD700' },
  { id: 'sad', name: 'sentiment-dissatisfied', color: '#4B7BFF' },
  { id: 'angry', name: 'mood-bad', color: '#FF6B4B' },
  { id: 'like', name: 'thumb-up', color: '#4CAF50' },
];

const ChatScreen = ({ route, navigation }: any) => {
  const { userId } = route.params;
  const currentUser = auth.currentUser;

  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState("");
  const [chatId, setChatId] = useState("");
  const [partner, setPartner] = useState<any>(null);
  const [replyingTo, setReplyingTo] = useState<any>("")
  const flatListRef = useRef<FlatList<any>>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [partnerTyping, setPartnerTyping] = useState(false);
  const [visible, setVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [isNearBottom, setIsNearBottom] = useState(true);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [reactionModalVisible, setReactionModalVisible] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState(null);

  const openImage = (imageUrl) => {
    setSelectedImage([{ uri: imageUrl }]); // Format for ImageViewing
    setVisible(true);
  };

  const handleTyping = async (text) => {
    setText(text);

    // If user is typing, update Firestore
    if (!isTyping) {
      setIsTyping(true);
      await updateDoc(doc(db, "chats", chatId), {
        [`typing.${currentUser?.uid}`]: true,
      });

      // Stop typing after 3 seconds of inactivity
      setTimeout(async () => {
        setIsTyping(false);
        await updateDoc(doc(db, "chats", chatId), {
          [`typing.${currentUser?.uid}`]: false,
        });
      }, 3000);
    }
  };

  useEffect(() => {
    const updateOnlineStatus = async (status) => {
      if (!currentUser) return;
      const userRef = doc(db, "users", currentUser.uid);
      await updateDoc(userRef, { online: status });
    };

    // Set user to online when screen opens
    updateOnlineStatus(true);

    // Set user to offline when screen is closed
    return () => updateOnlineStatus(false);
  }, []);

  useEffect(() => {
    const fetchChatPartner = async () => {
      const userRef = doc(db, "users", userId);
      const docSnap = await getDoc(userRef);
      if (docSnap.exists()) setPartner(docSnap.data());
    };

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
          timestamp: Timestamp.now(),
        });
        setChatId(newChatRef.id);
      }
    };

    fetchChatPartner();
    setupChat();
  }, [userId]);

  useEffect(() => {
    if (chatId) {
      const messagesRef = collection(db, "chats", chatId, "messages");
      const messagesQuery = query(messagesRef, orderBy("timestamp", "asc"));

      const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
        const newMessages = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setMessages(newMessages);

        // Only auto-scroll for new messages, not for reactions
        const lastMessage = newMessages[newMessages.length - 1];
        if (lastMessage && lastMessage.senderId !== currentUser?.uid && !lastMessage.reaction) {
          setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
          }, 100);
        }

        // Mark messages as "seen" when user opens the chat
        snapshot.docs.forEach(async (doc) => {
          const messageData = doc.data();
          if (!messageData.seen && messageData.senderId !== currentUser?.uid) {
            const messageRef = doc.ref;
            await updateDoc(messageRef, { seen: true });
          }
        });

        // Play a sound when a message is received
        if (newMessages.length > 0 && newMessages[newMessages.length - 1].senderId !== currentUser?.uid) {
          playSound("receive");
        }
      });

      return () => unsubscribe();
    }
  }, [chatId]);

  useEffect(() => {
    if (chatId) {
      const chatRef = doc(db, "chats", chatId);
      const unsubscribe = onSnapshot(chatRef, (docSnap) => {
        const data = docSnap.data();
        if (data?.typing) {
          setPartnerTyping(data.typing[userId] || false);
        }
      });

      return () => unsubscribe();
    }
  }, [chatId]);

  const playSound = async (type: "send" | "receive") => {
    try {
      const sound = new Audio.Sound();
      if (type === "send") {
        await sound.loadAsync(require("../assets/send.mp3"));
      } else {
        await sound.loadAsync(require("../assets/receive.mp3"));
      }
      await sound.playAsync();
    } catch (error) {
      console.error("Error playing sound:", error);
    }
  };

  const isEmojiOnly = (text) => {
    const emojiRegex = /^[\u{1F600}-\u{1F64F}\u{2702}-\u{27B0}\u{1F680}-\u{1F6C0}\u{1F300}-\u{1F5FF}]+$/u;
    return emojiRegex.test(text.trim());
  };

  const sendMessage = async (imageUrl = "", reaction = "", repliedTo = null) => {
    if (!text.trim() && !imageUrl && !reaction) return;
    if (!chatId) return;

    const sendingMessage = text;
    setText("");
    setReplyingTo(null);

    const messageRef = collection(db, "chats", chatId, "messages");

    // Play send sound
    playSound("send");

    await addDoc(messageRef, {
      senderId: currentUser?.uid,
      text: reaction ? "" : sendingMessage,
      isEmoji: isEmojiOnly(sendingMessage),
      imageUrl,
      reaction,
      repliedTo,
      timestamp: Timestamp.now(),
      seen: false,
    });

    const chatRef = doc(db, "chats", chatId);
    await updateDoc(chatRef, {
      lastMessage: reaction ? reaction : imageUrl ? "📷 Image" : text,
      timestamp: Timestamp.now(),
    });

    // Stop typing indicator
    await updateDoc(doc(db, "chats", chatId), {
      [`typing.${currentUser?.uid}`]: false,
    });
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled) {
      uploadImage(result.assets[0].uri);
    }
  };

  const uploadImage = async (imageUri: string) => {
    setUploadingImage(true);
    const formData = new FormData();
    formData.append("image", {
      uri: imageUri,
      type: "image/jpeg",
      name: "chat-image.jpg",
    } as any);

    try {
      const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMAGE_BB_API_KEY}`, {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      if (data.success) {
        // Add a temporary message with loading state
        const messageRef = collection(db, "chats", chatId, "messages");
        const tempMessage = await addDoc(messageRef, {
          senderId: currentUser?.uid,
          text: "",
          imageUrl: "",
          isUploading: true,
          timestamp: Timestamp.now(),
          seen: false,
        });

        // Update the message with actual image URL
        await updateDoc(doc(db, "chats", chatId, "messages", tempMessage.id), {
          imageUrl: data.data.url,
          isUploading: false,
        });

        // Update chat last message
        const chatRef = doc(db, "chats", chatId);
        await updateDoc(chatRef, {
          lastMessage: "📷 Image",
          timestamp: Timestamp.now(),
        });
      } else {
        Alert.alert("Error", "Image upload failed");
      }
    } catch (error) {
      Alert.alert("Error", "Image upload failed");
    } finally {
      setUploadingImage(false);
    }
  };

  const openReactionMenu = (message) => {
    setSelectedMessage(message);
    setReactionModalVisible(true);
  };

  const handleReaction = async (reaction) => {
    try {
      const messageRef = doc(db, "chats", chatId, "messages", selectedMessage.id);
      await updateDoc(messageRef, { 
        reaction: {
          icon: reaction.name,
          color: reaction.color
        }
      });
      setReactionModalVisible(false);
    } catch (error) {
      console.error("Error updating reaction:", error);
    }
  };

  const downloadImage = async () => {
    if (!selectedImage) return;

    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== "granted") {
        alert("Permission required to save images.");
        return;
      }

      const fileUri = FileSystem.documentDirectory + "chat_image.jpg";
      const downloadedFile = await FileSystem.downloadAsync(
        selectedImage[0].uri,
        fileUri
      );

      await MediaLibrary.saveToLibraryAsync(downloadedFile.uri);
      alert("Image saved to gallery! 🎉");
    } catch (error) {
      console.error("Error saving image:", error);
      alert("Failed to save image.");
    }
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={styles.container}>
        {/* Modern Chat Header */}
        <View style={styles.header}>
          {partner && (
            <View style={styles.profileInfo}>
              <Image 
                source={partner.profileImage ? { uri: partner.profileImage } : require("../assets/avatar-placeholder.png")} 
                style={styles.profileImage} 
              />
              <View style={styles.profileTextContainer}>
                <Text style={styles.partnerName}>{partner.name}</Text>
                <View style={styles.statusContainer}>
                  <View style={[styles.statusDot, partner?.online ? styles.onlineDot : styles.offlineDot]} />
                  <Text style={styles.status}>
                    {partner?.online ? "Online" : "Offline"}
                    {partnerTyping && " • Typing..."}
                  </Text>
                </View>
              </View>
            </View>
          )}
        </View>

        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          onScroll={(event) => {
            const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
            const nearBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 50;
            setIsNearBottom(nearBottom);
          }}
          onContentSizeChange={() => {
            if (isNearBottom) {
              setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: true });
              }, 300);
            }
          }}
          renderItem={({ item }) => (
            <LongPressGestureHandler
              onActivated={() => {
                setSelectedMessage(item);
                setReactionModalVisible(true);
              }}
              minDurationMs={200}
            >
              <Animated.View>
                <TouchableOpacity
                  onPress={() => setReplyingTo(item)}
                  style={[
                    styles.messageBubble,
                    item.senderId === currentUser?.uid ? styles.myMessage : styles.otherMessage,
                    item.imageUrl ? styles.imageMessageBubble : styles.textMessageBubble
                  ]}
                >
                  {item.repliedTo && (
                    <View style={styles.replyContainer}>
                      <Text style={styles.replyText}>↩ {item.repliedTo.text}</Text>
                    </View>
                  )}

                  {item.isUploading ? (
                    <View style={styles.uploadingContainer}>
                      <ActivityIndicator size="large" color="#FFFFFF" />
                      <Text style={styles.uploadingText}>Uploading image...</Text>
                    </View>
                  ) : item.imageUrl ? (
                    <TouchableOpacity onPress={() => openImage(item.imageUrl)}>
                      <Image source={{ uri: item.imageUrl }} style={styles.imageMessage} />
                    </TouchableOpacity>
                  ) : (
                    <Text style={[styles.messageText, item.isEmoji ? styles.largeEmoji : {}]}>
                      {item.text}
                    </Text>
                  )}

                  {item.reaction && (
                    <View style={styles.reactionContainer}>
                      <MaterialIcons 
                        name={item.reaction.icon} 
                        size={20} 
                        color={item.reaction.color} 
                      />
                    </View>
                  )}

                  <View style={styles.messageFooter}>
                    <Text style={styles.timestamp}>
                      {moment(item.timestamp.toDate()).format("h:mm A")}
                    </Text>
                    {item.senderId === currentUser?.uid && (
                      <Text style={styles.seenText}>
                        {item.seen ? "✓✓" : "✓"}
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              </Animated.View>
            </LongPressGestureHandler>
          )}
        />

        {/* Reply Preview */}
        {replyingTo && (
          <View style={styles.replyPreview}>
            <View style={styles.replyPreviewContent}>
              <Text style={styles.replyPreviewLabel}>Replying to</Text>
              <Text style={styles.replyPreviewText} numberOfLines={1}>
                {replyingTo.text}
              </Text>
            </View>
            <TouchableOpacity 
              onPress={() => setReplyingTo(null)}
              style={styles.cancelReplyButton}
            >
              <MaterialIcons name="close" size={20} color="#666666" />
            </TouchableOpacity>
          </View>
        )}

        {/* Modern Input Field */}
        <View style={styles.inputContainer}>
          <TouchableOpacity 
            onPress={pickImage} 
            style={[styles.imageButton, uploadingImage && styles.imageButtonDisabled]}
            disabled={uploadingImage}
          >
            <MaterialIcons 
              name="camera-alt" 
              size={24} 
              color={uploadingImage ? "#B0B0B0" : "#497D74"} 
            />
          </TouchableOpacity>

          <TextInput
            value={text}
            onChangeText={handleTyping}
            placeholder="Type a message..."
            style={styles.input}
            placeholderTextColor="#999"
          />

          <TouchableOpacity 
            onPress={() => sendMessage("", "", replyingTo)} 
            style={[styles.sendButton, !text.trim() && styles.sendButtonDisabled]}
            disabled={!text.trim()}
          >
            <MaterialIcons name="send" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <ImageViewing
          images={selectedImage}
          imageIndex={0}
          visible={visible}
          onRequestClose={() => setVisible(false)}
          swipeToCloseEnabled={true}
          doubleTapToZoomEnabled={true}
          FooterComponent={() => (
            <TouchableOpacity onPress={downloadImage} style={styles.downloadButton}>
              <MaterialIcons name="file-download" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          )}
        />

        {/* Reaction Modal */}
        <Modal
          visible={reactionModalVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setReactionModalVisible(false)}
        >
          <TouchableOpacity 
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setReactionModalVisible(false)}
          >
            <View style={styles.reactionModalContent}>
              <Text style={styles.reactionModalTitle}>React to Message</Text>
              <View style={styles.reactionGrid}>
                {REACTIONS.map((reaction) => (
                  <TouchableOpacity
                    key={reaction.id}
                    style={styles.reactionButton}
                    onPress={() => handleReaction(reaction)}
                  >
                    <MaterialIcons 
                      name={reaction.name} 
                      size={28} 
                      color={reaction.color} 
                    />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </TouchableOpacity>
        </Modal>
      </View>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5E5",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  profileInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  profileImage: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    marginRight: 12,
  },
  profileTextContainer: {
    flex: 1,
  },
  partnerName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1A1A1A",
    marginBottom: 2,
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  onlineDot: {
    backgroundColor: "#497D74",
  },
  offlineDot: {
    backgroundColor: "#9E9E9E",
  },
  status: {
    fontSize: 13,
    color: "#666666",
  },
  messageBubble: {
    borderRadius: 16,
    marginHorizontal: 16,
    marginVertical: 4,
    maxWidth: "80%",
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  textMessageBubble: {
    padding: 12,
  },
  imageMessageBubble: {
    padding: 3,
  },
  myMessage: {
    alignSelf: "flex-end",
    backgroundColor: "#497D74",
    borderBottomRightRadius: 4,
  },
  otherMessage: {
    alignSelf: "flex-start",
    backgroundColor: "#FFFFFF",
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
    color: "#FFFFFF",
    lineHeight: 20,
  },
  imageMessage: {
    width: 280,
    height: 280,
    borderRadius: 12,
    marginBottom: 4,
  },
  messageFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    marginTop: 4,
  },
  timestamp: {
    fontSize: 11,
    color: "rgba(255, 255, 255, 0.7)",
    marginRight: 4,
  },
  seenText: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.7)",
  },
  replyContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    padding: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  replyText: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.9)",
  },
  reactionOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  reactionContainer: {
    position: "absolute",
    bottom: -8,
    right: -4,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
  },
  replyPreview: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: "#E5E5E5",
  },
  replyPreviewContent: {
    flex: 1,
    marginRight: 8,
  },
  replyPreviewLabel: {
    fontSize: 12,
    color: "#666666",
    marginBottom: 2,
  },
  replyPreviewText: {
    fontSize: 14,
    color: "#1A1A1A",
  },
  cancelReplyButton: {
    padding: 4,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E5E5E5",
  },
  imageButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: "#F5F5F5",
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#F5F5F5",
    borderRadius: 20,
    color: "#1A1A1A",
    maxHeight: 100,
  },
  sendButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: "#497D74",
    marginLeft: 8,
  },
  sendButtonDisabled: {
    backgroundColor: "#B0B0B0",
  },
  largeEmoji: {
    fontSize: 45,
    textAlign: "center",
  },
  downloadButton: {
    position: "absolute",
    bottom: 30,
    alignSelf: "center",
    backgroundColor: "rgba(73, 125, 116, 0.9)",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
  },
  uploadingContainer: {
    width: 280,
    height: 280,
    borderRadius: 12,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  uploadingText: {
    color: "#FFFFFF",
    marginTop: 10,
    fontSize: 14,
  },
  imageButtonDisabled: {
    opacity: 0.5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reactionModalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    width: '80%',
    maxWidth: 400,
  },
  reactionModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 16,
    textAlign: 'center',
  },
  reactionGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    flexWrap: 'wrap',
    gap: 16,
  },
  reactionButton: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
  },
});

export default ChatScreen;
