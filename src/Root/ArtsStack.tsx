// src/Root/ArtsStack.tsx
import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useTheme } from "../theme/ThemeProvider";

import ArtsList from "../screens/artes/ArtsList";
import ArtDetails from "../screens/artes/ArtDetails";
import { AppHeader } from "../components/AppHeader";

export type ArtesStackParamList = {
  Artes: undefined;
  ArteDetails: { id: string; titulo?: string };
};

const Stack = createNativeStackNavigator<ArtesStackParamList>();

export default function ArtsStack() {
  const { t } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
        // usa o AppHeader como header base
        header: () => <AppHeader title="Artes" />,
        contentStyle: { backgroundColor: t.colors.background },
      }}
    >
      <Stack.Screen
        name="Artes"
        component={ArtsList}
        // como o header padrão já é o AppHeader com título "Artes",
        // não precisamos sobrescrever aqui
      />
      <Stack.Screen
        name="ArteDetails"
        component={ArtDetails}
        // sobrescreve o header para título dinâmico
        options={({ route }) => ({
          header: () => <AppHeader title={route.params.titulo ?? "Arte"} />,
        })}
      />
    </Stack.Navigator>
  );
}
