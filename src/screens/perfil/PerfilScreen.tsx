import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking as RNLinking,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Image,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { supabase } from "../../lib/supabase";
import { useTheme } from "../../theme/ThemeProvider";

type Usuario = {
  id: string;
  email: string;
  nome: string;
  telefone: string | null;
  avatar: string | null;
  tipo: "DESIGNER" | "CLIENTE";
  ativo: boolean;
  criado_em: string;
  atualizado_em: string;
};

type Provider = {
  id: string;
  provider: "google" | "apple" | "facebook" | "github" | "microsoft";
  email: string | null;
  created_at: string | null;
};

type Stats = {
  projetosComoDesigner: number;
  projetosComoCliente: number;
  tarefasAbertas: number;
  artesAutor: number;
  notificacoesNaoLidas: number;
};

function formatDateBR(date: string | null | undefined) {
  if (!date) return "-";
  const d = new Date(date);
  return isNaN(d.getTime()) ? "-" : d.toLocaleDateString("pt-BR");
}

// Garante que exista um usuarios.id vinculado ao auth.user
async function ensureUsuarioForAuth(): Promise<string> {
  const { data: authData, error: authErr } = await supabase.auth.getUser();
  if (authErr) throw authErr;
  const authUser = authData.user;
  if (!authUser) throw new Error("Usuário não autenticado.");

  const authId = authUser.id;
  const email = authUser.email ?? authUser.user_metadata?.email ?? "";
  const nomeMeta =
    authUser.user_metadata?.full_name ||
    authUser.user_metadata?.name ||
    email?.split("@")[0] ||
    "Usuário";

  // 1) tenta achar vínculo usuario_auth
  const { data: link, error: linkErr } = await supabase
    .from("usuario_auth")
    .select("usuario_id")
    .eq("auth_user_id", authId)
    .maybeSingle();

  if (linkErr) throw linkErr;
  if (link?.usuario_id) return link.usuario_id as string;

  // 2) sem vínculo: tenta achar usuário pelo email
  let usuarioId: string | null = null;

  if (email) {
    const { data: uByEmail, error: uByEmailErr } = await supabase
      .from("usuarios")
      .select("id")
      .eq("email", email)
      .maybeSingle();
    if (uByEmailErr) throw uByEmailErr;
    if (uByEmail?.id) {
      usuarioId = uByEmail.id as string;
    }
  }

  // 3) se ainda não existe, cria em usuarios
  if (!usuarioId) {
    const { data: inserted, error: insertErr } = await supabase
      .from("usuarios")
      .insert({
        email,
        nome: nomeMeta,
        tipo: "DESIGNER",
        ativo: true,
      })
      .select("id")
      .single(); // agora deve retornar 1 linha
    if (insertErr) throw insertErr;
    usuarioId = inserted.id as string;
  }

  // 4) cria o vínculo em usuario_auth
  const { error: mapErr } = await supabase
    .from("usuario_auth")
    .insert({
      auth_user_id: authId,
      usuario_id: usuarioId,
    });
  if (mapErr) throw mapErr;

  return usuarioId;
}

export default function PerfilScreen() {
  const { t } = useTheme();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [stats, setStats] = useState<Stats>({
    projetosComoDesigner: 0,
    projetosComoCliente: 0,
    tarefasAbertas: 0,
    artesAutor: 0,
    notificacoesNaoLidas: 0,
  });

  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);

        // Garante usuario_id válido para o auth atual
        const usuarioId = await ensureUsuarioForAuth();

        // Carrega usuario (agora deve existir)
        const { data: u, error: uErr } = await supabase
          .from("usuarios")
          .select("*")
          .eq("id", usuarioId)
          .single();
        if (uErr) throw uErr;

        // Providers conectados (ok se 0 linhas)
        const { data: prov, error: pErr } = await supabase
          .from("user_providers")
          .select("id, provider, email, created_at")
          .eq("usuario_id", usuarioId);
        if (pErr) throw pErr;

        // Stats
        const [projDesigner, projCliente, tarefas, artes, notis] = await Promise.all([
          supabase.from("projetos").select("id", { count: "exact", head: true }).eq("designer_id", usuarioId),
          supabase.from("projetos").select("id", { count: "exact", head: true }).eq("cliente_id", usuarioId),
          supabase
            .from("tarefas")
            .select("id", { count: "exact", head: true })
            .eq("responsavel_id", usuarioId)
            .in("status", ["PENDENTE", "EM_ANDAMENTO"]),
          supabase.from("artes").select("id", { count: "exact", head: true }).eq("autor_id", usuarioId),
          supabase
            .from("notificacoes")
            .select("id", { count: "exact", head: true })
            .eq("usuario_id", usuarioId)
            .eq("lida", false),
        ]);

        if (!mounted) return;

        const uCast = u as unknown as Usuario;
        setUsuario(uCast);
        setNome(uCast.nome ?? "");
        setTelefone(uCast.telefone ?? "");
        setAvatarUrl(uCast.avatar ?? "");

        setProviders((prov ?? []) as Provider[]);
        setStats({
          projetosComoDesigner: projDesigner.count ?? 0,
          projetosComoCliente: projCliente.count ?? 0,
          tarefasAbertas: tarefas.count ?? 0,
          artesAutor: artes.count ?? 0,
          notificacoesNaoLidas: notis.count ?? 0,
        });
      } catch (e: any) {
        console.error(e);
        setError(e?.message ?? "Falha ao carregar perfil.");
      } finally {
        setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const isDesigner = usuario?.tipo === "DESIGNER";
  const projetosRelevantes = isDesigner ? stats.projetosComoDesigner : stats.projetosComoCliente;

  const canSave = useMemo(() => {
    if (!usuario) return false;
    const baseNome = usuario.nome ?? "";
    const baseTel = usuario.telefone ?? "";
    const baseAvatar = usuario.avatar ?? "";
    return (
      (nome && nome !== baseNome) ||
      telefone !== baseTel ||
      avatarUrl !== baseAvatar
    );
  }, [usuario, nome, telefone, avatarUrl]);

  async function handleSave() {
    if (!usuario) return;
    setSaving(true);
    try {
      const { error: upErr } = await supabase
        .from("usuarios")
        .update({
          nome: nome.trim(),
          telefone: telefone.trim() || null,
          avatar: avatarUrl.trim() || null,
          atualizado_em: new Date().toISOString(),
        })
        .eq("id", usuario.id);
      if (upErr) throw upErr;

      setUsuario((prev) =>
        prev ? { ...prev, nome: nome.trim(), telefone: telefone.trim() || null, avatar: avatarUrl.trim() || null } : prev
      );
      Alert.alert("Pronto!", "Perfil atualizado com sucesso.");
    } catch (e: any) {
      console.error(e);
      Alert.alert("Erro", e?.message ?? "Não foi possível atualizar o perfil.");
    } finally {
      setSaving(false);
    }
  }

  async function handleLogout() {
    try {
      await supabase.auth.signOut();
    } catch (e: any) {
      Alert.alert("Erro", "Falha ao sair. Tente novamente.");
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.center]}>
        <ActivityIndicator />
        <Text style={{ marginTop: 8 }}>Carregando perfil...</Text>
      </SafeAreaView>
    );
  }
  if (error || !usuario) {
    return (
      <SafeAreaView style={[styles.container, styles.center]}>
        <Text style={styles.error}>{error ?? "Perfil não encontrado."}</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        {/* Header */}
        <View style={styles.headerRow}>
          <View style={styles.avatarLg}>
            {usuario.avatar ? (
              <Image source={{ uri: usuario.avatar }} style={styles.avatarLgImg} />
            ) : (
              <Feather name="user" size={28} />
            )}
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.h1}>{usuario.nome}</Text>
            <Pressable
              onPress={() => RNLinking.openURL(`mailto:${usuario.email}`)}
              android_ripple={{ color: "#E5E7EB", borderless: true }}
              style={({ pressed }) => [styles.rowSm, pressed && styles.pressed]}
            >
              <Feather name="mail" size={14} />
              <Text style={styles.muted}>{usuario.email}</Text>
            </Pressable>
            {usuario.telefone ? (
              <Pressable
                onPress={() => RNLinking.openURL(`tel:${usuario.telefone}`)}
                android_ripple={{ color: "#E5E7EB", borderless: true }}
                style={({ pressed }) => [styles.rowSm, pressed && styles.pressed]}
              >
                <Feather name="phone" size={14} />
                <Text style={styles.muted}>{usuario.telefone}</Text>
              </Pressable>
            ) : null}
          </View>
          <View style={[styles.badge, usuario.ativo ? styles.badgeOk : styles.badgeMuted]}>
            <Feather name={usuario.ativo ? "check-circle" : "clock"} size={12} />
            <Text style={[styles.badgeText, { marginLeft: 4 }]}>{usuario.ativo ? "Ativo" : "Inativo"}</Text>
          </View>
        </View>

        {/* Estatísticas */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statBig}>{projetosRelevantes}</Text>
            <Text style={styles.mutedSmall}>
              {isDesigner ? "Projetos (Designer)" : "Projetos (Cliente)"}
            </Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statBig}>{stats.tarefasAbertas}</Text>
            <Text style={styles.mutedSmall}>Tarefas Abertas</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statBig}>{stats.artesAutor}</Text>
            <Text style={styles.mutedSmall}>Artes Autor</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statBig}>{stats.notificacoesNaoLidas}</Text>
            <Text style={styles.mutedSmall}>Notificações Não Lidas</Text>
          </View>
        </View>

        {/* Formulário */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informações Pessoais</Text>

          <Text style={styles.label}>Nome</Text>
          <TextInput value={nome} onChangeText={setNome} placeholder="Seu nome" style={styles.input} />

          <Text style={styles.label}>Telefone</Text>
          <TextInput
            value={telefone}
            onChangeText={setTelefone}
            placeholder="(00) 00000-0000"
            keyboardType="phone-pad"
            style={styles.input}
          />

          <Text style={styles.label}>Avatar (URL)</Text>
          <TextInput
            value={avatarUrl}
            onChangeText={setAvatarUrl}
            placeholder="https://..."
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.input}
          />

          <View style={{ flexDirection: "row", marginTop: 8 }}>
            <Pressable
              disabled={!canSave || saving}
              onPress={handleSave}
              android_ripple={{ color: "#11182722" }}
              style={({ pressed }) => [
                styles.primaryBtn,
                (!canSave || saving) && styles.btnDisabled,
                pressed && styles.pressedDark,
              ]}
            >
              <Feather name="save" size={16} color="#fff" />
              <Text style={styles.primaryBtnText}>{saving ? "Salvando..." : "Salvar"}</Text>
            </Pressable>

            <View style={{ width: 8 }} />

            <Pressable
              onPress={() => {
                setNome(usuario.nome ?? "");
                setTelefone(usuario.telefone ?? "");
                setAvatarUrl(usuario.avatar ?? "");
              }}
              android_ripple={{ color: "#E5E7EB" }}
              style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}
            >
              <Feather name="rotate-ccw" size={16} />
              <Text style={styles.secondaryBtnText}>Reverter</Text>
            </Pressable>
          </View>
        </View>

        {/* Conexões */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Conexões</Text>
          {providers.length > 0 ? (
            <View>
              {providers.map((p) => (
                <View key={p.id} style={[styles.providerRow, { marginBottom: 8 }]}>
                  <View style={styles.rowSm}>
                    <Feather name="link" size={14} />
                    <Text style={{ fontWeight: "700", textTransform: "capitalize" }}>{p.provider}</Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <Text style={styles.mutedSmall}>
                      {p.email ?? "sem email"} — vinculado em {formatDateBR(p.created_at)}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.mutedSmall}>Nenhum provedor conectado.</Text>
          )}
        </View>

        {/* Metadados */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Metadados</Text>
          <Text style={styles.mutedSmall}>Tipo: {usuario.tipo}</Text>
          <Text style={styles.mutedSmall}>Criado em: {formatDateBR(usuario.criado_em)}</Text>
          <Text style={styles.mutedSmall}>Atualizado em: {formatDateBR(usuario.atualizado_em)}</Text>
        </View>

        {/* Sair */}
        <View style={[styles.section, { borderTopWidth: 1, borderTopColor: "#E5E7EB" }]}>
          <Pressable
            onPress={handleLogout}
            android_ripple={{ color: "#FEE2E2" }}
            style={({ pressed }) => [styles.dangerBtn, pressed && styles.pressed]}
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
  error: { color: "#DC2626", fontWeight: "700" },

  headerRow: { flexDirection: "row", alignItems: "center", padding: 16 },
  avatarLg: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: "#EEF2FF",
    alignItems: "center", justifyContent: "center", marginRight: 12,
  },
  avatarLgImg: { width: 56, height: 56, borderRadius: 28 },
  h1: { fontSize: 20, fontWeight: "700" },
  rowSm: { flexDirection: "row", alignItems: "center", marginTop: 2 },
  muted: { opacity: 0.75 },

  badge: { flexDirection: "row", alignItems: "center", paddingVertical: 4, paddingHorizontal: 8, borderRadius: 999 },
  badgeOk: { backgroundColor: "#DCFCE7" },
  badgeMuted: { backgroundColor: "#E5E7EB" },
  badgeText: { fontSize: 12, fontWeight: "700" },

  statsGrid: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 16, marginTop: 8 },
  statCard: {
    flexBasis: "48%", flexGrow: 1, padding: 12, backgroundColor: "#F4F4F5",
    borderRadius: 10, margin: "1%",
  },
  statBig: { fontSize: 16, fontWeight: "700" },
  mutedSmall: { fontSize: 12, opacity: 0.7 },

  section: { paddingHorizontal: 16, paddingTop: 16 },
  sectionTitle: { fontSize: 16, fontWeight: "700", marginBottom: 6 },

  label: { fontSize: 12, fontWeight: "600", opacity: 0.8 },
  input: {
    borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10, backgroundColor: "#fff", marginBottom: 8,
  },

  primaryBtn: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#0b0e11", paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, flex: 1, justifyContent: "center",
  },
  primaryBtnText: { color: "#fff", fontWeight: "700" },
  btnDisabled: { opacity: 0.5 },

  secondaryBtn: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#F3F4F6", paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, flex: 1, justifyContent: "center",
  },
  secondaryBtnText: { fontWeight: "700" },

  dangerBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    backgroundColor: "#DC2626", paddingVertical: 12, borderRadius: 10, marginTop: 8,
  },
  dangerBtnText: { color: "#fff", fontWeight: "700" },

  providerRow: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#fff", borderWidth: 1, borderColor: "#E5E7EB",
    padding: 10, borderRadius: 10,
  },

  pressed: { opacity: Platform.OS === "ios" ? 0.6 : 0.9 },
  pressedDark: { opacity: 0.9 },
});
