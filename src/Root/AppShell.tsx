// src/Root/AppShell.tsx
import React, { useMemo } from "react";
import { SafeAreaView, View } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "../theme/ThemeProvider";
import { AppHeader } from "../components/AppHeader";
import { useNavigationState } from "@react-navigation/native";

// --------- Screens (ajuste caminhos conforme seu projeto) ---------
import HomeScreen from "../screens/dashboard/HomeScreen";

// Projetos
import ProjectsScreen from "../screens/projetos/ProjectsScreen";
import ProjectDetails from "../screens/projetos/ProjectDetails";
import TarefasScreen from "../screens/tarefas/TasksScreen";
import StatusScreen from "../screens/status/StatusScreen";
import LinksScreen from "../screens/links/LinksScreen";
import FeedbacksScreen from "../screens/feedbacks/FeedbacksScreen";
import FeedbackDetailsScreen from "../screens/feedbacks/FeedbackDetailsScreen";

// Artes
import ArtesScreen from "../screens/artes/ArtsList";
import ArteDetailsScreen from "../screens/artes/ArtDetails";

// Clientes
import ClientesScreen from "../screens/clientes/ClientesScreen";
import ClienteDetailsScreen from "../screens/clientes/ClienteDetailsScreen";

// Notificações
import NotificacoesScreen from "../screens/notificacoes/NotificationsScreen";

// Perfil
import PerfilScreen from "../screens/perfil/PerfilScreen";
import ConfiguracoesScreen from "../screens/configuracoes/ConfiguracoesScreen";

// ---------- Types ----------
export type TabParamList = {
  HomeTab: undefined;
  ProjetosTab: undefined;
  ArtesTab: undefined;
  ClientesTab: undefined;
  NotificacoesTab: undefined;
  PerfilTab: undefined;
};

export type HomeStackParamList = { Home: undefined };

export type ProjectsStackParamList = {
  ProjectsList: undefined;
  Project: { projetoId: string; nome: string };
  Tarefas: { projetoId?: string } | undefined;
  Status: { projetoId?: string } | undefined;
  Links: { projetoId?: string } | undefined;
  Feedbacks: { projetoId?: string } | undefined;
  FeedbackDetails: { id: string };
};

export type ArtesStackParamList = {
  Artes: undefined;
  ArteDetails: { id: string; titulo?: string };
};

export type ClientesStackParamList = {
  Clientes: undefined;
  ClienteDetails: { id: string; nome?: string };
};

export type NotificacoesStackParamList = { Notificacoes: undefined };

export type PerfilStackParamList = {
  Perfil: undefined;
  Configuracoes: undefined;
};

// ---------- Navigators ----------
const Tab = createBottomTabNavigator<TabParamList>();
const HomeStack = createNativeStackNavigator<HomeStackParamList>();
const ProjectsStack = createNativeStackNavigator<ProjectsStackParamList>();
const ArtesStack = createNativeStackNavigator<ArtesStackParamList>();
const ClientesStack = createNativeStackNavigator<ClientesStackParamList>();
const NotificacoesStack = createNativeStackNavigator<NotificacoesStackParamList>();
const PerfilStack = createNativeStackNavigator<PerfilStackParamList>();

function HomeStackNavigator() {
  return (
    <HomeStack.Navigator screenOptions={{ headerShown: false }}>
      <HomeStack.Screen name="Home" component={HomeScreen} />
    </HomeStack.Navigator>
  );
}

function ProjectsStackNavigator() {
  return (
    <ProjectsStack.Navigator screenOptions={{ headerShown: false }}>
      <ProjectsStack.Screen name="ProjectsList" component={ProjectsScreen} />
      <ProjectsStack.Screen name="Project" component={ProjectDetails} />
      <ProjectsStack.Screen name="Tarefas" component={TarefasScreen} />
      <ProjectsStack.Screen name="Status" component={StatusScreen} />
      <ProjectsStack.Screen name="Links" component={LinksScreen} />
      <ProjectsStack.Screen name="Feedbacks" component={FeedbacksScreen} />
      <ProjectsStack.Screen name="FeedbackDetails" component={FeedbackDetailsScreen} />
    </ProjectsStack.Navigator>
  );
}

function ArtesStackNavigator() {
  return (
    <ArtesStack.Navigator screenOptions={{ headerShown: false }}>
      <ArtesStack.Screen name="Artes" component={ArtesScreen} />
      <ArtesStack.Screen name="ArteDetails" component={ArteDetailsScreen} />
    </ArtesStack.Navigator>
  );
}

function ClientesStackNavigator() {
  return (
    <ClientesStack.Navigator screenOptions={{ headerShown: false }}>
      <ClientesStack.Screen name="Clientes" component={ClientesScreen} />
      <ClientesStack.Screen name="ClienteDetails" component={ClienteDetailsScreen} />
    </ClientesStack.Navigator>
  );
}

function NotificacoesStackNavigator() {
  return (
    <NotificacoesStack.Navigator screenOptions={{ headerShown: false }}>
      <NotificacoesStack.Screen name="Notificacoes" component={NotificacoesScreen} />
    </NotificacoesStack.Navigator>
  );
}

function PerfilStackNavigator() {
  return (
    <PerfilStack.Navigator screenOptions={{ headerShown: false }}>
      <PerfilStack.Screen name="Perfil" component={PerfilScreen} />
      <PerfilStack.Screen name="Configuracoes" component={ConfiguracoesScreen} />
    </PerfilStack.Navigator>
  );
}

// ---------- Helper: titulo dinâmico global ----------
function useGlobalHeaderTitle() {
  // Estado do Tab (neste componente AppShell, o state retornado é do Tab Navigator)
  const tabState = useNavigationState((s) => s);

  // Percorre a árvore para achar a rota ativa e suas params
  function getActiveRoute(r: any): any {
    if (!r) return null;
    const route = r.routes?.[r.index ?? 0];
    if (!route) return r;
    return route.state ? getActiveRoute(route.state) : route;
  }

  const activeRoute = useMemo(() => getActiveRoute(tabState), [tabState]);
  const name: string = activeRoute?.name ?? "Home";

  const params: any = activeRoute?.params ?? {};

  // Mapeia nomes de rota -> título do AppHeader
  switch (name) {
    // Home
    case "Home":
    case "HomeTab":
      return "Início";

    // Projetos
    case "ProjectsList":
      return "Projetos";
    case "Project":
      return params?.nome || "Projeto";
    case "Tarefas":
      return "Tarefas";
    case "Status":
      return "Status";
    case "Links":
      return "Links";
    case "Feedbacks":
      return "Feedbacks";
    case "FeedbackDetails":
      return "Feedback";

    // Artes
    case "Artes":
      return "Artes";
    case "ArteDetails":
      return params?.titulo || "Arte";

    // Clientes
    case "Clientes":
      return "Clientes";
    case "ClienteDetails":
      return params?.nome || "Cliente";

    // Notificações
    case "Notificacoes":
      return "Notificações";

    // Perfil
    case "Perfil":
      return "Perfil";
    case "Configuracoes":
      return "Configurações";

    default:
      return "VIU";
  }
}

export default function AppShell() {
  const { t } = useTheme();
  const title = useGlobalHeaderTitle();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.colors.background }}>
      {/* 🔵 AppHeader GLOBAL — fica sempre visível em toda a área logada */}
      <AppHeader title={title} />

      {/* 🔵 Conteúdo de navegação abaixo do header */}
      <View style={{ flex: 1 }}>
        <Tab.Navigator
          initialRouteName="HomeTab"
          screenOptions={({ route }) => ({
            headerShown: false, // desliga headers nativos em tudo
            tabBarShowLabel: true,
            tabBarIcon: ({ color, size }) => {
              const map: Record<keyof TabParamList, keyof typeof Feather.glyphMap> = {
                HomeTab: "home",
                ProjetosTab: "folder",
                ArtesTab: "image",
                ClientesTab: "users",
                NotificacoesTab: "bell",
                PerfilTab: "user",
              };
              const icon = map[route.name as keyof TabParamList] ?? "circle";
              return <Feather name={icon as any} size={size} color={color} />;
            },
          })}
        >
          <Tab.Screen name="HomeTab" component={HomeStackNavigator} options={{ title: "Início" }} />
          <Tab.Screen name="ProjetosTab" component={ProjectsStackNavigator} options={{ title: "Projetos" }} />
          <Tab.Screen name="ArtesTab" component={ArtesStackNavigator} options={{ title: "Artes" }} />
          <Tab.Screen name="ClientesTab" component={ClientesStackNavigator} options={{ title: "Clientes" }} />
          <Tab.Screen name="NotificacoesTab" component={NotificacoesStackNavigator} options={{ title: "Notificações" }} />
          <Tab.Screen name="PerfilTab" component={PerfilStackNavigator} options={{ title: "Perfil" }} />
        </Tab.Navigator>
      </View>
    </SafeAreaView>
  );
}
