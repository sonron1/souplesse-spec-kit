import type { ComponentType } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/tokens';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import VerifyOtpScreen from '../screens/VerifyOtpScreen';
import ClientDashboardScreen from '../screens/ClientDashboardScreen';
import ChooseFormulaScreen from '../screens/ChooseFormulaScreen';
import PaymentInstructionsScreen from '../screens/PaymentInstructionsScreen';
import CoachDashboardScreen from '../screens/CoachDashboardScreen';
import ModeratorDashboardScreen from '../screens/ModeratorDashboardScreen';
import AdminDashboardScreen from '../screens/AdminDashboardScreen';

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  VerifyOtp: { phone: string };
};

// Grows through handoff.md's mobile plan: UploadProof (bloc 5) will be added
// next, PaymentInstructions already carries the subscriptionId it will need.
export type ClientStackParamList = {
  ClientDashboard: undefined;
  ChooseFormula: undefined;
  PaymentInstructions: { subscriptionId: string; amount: number; planName: string };
};

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const ClientStack = createNativeStackNavigator<ClientStackParamList>();
const AppStack = createNativeStackNavigator();

const darkHeaderOptions = {
  headerStyle: { backgroundColor: colors.bg },
  headerTintColor: colors.text,
  headerShadowVisible: false,
} as const;

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
      <AuthStack.Screen name="VerifyOtp" component={VerifyOtpScreen} />
    </AuthStack.Navigator>
  );
}

function ClientNavigator() {
  return (
    <ClientStack.Navigator screenOptions={darkHeaderOptions}>
      <ClientStack.Screen name="ClientDashboard" component={ClientDashboardScreen} options={{ headerShown: false }} />
      <ClientStack.Screen name="ChooseFormula" component={ChooseFormulaScreen} options={{ title: 'Choisir une formule' }} />
      <ClientStack.Screen
        name="PaymentInstructions"
        component={PaymentInstructionsScreen}
        options={{ title: 'Paiement' }}
      />
    </ClientStack.Navigator>
  );
}

// COACH -> CoachDashboardScreen, MODERATOR -> ModeratorDashboardScreen,
// ADMIN -> AdminDashboardScreen (see STATUS.md "Décisions actées" — rôle
// renvoyé par /auth/login). CLIENT gets its own multi-screen ClientNavigator
// instead of a single dashboard screen (subscription flow, blocs 3+).
const DASHBOARD_BY_ROLE: Record<string, ComponentType> = {
  COACH: CoachDashboardScreen,
  MODERATOR: ModeratorDashboardScreen,
  ADMIN: AdminDashboardScreen,
};

function AppNavigator({ role }: { role: string }) {
  if (role === 'CLIENT') {
    return <ClientNavigator />;
  }
  const DashboardScreen = DASHBOARD_BY_ROLE[role] ?? CoachDashboardScreen;
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
