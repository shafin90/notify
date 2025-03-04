import { createStackNavigator } from "@react-navigation/stack";
import { AuthProvider } from "../context/AuthContext";
import LoginScreen from "./login";
import RegisterScreen from "./register";
import HomeScreen from "./home";

const Stack = createStackNavigator();

export default function RootLayout() {
  return (
    <AuthProvider>
      <Stack.Navigator>
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen name="Home" component={HomeScreen} />
      </Stack.Navigator>
    </AuthProvider>
  );
}
