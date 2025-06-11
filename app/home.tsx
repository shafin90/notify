import React, { useState, useEffect } from "react";
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, Image, Alert, StatusBar } from "react-native";
import { collection, query, where, getDocs, onSnapshot, orderBy } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { db, auth } from "../constants/firebaseConfig";
import { COLORS, SIZES } from "../constants/theme";
import { MaterialIcons } from '@expo/vector-icons';

const HomeScreen = ({ navigation }: any) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [chatUsers, setChatUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const currentUser = auth.currentUser;

  useEffect(() => {
    if (currentUser) {
      fetchChatUsers(); // Load chat users when screen loads
    }
  }, [currentUser]);

  useEffect(() => {
    if (searchQuery.trim().length > 0) {
      fetchSearchResults(searchQuery);
    } else {
      setSearchResults([]); // Clear search results when input is empty
    }
  }, [searchQuery]);

  const fetchSearchResults = async (queryText: string) => {
    setLoading(true);
    const usersRef = collection(db, "users");

    try {
      const emailQuery = query(usersRef, where("email", "==", queryText.toLowerCase()));
      const usernameQuery = query(usersRef, where("username", "==", queryText.toLowerCase()));

      const emailResults = await getDocs(emailQuery);
      const usernameResults = await getDocs(usernameQuery);
      const combinedResults = [...emailResults.docs, ...usernameResults.docs];

      setSearchResults(combinedResults.map((doc) => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      console.error("Error searching users:", error);
    }
    setLoading(false);
  };

  const fetchChatUsers = () => {
    if (!currentUser) return;

    const chatRef = collection(db, "chats");
    const chatQuery = query(chatRef, where("users", "array-contains", currentUser.uid), orderBy("timestamp", "desc"));

    onSnapshot(chatQuery, async (snapshot) => {
      const chatList = await Promise.all(
        snapshot.docs.map(async (doc) => {
          const chatData = doc.data();
          const otherUserId = chatData.users.find((id: string) => id !== currentUser.uid);

          if (otherUserId) {
            const userDoc = await getDocs(query(collection(db, "users"), where("uid", "==", otherUserId)));
            if (!userDoc.empty) {
              const user = userDoc.docs[0].data();
              return {
                id: otherUserId,
                name: user.name || "Unknown User",
                username: user.username || "",
                profileImage: user.profileImage || "",
                lastMessage: chatData.lastMessage || "",
              };
            }
          }
          return null;
        })
      );

      setChatUsers(chatList.filter((user) => user !== null)); // Remove any null entries
    });
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      Alert.alert("Success", "Logged out successfully!");
      navigation.replace("Login"); // Redirect to Login screen
    } catch (error) {
      Alert.alert("Error", "Logout failed. Please try again.");
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#ffffff" barStyle="dark-content" />
      <View style={styles.header}>
        <Text style={styles.title}>Chats</Text>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          placeholder="Search by email or username"
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={styles.input}
          placeholderTextColor="#666"
        />
      </View>

      <FlatList
        data={searchQuery ? [...chatUsers, ...searchResults.filter(result => 
          !chatUsers.some(chat => chat.id === result.id)
        )] : chatUsers}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.userItem}
            onPress={() => navigation.navigate("Chat", { userId: item.id })}
          >
            <Image
              source={item.profileImage ? { uri: item.profileImage } : require("../assets/avatar-placeholder.png")}
              style={styles.profileImage}
            />
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{item.name || "Unknown User"}</Text>
              <Text style={styles.userEmail}>
                {item.lastMessage ? item.lastMessage : 
                  searchQuery ? `@${item.username}` : `@${item.username}`}
              </Text>
            </View>
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.listContainer}
      />

      {loading && <Text style={styles.loadingText}>Loading...</Text>}

      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={[styles.profileButton, styles.button]} 
          onPress={() => navigation.navigate("Profile")}
        >
          <MaterialIcons name="person" size={22} color="#ffffff" style={styles.buttonIcon} />
          <Text style={styles.buttonText}>Profile</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.settingsButton, styles.button]} 
          onPress={() => navigation.navigate("Settings")}
        >
          <MaterialIcons name="settings" size={22} color="#ffffff" style={styles.buttonIcon} />
          <Text style={styles.buttonText}>Settings</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  header: {
    padding: 20,
    paddingTop: 40,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#2E7D32", // Dark green
  },
  searchContainer: {
    padding: 15,
    backgroundColor: "#ffffff",
  },
  input: {
    width: "100%",
    padding: 15,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 12,
    backgroundColor: "#f8f8f8",
    fontSize: 16,
    color: "#333",
  },
  listContainer: {
    padding: 15,
  },
  userItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  profileImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 15,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: "#666",
  },
  loadingText: {
    textAlign: "center",
    marginTop: 10,
    color: "#666",
    fontSize: 16,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 15,
    backgroundColor: "#ffffff",
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    gap: 10,
  },
  button: {
    flex: 1,
    padding: 12,
    borderRadius: 6,
    alignItems: "center",
    flexDirection: 'row',
    justifyContent: 'center',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  buttonIcon: {
    marginRight: 6,
  },
  buttonText: {
    color: "#ffffff",
    fontWeight: "600",
    fontSize: 15,
  },
  profileButton: {
    backgroundColor: "#2E7D32", // Green
  },
  settingsButton: {
    backgroundColor: "#1976D2", // Blue
  }
});

export default HomeScreen;
