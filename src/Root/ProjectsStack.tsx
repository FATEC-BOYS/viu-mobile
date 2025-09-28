// src/Root/ProjectsStack.tsx
import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useTheme } from "../theme/ThemeProvider";

import ProjectsScreen from "../screens/projetos/ProjectsScreen";
import ProjectDetails from "../screens/projetos/ProjectDetails";
import { AppHeader } from "../components/AppHeader";

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
        // Reaproveita o AppHeader nas telas internas
        header: () => <AppHeader title="Projetos" />,
        contentStyle: { backgroundColor: t.colors.background },
      }}
    >
      <Stack.Screen
        name="ProjectsList"
        component={ProjectsScreen}
        // O header base já mostra "Projetos", então não precisa sobrescrever
      />

      <Stack.Screen
        name="Project"
        component={ProjectDetails}
        // Título dinâmico com nome do projeto
        options={({ route }) => ({
          header: () => <AppHeader title={route.params.nome || "Projeto"} />,
        })}
      />
    </Stack.Navigator>
  );
}
