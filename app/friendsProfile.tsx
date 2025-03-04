import React, { useEffect, useState } from "react";
import { View, Text, Image, TouchableOpacity, StyleSheet } from "react-native";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../constants/firebaseConfig";
import { COLORS, SIZES } from "../constants/theme";

const FriendsProfileScreen = ({ route, navigation }: any) => {
  const { userId } = route.params;
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!userId) return;
      const userRef = doc(db, "users", userId);
      const docSnap = await getDoc(userRef);
      if (docSnap.exists()) setProfile(docSnap.data());
    };

    fetchProfile();
  }, [userId]);

  return (
    <View style={styles.container}>
      {profile ? (
        <>
          <Image
            source={profile.profileImage ? { uri: profile.profileImage } : require("../assets/avatar-placeholder.png")}
            style={styles.profileImage}
          />
          <Text style={styles.name}>{profile.name}</Text>
          <Text style={styles.username}>@{profile.username}</Text>
          <Text style={styles.bio}>{profile.bio}</Text>

          {/* Home Button */}
          <TouchableOpacity style={styles.button} onPress={() => navigation.navigate("Home")}>
            <Text style={styles.buttonText}>Home</Text>
          </TouchableOpacity>

          {/* Message Button */}
          <TouchableOpacity style={styles.messageButton} onPress={() => navigation.navigate("Chat", { userId })}>
            <Text style={styles.messageButtonText}>Message</Text>
          </TouchableOpacity>
        </>
      ) : (
        <Text>Loading profile...</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", padding: SIZES.padding, backgroundColor: COLORS.secondary },
  profileImage: { width: 100, height: 100, borderRadius: 50, marginBottom: 20 },
  name: { fontSize: 20, fontWeight: "bold", color: COLORS.text },
  username: { fontSize: 16, color: COLORS.textSecondary },
  bio: { fontSize: 14, marginTop: 10, color: COLORS.text },
  button: { marginTop: 20, padding: 12, backgroundColor: COLORS.primary, borderRadius: SIZES.borderRadius },
  buttonText: { color: COLORS.white, fontWeight: "bold" },
  messageButton: { marginTop: 10, padding: 12, backgroundColor: COLORS.accent, borderRadius: SIZES.borderRadius },
  messageButtonText: { color: COLORS.white, fontWeight: "bold" },
});

export default FriendsProfileScreen;
