import React, { useEffect, useState } from "react";
import { View, Text, TextInput, Image, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { doc, getDoc, setDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db, auth } from "../constants/firebaseConfig";
import { COLORS, SIZES } from "../constants/theme";

const IMAGE_BB_API_KEY = "a237535b7fbf5b30479eaa33f84bc462"; // 🔥 Replace with your ImageBB API Key

const ProfileScreen = ({ navigation }: any) => {
  const user = auth.currentUser;
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [email, setEmail] = useState(user?.email || "");
  const [profileImage, setProfileImage] = useState("");
  const [loading, setLoading] = useState(false);

  // Fetch user data when screen loads
  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) return;
      const userRef = doc(db, "users", user.uid);
      const docSnap = await getDoc(userRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setName(data.name || "");
        setUsername(data.username || "");
        setBio(data.bio || "");
        setProfileImage(data.profileImage || "");
      }
    };

    fetchUserData();
  }, []);

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
    setLoading(true);
    const formData = new FormData();
    formData.append("image", {
      uri: imageUri,
      type: "image/jpeg",
      name: "profile.jpg",
    } as any);

    try {
      const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMAGE_BB_API_KEY}`, {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      if (data.success) {
        setProfileImage(data.data.url);
      } else {
        alert("Image upload failed");
      }
    } catch (error) {
      console.error("Upload error:", error);
      alert("Image upload failed");
    }
    setLoading(false);
  };

  const updateProfile = async () => {
    if (!user) return;

    // 🔥 Ensure username is unique
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("username", "==", username));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty && querySnapshot.docs[0].id !== user.uid) {
      Alert.alert("Error", "Username already taken. Please choose another.");
      return;
    }

    // 🔥 Update user profile
    const userRef = doc(db, "users", user.uid);
    await setDoc(userRef, {
      name,
      username,
      bio,
      profileImage,
      email, // 🔒 Email remains the same
    }, { merge: true });

    alert("Profile updated successfully!");
    navigation.navigate("Home")
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Edit Profile</Text>

      <TouchableOpacity onPress={pickImage}>
        <Image source={profileImage ? { uri: profileImage } : require("../assets/avatar-placeholder.png")} style={styles.profileImage} />
        {loading && <ActivityIndicator size="small" color={COLORS.primary} />}
      </TouchableOpacity>

      <TextInput placeholder="Name" value={name} onChangeText={setName} style={styles.input} />
      <TextInput placeholder="Username" value={username} onChangeText={setUsername} style={styles.input} />
      <TextInput placeholder="Bio" value={bio} onChangeText={setBio} style={styles.input} />
      <TextInput placeholder="Email" value={email} style={styles.input} editable={false} /> {/* Email is non-editable */}

      <TouchableOpacity style={styles.button} onPress={updateProfile}>
        <Text style={styles.buttonText}>Save Profile</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.secondary,
    padding: SIZES.padding,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    color: COLORS.text,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 20,
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
  button: {
    backgroundColor: COLORS.primary,
    padding: 12,
    borderRadius: SIZES.borderRadius,
    width: "100%",
    alignItems: "center",
    marginTop: 10,
  },
  buttonText: {
    color: COLORS.white,
    fontWeight: "bold",
  },
});

export default ProfileScreen;
