import React, { useState } from "react";
import { View, TextInput, Text, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../constants/firebaseConfig"; // Import Firebase
import { COLORS, SIZES } from "../constants/theme";
import { doc, setDoc } from "firebase/firestore";

const RegisterScreen = ({ navigation }: any) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleRegister = async () => {
    try {
      // Create user in Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Store user info in Firestore
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        email: user.email,
        createdAt: new Date(),
      });

      Alert.alert("Success", "Account created successfully!");
      navigation.navigate("Login"); // Navigate to Login screen
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <View style={styles.container}> 
      <Text style={styles.title}>Create an Account</Text>
      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        style={styles.input}
      />
      <TextInput
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        style={styles.input}
      />
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
  link: {
    color: COLORS.primary,
    marginTop: 10,
  },
  error: {
    color: COLORS.error,
    marginTop: 10,
  },
});

export default RegisterScreen;
