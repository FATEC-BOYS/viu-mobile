// src/Root/Root.tsx
import React, { useMemo } from "react";
import {
  NavigationContainer,
  DefaultTheme,
  Theme as NavTheme,
  LinkingOptions,
} from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import * as Linking from "expo-linking";
import { useAuth } from "../contexts/AuthContext";

import OnboardingScreen from "../screens/auth/OnboardingScreen";
import LoginScreen from "../screens/auth/LoginScreen";
import SignupScreen from "../screens/auth/SignupScreen";
import RecoverScreen from "../screens/auth/RecoverScreen";
import AuthCallbackScreen from "../screens/auth/AuthCallbackScreen"; // <- corrigido
import ResetPasswordScreen from "../screens/auth/ResetPasswordScreen";
import AppShell from "./AppShell";
import { useTheme } from "../theme/ThemeProvider";

export type RootStackParamList = {
  AppShell: undefined;

  Onboarding: undefined;
  Login: undefined;
  Signup: undefined;
  Recover: undefined;
  AuthCallback:
    | { code?: string; token_hash?: string; type?: string; next?: string }
    | undefined;
  ResetPassword: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function Root() {
  const { session, loading } = useAuth();
  const { t } = useTheme();

  // Tema do navegador coerente com o ThemeProvider
  const navTheme: NavTheme = useMemo(
    () => ({
      ...DefaultTheme,
      colors: {
        ...DefaultTheme.colors,
        background: t.colors.background,
        card: t.colors.card,
        text: t.colors.foreground,
        border: t.colors.border,
        primary: t.colors.primary,
      },
    }),
    [t]
  );

  // Deep linking (defina "scheme": "viu" no app.json/app.config)
  const prefixes: string[] = [Linking.createURL("/"), "https://viu-frontend.vercel.app"];

  const linking: LinkingOptions<RootStackParamList> = {
    prefixes,
    config: {
      screens: {
        // público (paths espelhados do web)
        Onboarding: "onboarding",
        Login: "auth/login",
        Signup: "auth/cadastro",
        Recover: "auth/recuperar",
        ResetPassword: "auth/reset",
        AuthCallback: {
          path: "auth/callback",
          // permite query params: ?code=...&token_hash=...&type=...&next=/reset
          parse: {
            code: (v: string) => v,
            token_hash: (v: string) => v,
            type: (v: string) => v,
            next: (v: string) => v,
          },
        },

        // logado (base /dashboard; rotas internas podem ser detalhadas no AppShell)
        AppShell: {
          path: "dashboard",
        },
      },
    },
  };

  if (loading) return null;

  return (
    <NavigationContainer theme={navTheme} linking={linking} fallback={null}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {session ? (
          <Stack.Screen name="AppShell" component={AppShell} />
        ) : (
          <>
            <Stack.Screen name="Onboarding" component={OnboardingScreen} />
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Signup" component={SignupScreen} />
            <Stack.Screen name="Recover" component={RecoverScreen} />
            <Stack.Screen name="AuthCallback" component={AuthCallbackScreen} />
            <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
