import type { ComponentType } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/tokens';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import ClientDashboardScreen from '../screens/ClientDashboardScreen';
import CoachDashboardScreen from '../screens/CoachDashboardScreen';
import ModeratorDashboardScreen from '../screens/ModeratorDashboardScreen';
import AdminDashboardScreen from '../screens/AdminDashboardScreen';

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const AppStack = createNativeStackNavigator();

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
    </AuthStack.Navigator>
  );
}

// CLIENT -> ClientDashboardScreen, COACH -> CoachDashboardScreen,
// MODERATOR -> ModeratorDashboardScreen, ADMIN -> AdminDashboardScreen
// (see STATUS.md "Décisions actées" — rôle renvoyé par /api/auth/login).
const DASHBOARD_BY_ROLE: Record<string, ComponentType> = {
  CLIENT: ClientDashboardScreen,
  COACH: CoachDashboardScreen,
  MODERATOR: ModeratorDashboardScreen,
  ADMIN: AdminDashboardScreen,
};

function AppNavigator({ role }: { role: string }) {
  const DashboardScreen = DASHBOARD_BY_ROLE[role] ?? ClientDashboardScreen;
  return (
    <AppStack.Navigator screenOptions={{ headerShown: false }}>
      <AppStack.Screen name="Dashboard" component={DashboardScreen} />
    </AppStack.Navigator>
  );
}

export default function RootNavigator() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator color={colors.brand} size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {user === null ? <AuthNavigator /> : <AppNavigator role={user.role} />}
    </NavigationContainer>
  );
}
