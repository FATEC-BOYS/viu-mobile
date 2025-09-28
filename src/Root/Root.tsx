// src/Root/Root.tsx
import React, { useMemo } from "react";
import { NavigationContainer, DefaultTheme, Theme as NavTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import * as Linking from "expo-linking";
import { useAuth } from "../contexts/AuthContext";

import OnboardingScreen from "../screens/OnboardingScreen";
import LoginScreen from "../screens/LoginScreen";
import SignupScreen from "../screens/SignupScreen";
import RecoverScreen from "../screens/RecoverScreen";
import AuthCallbackScreen from "../screens/AuthCallbackScreen";
import ResetPasswordScreen from "../screens/ResetPasswordScreen";
import AppShell from "./AppShell";
import { useTheme } from "../theme/ThemeProvider";

export type RootStackParamList = {
  AppShell: undefined;

  Onboarding: undefined;
  Login: undefined;
  Signup: undefined;
  Recover: undefined;
  AuthCallback: { code?: string; token_hash?: string; type?: string; next?: string } | undefined;
  ResetPassword: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function Root() {
  const { session, loading } = useAuth();
  const { t, mode } = useTheme();

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

  // Deep linking (ajuste seu scheme no app.json/app.config)
  const prefix = Linking.createURL("/"); // usa o scheme configurado (ex.: com.viu.app://)
  const linking = {
    prefixes: [prefix, "https://seu-dominio.com", "http://seu-dominio.com"],
    config: {
      screens: {
        // público
        Onboarding: "onboarding",
        Login: "login",
        Signup: "cadastro",
        Recover: "recuperar",
        ResetPassword: "reset",

        // callback de OAuth/magic link/recovery
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

        // logado
        AppShell: "app",
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
