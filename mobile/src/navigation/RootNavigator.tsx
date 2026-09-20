import type { ComponentType } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/tokens';
import type { PendingPaymentProof } from '../api/payments';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import VerifyOtpScreen from '../screens/VerifyOtpScreen';
import ClientDashboardScreen from '../screens/ClientDashboardScreen';
import ChooseFormulaScreen from '../screens/ChooseFormulaScreen';
import PaymentInstructionsScreen from '../screens/PaymentInstructionsScreen';
import UploadProofScreen from '../screens/UploadProofScreen';
import PaymentStatusScreen from '../screens/PaymentStatusScreen';
import CoachDashboardScreen from '../screens/CoachDashboardScreen';
import ModeratorDashboardScreen from '../screens/ModeratorDashboardScreen';
import PaymentReviewScreen from '../screens/PaymentReviewScreen';
import AdminDashboardScreen from '../screens/AdminDashboardScreen';

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  VerifyOtp: { phone: string };
};

type PaymentFlowParams = { subscriptionId: string; amount: number; planName: string };

export type ClientStackParamList = {
  ClientDashboard: undefined;
  ChooseFormula: undefined;
  PaymentInstructions: PaymentFlowParams;
  UploadProof: PaymentFlowParams;
  PaymentStatus: PaymentFlowParams;
};

// No GET /payments/:id endpoint exists server-side — only the list
// (GET /payments/pending) and the screenshot route. PaymentReview therefore
// receives the full proof object straight from the list instead of an id to
// re-fetch (see api/payments.ts PendingPaymentProof).
export type ModeratorStackParamList = {
  ModeratorDashboard: undefined;
  PaymentReview: { proof: PendingPaymentProof };
};

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const ClientStack = createNativeStackNavigator<ClientStackParamList>();
const ModeratorStack = createNativeStackNavigator<ModeratorStackParamList>();
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
      <ClientStack.Screen name="UploadProof" component={UploadProofScreen} options={{ title: 'Preuve de paiement' }} />
      <ClientStack.Screen name="PaymentStatus" component={PaymentStatusScreen} options={{ title: 'Statut', headerBackVisible: false }} />
    </ClientStack.Navigator>
  );
}

function ModeratorNavigator() {
  return (
    <ModeratorStack.Navigator screenOptions={darkHeaderOptions}>
      <ModeratorStack.Screen
        name="ModeratorDashboard"
        component={ModeratorDashboardScreen}
        options={{ title: 'File de modération' }}
      />
      <ModeratorStack.Screen
        name="PaymentReview"
        component={PaymentReviewScreen}
        options={{ title: 'Vérification du paiement' }}
      />
    </ModeratorStack.Navigator>
  );
}

// COACH -> CoachDashboardScreen, ADMIN -> AdminDashboardScreen (see
// STATUS.md "Décisions actées" — rôle renvoyé par /auth/login). CLIENT and
// MODERATOR get their own multi-screen navigators instead of a single
// dashboard screen.
const DASHBOARD_BY_ROLE: Record<string, ComponentType> = {
  COACH: CoachDashboardScreen,
  ADMIN: AdminDashboardScreen,
};

function AppNavigator({ role }: { role: string }) {
  if (role === 'CLIENT') {
    return <ClientNavigator />;
  }
  if (role === 'MODERATOR') {
    return <ModeratorNavigator />;
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
