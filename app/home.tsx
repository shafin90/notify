import React, { useState, useEffect } from "react";
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, Image, Alert } from "react-native";
import { collection, query, where, getDocs } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { db, auth } from "../constants/firebaseConfig";
import { COLORS, SIZES } from "../constants/theme";

const HomeScreen = ({ navigation }: any) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (searchQuery.trim().length > 0) {
      fetchSearchResults(searchQuery);
    } else {
      setSearchResults([]); // Clear results when input is empty
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
      <Text style={styles.title}>Find Friends</Text>

      <TextInput
        placeholder="Search by email or username"
        value={searchQuery}
        onChangeText={setSearchQuery}
        style={styles.input}
      />

      <FlatList
        data={searchResults}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.userItem} onPress={() => navigation.navigate("Profile", { userId: item.id })}>
            <Image
              source={item.profileImage ? { uri: item.profileImage } : require("../assets/avatar-placeholder.png")}
              style={styles.profileImage}
            />
            <View>
              <Text style={styles.userName}>{item.name}</Text>
              <Text style={styles.userEmail}>@{item.username}</Text>
            </View>
          </TouchableOpacity>
        )}
      />

      {loading && <Text style={styles.loadingText}>Loading...</Text>}

      {/* My Profile Button */}
      <TouchableOpacity style={styles.profileButton} onPress={() => navigation.navigate("Profile")}>
        <Text style={styles.profileButtonText}>Go to My Profile</Text>
      </TouchableOpacity>

      {/* Logout Button */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutButtonText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.secondary,
    padding: SIZES.padding,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 10,
    color: COLORS.text,
  },
  input: {
    width: "100%",
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.textSecondary,
    borderRadius: SIZES.borderRadius,
    marginBottom: 10,
    backgroundColor: COLORS.white,
  },
  userItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.white,
    padding: 12,
    borderRadius: SIZES.borderRadius,
    marginBottom: 8,
  },
  profileImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  userName: {
    fontSize: 16,
    color: COLORS.text,
    fontWeight: "bold",
  },
  userEmail: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  loadingText: {
    textAlign: "center",
    marginTop: 10,
    color: COLORS.textSecondary,
  },
  profileButton: {
    backgroundColor: COLORS.primary,
    padding: 12,
    borderRadius: SIZES.borderRadius,
    alignItems: "center",
    marginTop: 20,
  },
  profileButtonText: {
    color: COLORS.white,
    fontWeight: "bold",
  },
  logoutButton: {
    backgroundColor: COLORS.error, // Red color for logout
    padding: 12,
    borderRadius: SIZES.borderRadius,
    alignItems: "center",
    marginTop: 10,
  },
  logoutButtonText: {
    color: COLORS.white,
    fontWeight: "bold",
  },
});

export default HomeScreen;
