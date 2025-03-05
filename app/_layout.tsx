import { createStackNavigator } from "@react-navigation/stack";
import { NavigationContainer } from "@react-navigation/native";
import { AuthProvider } from "../context/AuthContext";
import LoginScreen from "./login";
import RegisterScreen from "./register";
import HomeScreen from "./home";  // ✅ Import Home Screen
import ChatScreen from "./chat";  // ✅ Import Chat Screen
import ProfileScreen from "./profile";
import FriendsProfileScreen from "./friendsProfile";

const Stack = createStackNavigator();

export default function RootLayout() {
  return (
    <AuthProvider>
      {/* <NavigationContainer> */}
        <Stack.Navigator>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="Chat" component={ChatScreen} options={{ headerShown: false }}/>
          <Stack.Screen name="Profile" component={ProfileScreen} />
          <Stack.Screen name="FriendsProfile" component={FriendsProfileScreen} />
        </Stack.Navigator>
      {/* </NavigationContainer> */}
    </AuthProvider>
  );
}
