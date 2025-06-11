import React, { useEffect, useState } from "react";
import { View, Text, TextInput, Image, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, ScrollView, StatusBar, Modal } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { doc, getDoc, setDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db, auth } from "../constants/firebaseConfig";
import { MaterialIcons } from '@expo/vector-icons';

const IMAGE_BB_API_KEY = "a237535b7fbf5b30479eaa33f84bc462"; // 🔥 Replace with your ImageBB API Key

// Separate EditProfileModal component
const EditProfileModal = ({ 
  visible, 
  onClose, 
  initialData,
  onSave,
  isSaving
}: { 
  visible: boolean; 
  onClose: () => void; 
  initialData: {
    name: string;
    username: string;
    bio: string;
    profileImage: string;
  };
  onSave: (data: any) => void;
  isSaving: boolean;
}) => {
  const [name, setName] = useState(initialData.name);
  const [username, setUsername] = useState(initialData.username);
  const [bio, setBio] = useState(initialData.bio);
  const [profileImage, setProfileImage] = useState(initialData.profileImage);
  const [loading, setLoading] = useState(false);

  // Reset form when modal opens with new data
  useEffect(() => {
    if (visible) {
      setName(initialData.name);
      setUsername(initialData.username);
      setBio(initialData.bio);
      setProfileImage(initialData.profileImage);
    }
  }, [visible, initialData]);

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
        Alert.alert("Error", "Image upload failed");
      }
    } catch (error) {
      console.error("Upload error:", error);
      Alert.alert("Error", "Image upload failed");
    }
    setLoading(false);
  };

  const handleSave = () => {
    onSave({
      name,
      username,
      bio,
      profileImage
    });
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Edit Profile</Text>
            <TouchableOpacity onPress={onClose} disabled={isSaving}>
              <MaterialIcons name="close" size={24} color={isSaving ? "#999" : "#333"} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalScroll}>
            <View style={styles.profileSection}>
              <TouchableOpacity onPress={pickImage} style={styles.imageContainer}>
                <Image 
                  source={profileImage ? { uri: profileImage } : require("../assets/avatar-placeholder.png")} 
                  style={styles.profileImage} 
                />
                <View style={styles.editIconContainer}>
                  <MaterialIcons name="camera-alt" size={20} color="#fff" />
                </View>
                {loading && (
                  <View style={styles.loadingOverlay}>
                    <ActivityIndicator size="large" color="#2E7D32" />
                  </View>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.formContainer}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Name</Text>
                <View style={styles.inputWrapper}>
                  <MaterialIcons name="person" size={20} color="#666" style={styles.inputIcon} />
                  <TextInput 
                    placeholder="Your name" 
                    value={name} 
                    onChangeText={setName} 
                    style={styles.input}
                    placeholderTextColor="#999"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Username</Text>
                <View style={styles.inputWrapper}>
                  <MaterialIcons name="alternate-email" size={20} color="#666" style={styles.inputIcon} />
                  <TextInput 
                    placeholder="Your username" 
                    value={username} 
                    onChangeText={setUsername} 
                    style={styles.input}
                    placeholderTextColor="#999"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Bio</Text>
                <View style={styles.inputWrapper}>
                  <MaterialIcons name="description" size={20} color="#666" style={styles.inputIcon} />
                  <TextInput 
                    placeholder="Tell us about yourself" 
                    value={bio} 
                    onChangeText={setBio} 
                    style={[styles.input, styles.bioInput]}
                    multiline
                    numberOfLines={3}
                    placeholderTextColor="#999"
                  />
                </View>
              </View>

              <TouchableOpacity 
                style={[styles.saveButton, isSaving && styles.saveButtonDisabled]} 
                onPress={handleSave}
                disabled={isSaving}
              >
                {isSaving ? (
                  <View style={styles.saveButtonContent}>
                    <ActivityIndicator color="#ffffff" size="small" />
                    <Text style={[styles.saveButtonText, styles.saveButtonTextWithLoader]}>Saving...</Text>
                  </View>
                ) : (
                  <Text style={styles.saveButtonText}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const ProfileScreen = ({ navigation }: any) => {
  const user = auth.currentUser;
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [email, setEmail] = useState(user?.email || "");
  const [profileImage, setProfileImage] = useState("");
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

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

  const handleSaveProfile = async (data: any) => {
    if (!user) return;
    setIsSaving(true);

    try {
      // Check username uniqueness
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("username", "==", data.username));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty && querySnapshot.docs[0].id !== user.uid) {
        Alert.alert("Error", "Username already taken. Please choose another.");
        return;
      }

      // Update user profile
      const userRef = doc(db, "users", user.uid);
      await setDoc(userRef, {
        name: data.name,
        username: data.username,
        bio: data.bio,
        profileImage: data.profileImage,
        email,
      }, { merge: true });

      // Update local state
      setName(data.name);
      setUsername(data.username);
      setBio(data.bio);
      setProfileImage(data.profileImage);

      Alert.alert("Success", "Profile updated successfully!");
      setIsEditModalVisible(false);
    } catch (error) {
      Alert.alert("Error", "Failed to update profile. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#ffffff" barStyle="dark-content" />
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <MaterialIcons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.title}>Profile</Text>
          <TouchableOpacity 
            style={styles.editButton}
            onPress={() => setIsEditModalVisible(true)}
          >
            <MaterialIcons name="edit" size={24} color="#2E7D32" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.settingsButton}
            onPress={() => navigation.navigate('Settings')}
          >
            <MaterialIcons name="settings" size={24} color="#333" />
          </TouchableOpacity>
        </View>

        <View style={styles.profileSection}>
          <Image 
            source={profileImage ? { uri: profileImage } : require("../assets/avatar-placeholder.png")} 
            style={styles.profileImage} 
          />
        </View>

        <View style={styles.infoContainer}>
          <View style={styles.infoItem}>
            <MaterialIcons name="person" size={24} color="#2E7D32" style={styles.infoIcon} />
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoLabel}>Name</Text>
              <Text style={styles.infoValue}>{name || "Not set"}</Text>
            </View>
          </View>

          <View style={styles.infoItem}>
            <MaterialIcons name="alternate-email" size={24} color="#2E7D32" style={styles.infoIcon} />
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoLabel}>Username</Text>
              <Text style={styles.infoValue}>{username ? `@${username}` : "Not set"}</Text>
            </View>
          </View>

          <View style={styles.infoItem}>
            <MaterialIcons name="description" size={24} color="#2E7D32" style={styles.infoIcon} />
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoLabel}>Bio</Text>
              <Text style={styles.infoValue}>{bio || "No bio yet"}</Text>
            </View>
          </View>

          <View style={styles.infoItem}>
            <MaterialIcons name="email" size={24} color="#2E7D32" style={styles.infoIcon} />
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{email}</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      <EditProfileModal 
        visible={isEditModalVisible}
        onClose={() => setIsEditModalVisible(false)}
        initialData={{
          name,
          username,
          bio,
          profileImage
        }}
        onSave={handleSaveProfile}
        isSaving={isSaving}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 16,
    paddingTop: 48,
  },
  backButton: {
    padding: 5,
  },
  editButton: {
    padding: 5,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#333",
  },
  profileSection: {
    alignItems: "center",
    paddingVertical: 20,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: "#2E7D32",
  },
  infoContainer: {
    padding: 20,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  infoIcon: {
    marginRight: 15,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    color: "#333",
    fontWeight: "500",
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    minHeight: '80%',
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#333",
  },
  modalScroll: {
    flex: 1,
  },
  imageContainer: {
    position: 'relative',
  },
  editIconContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: "#2E7D32",
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: "#ffffff",
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  formContainer: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: "#f8f8f8",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  inputIcon: {
    padding: 12,
  },
  input: {
    flex: 1,
    padding: 12,
    fontSize: 16,
    color: "#333",
  },
  bioInput: {
    height: 100,
    textAlignVertical: 'top',
  },
  saveButton: {
    backgroundColor: "#2E7D32",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  saveButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonTextWithLoader: {
    marginLeft: 8,
  },
  settingsButton: {
    padding: 8,
  },
});

export default ProfileScreen;
