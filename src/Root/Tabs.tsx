// src/Root/Tabs.tsx
import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useTheme } from "../theme/ThemeProvider";
import { useCounters } from "../hooks/useCounters";

// telas
import HomeScreen from "../screens/dashboard/HomeScreen";
import ProjectsStack from "./ProjectsStack";          
import ArtsStack from "./ArtsStack";
import TasksScreen from "../screens/tarefas/TasksScreen";      
import NotificationsScreen from "../screens/notificacoes/NotificationsScreen"; 

// Tipagem das tabs (opcional mas recomendado)
export type AppTabParamList = {
  Dashboard: undefined;
  Projetos: undefined;
  Artes: undefined;
  Tarefas: undefined;
  Notificações: undefined;
};

const Tab = createBottomTabNavigator<AppTabParamList>();

export default function Tabs() {
  const { t } = useTheme();
  const c = useCounters();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: t.colors.primary,
        tabBarInactiveTintColor: t.colors.mutedForeground,
        tabBarStyle: { backgroundColor: t.colors.background, borderTopColor: t.colors.border },
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ color, size }) => <Ionicons name="grid-outline" size={size} color={color} />,
          tabBarLabel: "Dashboard",
        }}
      />

      <Tab.Screen
        name="Projetos"
        component={ProjectsStack} // ✅ usa o stack (lista + detalhe)
        options={{
          tabBarIcon: ({ color, size }) => <MaterialIcons name="folder-open" size={size} color={color} />,
          tabBarBadge: c.projetsVencendo ? Math.min(c.projetsVencendo, 99) : undefined,
        }}
      />

      <Tab.Screen
        name="Artes"
        component={ArtsStack}
        options={{
          tabBarIcon: ({ color, size }) => <Ionicons name="image-outline" size={size} color={color} />,
        }}
      />

      <Tab.Screen
        name="Tarefas"
        component={TasksScreen}
        options={{
          tabBarIcon: ({ color, size }) => <Ionicons name="checkbox-outline" size={size} color={color} />,
          tabBarBadge: c.tarefasPendentes ? Math.min(c.tarefasPendentes, 99) : undefined,
        }}
      />

      <Tab.Screen
        name="Notificações"
        component={NotificationsScreen}
        options={{
          tabBarIcon: ({ color, size }) => <Ionicons name="notifications-outline" size={size} color={color} />,
          tabBarBadge: c.notificacoesNaoLidas ? Math.min(c.notificacoesNaoLidas, 99) : undefined,
        }}
      />
    </Tab.Navigator>
  );
}
