// src/screens/configuracoes/ConfiguracoesScreen.tsx
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Feather } from "@expo/vector-icons";
import { supabase } from "../../lib/supabase"; // ajuste se necessário
import { useTheme } from "../../theme/ThemeProvider";
import { useNavigation, NavigationProp } from "@react-navigation/native";
import type { RootStackParamList } from "../../Root/Root"; // certifique-se de exportar esse tipo no Root.tsx

type Provider = {
  id: string;
  provider: "google" | "apple" | "facebook" | "github" | "microsoft";
  email: string | null;
  created_at: string | null;
};

type Prefs = {
  pushEnabled: boolean;
  emailEnabled: boolean;
  analyticsEnabled: boolean;
  language: "pt-BR" | "en-US";
};

const PREFS_KEY = "app:prefs:v1";

export default function ConfiguracoesScreen() {
  const rootNav = useNavigation<NavigationProp<RootStackParamList>>();
  const themeCtx: any = useTheme(); // flexível — não sabemos a API exata
  const mode: "light" | "dark" | string = themeCtx?.mode ?? "light";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [prefs, setPrefs] = useState<Prefs>({
    pushEnabled: true,
    emailEnabled: true,
    analyticsEnabled: true,
    language: "pt-BR",
  });

  const [providers, setProviders] = useState<Provider[]>([]);
  const [usuarioId, setUsuarioId] = useState<string | null>(null);

  // Carrega prefs locais + auth + providers
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(PREFS_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (mounted) setPrefs((p) => ({ ...p, ...parsed }));
        }

        const { data: authData } = await supabase.auth.getUser();
        const authUser = authData.user;
        if (!authUser) throw new Error("Usuário não autenticado.");

        const { data: link } = await supabase
          .from("usuario_auth")
          .select("usuario_id")
          .eq("auth_user_id", authUser.id)
          .single();

        const uid = (link?.usuario_id as string) ?? null;
        if (mounted) setUsuarioId(uid);

        if (uid) {
          const { data: prov } = await supabase
            .from("user_providers")
            .select("id, provider, email, created_at")
            .eq("usuario_id", uid);
          if (mounted) setProviders((prov ?? []) as Provider[]);
        }
      } catch (e) {
        // mantém a tela utilizável mesmo com falha
        console.warn("Falha ao carregar prefs/providers:", e);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  async function persistPrefs(next: Partial<Prefs>) {
    const merged = { ...prefs, ...next };
    setPrefs(merged);
    try {
      await AsyncStorage.setItem(PREFS_KEY, JSON.stringify(merged));
    } catch {
      Alert.alert("Atenção", "Não foi possível salvar as preferências localmente.");
    }
  }

  function toggleTheme() {
    try {
      if (themeCtx?.toggleMode) {
        themeCtx.toggleMode();
      } else if (themeCtx?.setMode) {
        themeCtx.setMode(mode === "dark" ? "light" : "dark");
      } else {
        Alert.alert("Tema", "Alternância de tema não está configurada no ThemeProvider.");
      }
    } catch {
      Alert.alert("Tema", "Falha ao alternar tema.");
    }
  }

  async function handleUnlinkProvider(id: string) {
    Alert.alert(
      "Desvincular provedor",
      "Tem certeza que deseja desvincular este provedor? Você poderá reconectar depois.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Desvincular",
          style: "destructive",
          onPress: async () => {
            try {
              const { error } = await supabase.from("user_providers").delete().eq("id", id);
              if (error) throw error;
              setProviders((prev) => prev.filter((p) => p.id !== id));
            } catch (e: any) {
              Alert.alert("Erro", e?.message ?? "Não foi possível desvincular.");
            }
          },
        },
      ]
    );
  }

  async function handleDeactivateAccount() {
    if (!usuarioId) return;
    Alert.alert(
      "Desativar conta",
      "Sua conta ficará inativa e o acesso será bloqueado até reativação. Deseja continuar?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Desativar",
          style: "destructive",
          onPress: async () => {
            try {
              setSaving(true);
              const { error } = await supabase
                .from("usuarios")
                .update({ ativo: false, atualizado_em: new Date().toISOString() })
                .eq("id", usuarioId);
              if (error) throw error;
              Alert.alert("Conta desativada", "Você será desconectado.");
              await supabase.auth.signOut();
              // se tiver AuthContext, chame signOut nele também
            } catch (e: any) {
              Alert.alert("Erro", e?.message ?? "Não foi possível desativar a conta.");
            } finally {
              setSaving(false);
            }
          },
        },
      ]
    );
  }

  async function handleSignOut() {
    try {
      await supabase.auth.signOut();
      // Se usar contexto de auth, chame signOut aqui também
    } catch {
      Alert.alert("Erro", "Falha ao sair. Tente novamente.");
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.center]}>
        <ActivityIndicator />
        <Text style={{ marginTop: 8 }}>Carregando configurações...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        {/* Cabeçalho */}
        <View style={styles.header}>
          <Text style={styles.h1}>Configurações</Text>
          <Text style={styles.subtitle}>Preferências do aplicativo e da conta</Text>
        </View>

        {/* Aparência */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Aparência</Text>

          <Pressable
            onPress={toggleTheme}
            android_ripple={{ color: "#E5E7EB" }}
            style={({ pressed }) => [styles.rowBetween, styles.item, pressed && styles.pressed]}
          >
            <View style={styles.row}>
              <Feather name="sun" size={16} />
              <Text style={styles.itemTitle}>Tema</Text>
            </View>
            <View style={styles.pillSmall}>
              <Text style={styles.pillSmallText}>{mode === "dark" ? "Escuro" : "Claro"}</Text>
            </View>
          </Pressable>

          <Pressable
            onPress={() => persistPrefs({ language: prefs.language === "pt-BR" ? "en-US" : "pt-BR" })}
            android_ripple={{ color: "#E5E7EB" }}
            style={({ pressed }) => [styles.rowBetween, styles.item, pressed && styles.pressed]}
          >
            <View style={styles.row}>
              <Feather name="globe" size={16} />
              <Text style={styles.itemTitle}>Idioma</Text>
            </View>
            <View style={styles.pillSmall}>
              <Text style={styles.pillSmallText}>{prefs.language}</Text>
            </View>
          </Pressable>
        </View>

        {/* Notificações */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notificações</Text>

          <View style={[styles.item, styles.rowBetween]}>
            <View style={styles.row}>
              <Feather name="bell" size={16} />
              <Text style={styles.itemTitle}>Push</Text>
            </View>
            <Switch
              value={prefs.pushEnabled}
              onValueChange={(v) => persistPrefs({ pushEnabled: v })}
            />
          </View>

          <View style={[styles.item, styles.rowBetween]}>
            <View style={styles.row}>
              <Feather name="mail" size={16} />
              <Text style={styles.itemTitle}>E-mail</Text>
            </View>
            <Switch
              value={prefs.emailEnabled}
              onValueChange={(v) => persistPrefs({ emailEnabled: v })}
            />
          </View>
        </View>

        {/* Privacidade */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Privacidade</Text>

        <View style={[styles.item, styles.rowBetween]}>
            <View style={styles.row}>
              <Feather name="bar-chart-2" size={16} />
              <Text style={styles.itemTitle}>Enviar dados de uso (anônimos)</Text>
            </View>
            <Switch
              value={prefs.analyticsEnabled}
              onValueChange={(v) => persistPrefs({ analyticsEnabled: v })}
            />
          </View>

          <Pressable
            onPress={async () => {
              try {
                setSaving(true);
                await AsyncStorage.clear();
                Alert.alert("Pronto!", "Preferências locais foram limpas.");
              } catch {
                Alert.alert("Erro", "Não foi possível limpar os dados locais.");
              } finally {
                setSaving(false);
              }
            }}
            android_ripple={{ color: "#E5E7EB" }}
            style={({ pressed }) => [styles.item, styles.rowBetween, pressed && styles.pressed]}
          >
            <View style={styles.row}>
              <Feather name="trash-2" size={16} />
              <Text style={styles.itemTitle}>Limpar dados locais</Text>
            </View>
            {saving ? <ActivityIndicator /> : <Feather name="chevron-right" size={18} />}
          </Pressable>
        </View>

        {/* Conexões */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Conexões</Text>
          {providers.length > 0 ? (
            <View style={{ gap: 8 }}>
              {providers.map((p) => (
                <View key={p.id} style={[styles.item, styles.rowBetween]}>
                  <View style={styles.row}>
                    <Feather name="link" size={16} />
                    <Text style={styles.itemTitle}>&nbsp;{p.provider}</Text>
                  </View>
                  <Pressable
                    onPress={() => handleUnlinkProvider(p.id)}
                    android_ripple={{ color: "#FEE2E2" }}
                    style={({ pressed }) => [styles.unlinkBtn, pressed && styles.pressed]}
                  >
                    <Feather name="x-circle" size={14} color="#991B1B" />
                    <Text style={styles.unlinkText}>Desvincular</Text>
                  </Pressable>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.mutedSmall}>Nenhum provedor conectado.</Text>
          )}
        </View>

        {/* Conta */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Conta</Text>

          <Pressable
            onPress={() => rootNav.navigate("ResetPassword")}
            android_ripple={{ color: "#E5E7EB" }}
            style={({ pressed }) => [styles.item, styles.rowBetween, pressed && styles.pressed]}
          >
            <View style={styles.row}>
              <Feather name="lock" size={16} />
              <Text style={styles.itemTitle}>Alterar senha</Text>
            </View>
            <Feather name="chevron-right" size={18} />
          </Pressable>

          <Pressable
            onPress={handleDeactivateAccount}
            android_ripple={{ color: "#FEE2E2" }}
            style={({ pressed }) => [styles.item, styles.rowBetween, pressed && styles.pressed]}
          >
            <View style={styles.row}>
              <Feather name="user-x" size={16} color="#991B1B" />
              <Text style={[styles.itemTitle, { color: "#991B1B" }]}>Desativar conta</Text>
            </View>
            <Feather name="chevron-right" size={18} color="#991B1B" />
          </Pressable>

          <Pressable
            onPress={handleSignOut}
            android_ripple={{ color: "#11182722" }}
            style={({ pressed }) => [styles.dangerBtn, pressed && styles.pressedDark]}
          >
            <Feather name="log-out" size={16} color="#fff" />
            <Text style={styles.dangerBtnText}>Sair</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  center: { alignItems: "center", justifyContent: "center", padding: 16 },

  header: { padding: 16, paddingBottom: 8 },
  h1: { fontSize: 20, fontWeight: "700" },
  subtitle: { opacity: 0.7, marginTop: 2 },

  section: { paddingHorizontal: 16, paddingTop: 16, gap: 8 },
  sectionTitle: { fontSize: 16, fontWeight: "700", marginBottom: 6 },

  item: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },

  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },

  itemTitle: { fontWeight: "600" },
  mutedSmall: { fontSize: 12, opacity: 0.7 },

  pillSmall: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, backgroundColor: "#F3F4F6" },
  pillSmallText: { fontSize: 12, fontWeight: "700" },

  unlinkBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#FEE2E2",
  },
  unlinkText: { color: "#991B1B", fontWeight: "700", fontSize: 12 },

  dangerBtn: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#DC2626",
    paddingVertical: 12,
    borderRadius: 10,
  },
  dangerBtnText: { color: "#fff", fontWeight: "700" },

  pressed: { opacity: Platform.OS === "ios" ? 0.6 : 0.9 },
  pressedDark: { opacity: 0.9 },
});
