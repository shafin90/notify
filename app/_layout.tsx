import { createStackNavigator } from "@react-navigation/stack";
import { NavigationContainer } from "@react-navigation/native";
import { AuthProvider } from "../context/AuthContext";
import LoginScreen from "./login";
import RegisterScreen from "./register";
import HomeScreen from "./home";  // ✅ Import Home Screen
import ChatScreen from "./chat";  // ✅ Import Chat Screen
import ProfileScreen from "./profile";

const Stack = createStackNavigator();

export default function RootLayout() {
  return (
    <AuthProvider>
      {/* <NavigationContainer> */}
        <Stack.Navigator>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="Chat" component={ChatScreen} />
          <Stack.Screen name="Profile" component={ProfileScreen} />
        </Stack.Navigator>
      {/* </NavigationContainer> */}
    </AuthProvider>
  );
}
