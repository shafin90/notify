import { createStackNavigator } from "@react-navigation/stack";
import { AuthProvider } from "../context/AuthContext";
import LoginScreen from "./login";
import RegisterScreen from "./register";
import HomeScreen from "./home";  // ✅ Import Home Screen
import ChatScreen from "./chat";  // ✅ Import Chat Screen
import ProfileScreen from "./profile";
import FriendsProfileScreen from "./friendsProfile";
import SettingsScreen from "./settings";

const Stack = createStackNavigator();

export default function RootLayout() {
  return (
    <AuthProvider>
      <Stack.Navigator>
        <Stack.Screen name="Login" component={LoginScreen}
        
        options={{
          headerShown: false,
          gestureEnabled: false
        }}
        />
        <Stack.Screen name="Register" component={RegisterScreen} 
        options={{
          headerShown: false,
          gestureEnabled: false
        }}
        />
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{
            headerShown: false,
            gestureEnabled: false
          }}
        />
        <Stack.Screen name="Chat" component={ChatScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Profile" component={ProfileScreen}
          options={{
            headerShown: false,
            gestureEnabled: false
          }}

        />
        <Stack.Screen name="FriendsProfile" component={FriendsProfileScreen} />
        <Stack.Screen 
          name="Settings" 
          component={SettingsScreen}
          options={{
            headerShown: true,
            title: 'Settings',
            headerStyle: {
              backgroundColor: '#fff',
            },
            headerTintColor: '#333',
            headerTitleStyle: {
              fontWeight: '600',
            },
          }}
        />
      </Stack.Navigator>
    </AuthProvider>
  );
}
