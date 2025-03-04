import React, { useState } from "react";
import { View, TextInput, Button, Text, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { setDoc, doc } from "firebase/firestore";
import { auth, db } from "../constants/firebaseConfig";
import { COLORS, SIZES } from "../constants/theme";

const RegisterScreen = ({ navigation }: any) => {
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleRegister = async () => {
    if (!name.trim() || !username.trim() || !email.trim() || !password.trim()) {
      alert("All fields are required!");
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        name: name,
        email: email.toLowerCase(),
        username: username.toLowerCase(),
        bio: "Hey there! I'm using this app.",
        profileImage: "", // Empty initially
      });

      alert("Account created successfully!");
      navigation.navigate("Login"); // Navigate to Login screen
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create an Account</Text>

      <TextInput placeholder="Full Name" value={name} onChangeText={setName} style={styles.input} />
      <TextInput placeholder="Username" value={username} onChangeText={setUsername} style={styles.input} />
      <TextInput placeholder="Email" value={email} onChangeText={setEmail} style={styles.input} />
      <TextInput placeholder="Password" secureTextEntry value={password} onChangeText={setPassword} style={styles.input} />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TouchableOpacity style={styles.button} onPress={handleRegister}>
        <Text style={styles.buttonText}>Register</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate("Login")}>
        <Text style={styles.link}>Already have an account? Login</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: COLORS.secondary, padding: SIZES.padding },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 20, color: COLORS.text },
  input: { width: "100%", padding: 12, borderWidth: 1, borderColor: COLORS.textSecondary, borderRadius: SIZES.borderRadius, marginBottom: 10, backgroundColor: COLORS.white },
  button: { backgroundColor: COLORS.primary, padding: 12, borderRadius: SIZES.borderRadius, width: "100%", alignItems: "center", marginTop: 10 },
  buttonText: { color: COLORS.white, fontWeight: "bold" },
  link: { color: COLORS.primary, marginTop: 10 },
  error: { color: COLORS.error },
});

export default RegisterScreen;
