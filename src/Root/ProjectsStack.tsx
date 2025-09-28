// src/Root/ProjectsStack.tsx
import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useTheme } from "../theme/ThemeProvider";

// telas da aba Projetos
import ProjectsScreen from "../screens/ProjectsScreen";      // lista
import ProjectDetails from "../screens/ProjectDetails";      // detalhe

export type ProjectsStackParamList = {
  ProjectsList: undefined;
  Project: { projetoId: string; nome: string };
};

const Stack = createNativeStackNavigator<ProjectsStackParamList>();

export default function ProjectsStack() {
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
      <Stack.Screen
        name="ProjectsList"
        component={ProjectsScreen}
        options={{ title: "Projetos" }}
      />

      <Stack.Screen
        name="Project"
        component={ProjectDetails}
        options={({ route }) => ({ title: route.params.nome || "Projeto" })}
      />
    </Stack.Navigator>
  );
}
