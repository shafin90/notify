import React, { useEffect, useRef, useState } from "react";
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, Image, Keyboard, Animated, Alert } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { collection, doc, addDoc, getDoc, getDocs, query, where, onSnapshot, orderBy, updateDoc, Timestamp } from "firebase/firestore";
import { db, auth } from "../constants/firebaseConfig";
import { COLORS, SIZES } from "../constants/theme";
import { Audio } from "expo-av";
import moment from "moment";

import ImageViewing from "react-native-image-viewing";
import * as FileSystem from "expo-file-system";
import * as MediaLibrary from "expo-media-library";

const IMAGE_BB_API_KEY = "a237535b7fbf5b30479eaa33f84bc462"; // 🔥 Replace with your ImageBB API Key

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

        // Auto-scroll to latest message
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);

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

  // const sendMessage = async (imageUrl = "", reaction = "", repliedTo = null) => {
  //   if (!text.trim() && !imageUrl && !reaction) return;
  //   if (!chatId) return;


  //   const sendingMessage = text
  //   setText("")
  //   setReplyingTo(null)
  //   const messageRef = collection(db, "chats", chatId, "messages");

  //   // Play send sound
  //   playSound("send");
  //   await addDoc(messageRef, {
  //     senderId: currentUser?.uid,
  //     text: reaction ? "" : sendingMessage, // If it's a reaction, keep text empty
  //     imageUrl,
  //     reaction, // New reaction feature
  //     repliedTo, // New replied message feature
  //     timestamp: Timestamp.now(),
  //     seen: false,
  //   });


  //   const chatRef = doc(db, "chats", chatId);
  //   await updateDoc(chatRef, {
  //     lastMessage: reaction ? reaction : imageUrl ? "📷 Image" : text,
  //     timestamp: Timestamp.now(),
  //   });



  // };



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
        sendMessage(data.data.url);
      } else {
        alert("Image upload failed");
      }
    } catch (error) {
      alert("Image upload failed");
    }
  };



  const openReactionMenu = (message) => {
    const reactions = ["❤️", "😂", "😢", "😡", "👍"];
    Alert.alert(
      "React to Message",
      "Choose a reaction",
      reactions.map((reaction) => ({
        text: reaction,
        onPress: async () => {
          try {
            const messageRef = doc(db, "chats", chatId, "messages", message.id);
            await updateDoc(messageRef, { reaction });
          } catch (error) {
            console.error("Error updating reaction:", error);
          }
        },
      }))
    );
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
    <View style={styles.container}>
      {/* Chat Header */}
      <View style={styles.header}>

        {partner && (
          <View style={styles.profileInfo}>
            <Image source={partner.profileImage ? { uri: partner.profileImage } : require("../assets/avatar-placeholder.png")} style={styles.profileImage} />
            <View>
              <Text style={styles.partnerName}>{partner.name}</Text>
              <Text style={styles.status}>
                {partner?.online ? "🟢 Online" : "⚪ Offline"}
                {partnerTyping && " • Typing..."}
              </Text>

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
          const nearBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 50; // If near bottom
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
          <TouchableOpacity
            onLongPress={() => openReactionMenu(item)}
            onPress={() => setReplyingTo(item)}
            style={[styles.messageBubble, item.senderId === currentUser?.uid ? styles.myMessage : styles.otherMessage]}
          >
            {item.repliedTo && (
              <View style={styles.replyContainer}>
                <Text style={styles.replyText}>↩ {item.repliedTo.text}</Text>
              </View>
            )}

            {item.imageUrl ? (
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
                <Text style={styles.reaction}>{item.reaction}</Text>
              </View>
            )}

            <Text style={styles.timestamp}>
              {moment(item.timestamp.toDate()).format("MMM D, YYYY - h:mm A")}
            </Text>

            {item.senderId === currentUser?.uid && (
              <Text style={styles.seenText}>
                {item.seen ? "✔ Seen" : "🕒 Unread"}
              </Text>
            )}
          </TouchableOpacity>
        )}
      />




      {/* Input Field */}
      {/* <View style={styles.inputContainer}>
        <TouchableOpacity onPress={pickImage} style={styles.imageButton}>
          <Text style={styles.imageButtonText}>📷</Text>
        </TouchableOpacity>
        <TextInput value={text} onChangeText={setText} placeholder="Type a message..." style={styles.input} />
        <TouchableOpacity onPress={() => sendMessage()} style={styles.sendButton}>
          <Text style={styles.sendButtonText}>Send</Text>
        </TouchableOpacity>
      </View> */}


      <View>{replyingTo && (
        <View style={styles.replyPreview}>
          <Text style={styles.replyPreviewText}>↩ Replying to: {replyingTo.text}</Text>
          <TouchableOpacity onPress={() => setReplyingTo(null)}>
            <Text style={styles.cancelReply}>✖</Text>
          </TouchableOpacity>
        </View>
      )}
        <View style={styles.inputContainer}>

          <TouchableOpacity onPress={pickImage} style={styles.imageButton}>
            <Text style={styles.imageButtonText}>📷</Text>
          </TouchableOpacity>

          <TextInput
            value={text}
            onChangeText={handleTyping}
            placeholder="Type a message..."
            style={styles.input}
          />

          <TouchableOpacity onPress={() => sendMessage("", "", replyingTo)} style={styles.sendButton}>
            <Text style={styles.sendButtonText}>Send</Text>
          </TouchableOpacity>
        </View>
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
            <Text style={styles.downloadText}>📥 Download</Text>
          </TouchableOpacity>
        )}
      />


    </View>
  );
};


const styles = StyleSheet.create({
  container: { flex: 1, padding: SIZES.padding, backgroundColor: COLORS.secondary },
  header: { flexDirection: "row", alignItems: "center", paddingBottom: 10 },
  backButton: { fontSize: 16, color: COLORS.white, marginRight: 10 },
  profileInfo: { flexDirection: "row", alignItems: "center" },
  profileImage: { width: 40, height: 40, borderRadius: 20, marginRight: 10 },
  partnerName: { fontSize: 18, fontWeight: "bold", color: "black" },
  status: { fontSize: 12, color: "black" },
  messageBubble: { padding: 12, borderRadius: 12, marginBottom: 10, maxWidth: "75%" },
  myMessage: { alignSelf: "flex-end", backgroundColor: COLORS.primary },
  otherMessage: { alignSelf: "flex-start", backgroundColor: "#497D74" },
  messageText: { color: COLORS.white },
  imageMessage: { width: 200, height: 200, borderRadius: 10, marginBottom: 5 },
  timestamp: { fontSize: 8, color: "white", alignSelf: "flex-end" },
  seenText: { fontSize: 8, color: "white", marginLeft: "auto" },


  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    backgroundColor: "#fff",
    borderRadius: 15,
    marginHorizontal: 0,
    marginBottom: 10,
    // elevation: 2, // Shadow for Android
    // shadowColor: "#000",
    // shadowOffset: { width: 0, height: 1 },
    // shadowOpacity: 0.2,
    // shadowRadius: 2,
  },
  imageButton: {
    padding: 10,
    borderRadius: 50,
    backgroundColor: "#E8E8E8",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  imageButtonText: {
    fontSize: 18,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: "#333",
  },
  sendButton: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 11,
    backgroundColor: COLORS.primary,
  },
  sendButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
  },







  replyContainer: {
    backgroundColor: "#f0f0f0",
    padding: 5,
    borderRadius: 5,
    marginBottom: 5,
  },
  replyText: {
    fontSize: 12,
    color: "#555",
  },
  reaction: {
    fontSize: 15,
    marginTop: 5,
  },
  replyPreview: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#e8e8e8",
    padding: 5,
    borderRadius: 10,
    marginBottom: 5,
  },
  replyPreviewText: {
    fontSize: 14,
    color: "#333",
  },
  cancelReply: {
    marginLeft: 10,
    color: "red",
    fontSize: 18,
  },




  largeEmoji: {
    fontSize: 45, // Larger size for standalone emoji messages
    textAlign: "center",
  },

  reactionContainer: {
    position: "absolute",
    bottom: -10,
    right: -5,
    // backgroundColor: "rgba(255, 255, 255, 0.8)", // Slightly transparent background
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 10,
  },


  downloadButton: {
    position: "absolute",
    bottom: 30,
    alignSelf: "center",
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  downloadText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },



});

export default ChatScreen;
