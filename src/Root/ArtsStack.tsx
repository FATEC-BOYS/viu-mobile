import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useTheme } from "../theme/ThemeProvider";

import ArtsList from "../screens/ArtsList";        // lista (placeholder)
import ArtDetails from "../screens/ArtDetails";    // detalhe (seu arquivo renomeado)

export type ArtsStackParamList = {
  ArtsList: undefined;
  Art: { arteId: string; titulo?: string };
};

const Stack = createNativeStackNavigator<ArtsStackParamList>();

export default function ArtsStack() {
  const { t } = useTheme();
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: t.colors.card },
        headerTintColor: t.colors.foreground,
        headerTitleStyle: { color: t.colors.foreground },
        contentStyle: { backgroundColor: t.colors.background },
      }}
    >
      <Stack.Screen name="ArtsList" component={ArtsList} options={{ title: "Artes" }} />
      <Stack.Screen
        name="Art"
        component={ArtDetails}
        options={({ route }) => ({ title: route.params.titulo ?? "Arte" })}
      />
    </Stack.Navigator>
  );
}
