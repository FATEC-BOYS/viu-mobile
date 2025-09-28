// src/screens/feedbacks/FeedbacksScreen.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
  Image,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { supabase } from "../../lib/supabase"; // ajuste o caminho se necessário

// ===== Tipos =====
type FeedbackStatus = "ABERTO" | "EM_ANALISE" | "RESOLVIDO" | "ARQUIVADO";
type FeedbackTipo = "TEXTO" | "AUDIO";

type UsuarioLite = {
  id: string;
  nome: string;
  avatar?: string | null;
};

type ArteLite = {
  id: string;
  nome: string;
};

type Feedback = {
  id: string;
  conteudo: string;
  tipo: FeedbackTipo;
  arquivo?: string | null;
  posicao_x?: number | null;
  posicao_y?: number | null;
  posicao_x_abs?: number | null;
  posicao_y_abs?: number | null;
  arte_id: string;
  arte?: ArteLite | null;
  autor_id: string;
  autor?: UsuarioLite | null;
  criado_em: string;
  status: FeedbackStatus;
  arte_versao_id?: string | null;
  criar_tarefa?: boolean | null;
};

function formatDateBR(date: string | null | undefined) {
  if (!date) return "-";
  const d = new Date(date);
  return isNaN(d.getTime()) ? "-" : d.toLocaleDateString("pt-BR");
}

function truncate(s: string, n = 80) {
  if (!s) return "";
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

export default function FeedbacksScreen() {
  // estado base
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [usuarioId, setUsuarioId] = useState<string | null>(null);

  // filtros
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"todos" | FeedbackStatus>("todos");
  const [tipoFilter, setTipoFilter] = useState<"todos" | FeedbackTipo>("todos");
  const [onlyMine, setOnlyMine] = useState(false);
  const [sortBy, setSortBy] = useState<"recentes" | "antigos">("recentes");

  // resposta rápida (por item)
  const [replyOpen, setReplyOpen] = useState<Record<string, boolean>>({});
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [busyById, setBusyById] = useState<Record<string, boolean>>({});

  // ===== Carregar auth + dados =====
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        // auth → usuario_id
        const { data: authData, error: authErr } = await supabase.auth.getUser();
        if (authErr) throw authErr;
        const authUser = authData.user;
        if (!authUser) throw new Error("Usuário não autenticado.");

        const { data: link, error: linkErr } = await supabase
          .from("usuario_auth")
          .select("usuario_id")
          .eq("auth_user_id", authUser.id)
          .single();
        if (linkErr) throw linkErr;

        if (!mounted) return;
        setUsuarioId(link?.usuario_id ?? null);
      } catch (e) {
        console.warn(e);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  async function fetchFeedbacks() {
    try {
      // juntando autor e arte (nomes/avatars) para uma UI mais rica
      const { data, error } = await supabase
        .from("feedbacks")
        .select(`
          id, conteudo, tipo, arquivo, posicao_x, posicao_y, posicao_x_abs, posicao_y_abs,
          arte_id, autor_id, criado_em, status, arte_versao_id, criar_tarefa,
          arte:artes(id, nome),
          autor:usuarios(id, nome, avatar)
        `)
        .order("criado_em", { ascending: false });

      if (error) throw error;
      setFeedbacks((data as any) ?? []);
    } catch (e: any) {
      Alert.alert("Erro", e?.message ?? "Não foi possível carregar os feedbacks.");
    }
  }

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      await fetchFeedbacks();
      if (mounted) setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  async function onRefresh() {
    setRefreshing(true);
    await fetchFeedbacks();
    setRefreshing(false);
  }

  // ===== View derivada com filtros =====
  const view = useMemo(() => {
    let arr = [...feedbacks];

    if (statusFilter !== "todos") {
      arr = arr.filter((f) => f.status === statusFilter);
    }
    if (tipoFilter !== "todos") {
      arr = arr.filter((f) => f.tipo === tipoFilter);
    }
    if (onlyMine && usuarioId) {
      arr = arr.filter((f) => f.autor_id === usuarioId);
    }
    if (search) {
      const q = search.toLowerCase();
      arr = arr.filter(
        (f) =>
          (f.conteudo ?? "").toLowerCase().includes(q) ||
          (f.arte?.nome ?? "").toLowerCase().includes(q) ||
          (f.autor?.nome ?? "").toLowerCase().includes(q) ||
          (f.id ?? "").toLowerCase().includes(q)
      );
    }
    arr.sort((a, b) =>
      sortBy === "recentes"
        ? new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime()
        : new Date(a.criado_em).getTime() - new Date(b.criado_em).getTime()
    );
    return arr;
  }, [feedbacks, statusFilter, tipoFilter, onlyMine, search, sortBy, usuarioId]);

  // ===== Ações =====
  function setBusy(id: string, v: boolean) {
    setBusyById((prev) => ({ ...prev, [id]: v }));
  }

  async function updateStatus(id: string, status: FeedbackStatus) {
    try {
      setBusy(id, true);
      const { error } = await supabase.from("feedbacks").update({ status }).eq("id", id);
      if (error) throw error;
      setFeedbacks((prev) => prev.map((f) => (f.id === id ? { ...f, status } : f)));
    } catch (e: any) {
      Alert.alert("Erro", e?.message ?? "Não foi possível alterar o status.");
    } finally {
      setBusy(id, false);
    }
  }

  async function createTaskFromFeedback(fb: Feedback) {
    if (!usuarioId) {
      Alert.alert("Atenção", "Usuário não autenticado.");
      return;
    }
    try {
      setBusy(fb.id, true);

      // 1) cria tarefa básica
      const titulo = truncate(fb.conteudo || "Feedback", 60) || `Feedback ${fb.id.slice(0, 6)}`;
      const { data: tarefa, error: tErr } = await supabase
        .from("tarefas")
        .insert({
          titulo,
          descricao: `Criado a partir do feedback ${fb.id}`,
          status: "PENDENTE",
          prioridade: "MEDIA",
          responsavel_id: usuarioId,
          arte_id: fb.arte_id,
        })
        .select("id")
        .single();
      if (tErr) throw tErr;

      // 2) vincula na tabela de junção
      const { error: jErr } = await supabase
        .from("tarefa_feedbacks")
        .insert({ tarefa_id: tarefa.id, feedback_id: fb.id });
      if (jErr) throw jErr;

      // 3) marca flag no feedback (opcional no seu schema)
      const { error: fErr } = await supabase
        .from("feedbacks")
        .update({ criar_tarefa: true })
        .eq("id", fb.id);
      if (fErr) throw fErr;

      setFeedbacks((prev) =>
        prev.map((f) => (f.id === fb.id ? { ...f, criar_tarefa: true } : f))
      );
      Alert.alert("Pronto!", "Tarefa criada a partir do feedback.");
    } catch (e: any) {
      Alert.alert("Erro", e?.message ?? "Não foi possível criar a tarefa.");
    } finally {
      setBusy(fb.id, false);
    }
  }

  async function sendQuickReply(fb: Feedback) {
    const text = (replyText[fb.id] ?? "").trim();
    if (!text) {
      Alert.alert("Atenção", "Escreva uma resposta antes de enviar.");
      return;
    }
    if (!usuarioId) {
      Alert.alert("Atenção", "Usuário não autenticado.");
      return;
    }
    try {
      setBusy(fb.id, true);
      const { error } = await supabase
        .from("feedback_respostas")
        .insert({
          feedback_id: fb.id,
          autor_id: usuarioId,
          conteudo: text,
          tipo: "TEXTO",
        });
      if (error) throw error;
      setReplyText((prev) => ({ ...prev, [fb.id]: "" }));
      setReplyOpen((prev) => ({ ...prev, [fb.id]: false }));
      Alert.alert("Enviado!", "Sua resposta foi registrada.");
    } catch (e: any) {
      Alert.alert("Erro", e?.message ?? "Não foi possível enviar a resposta.");
    } finally {
      setBusy(fb.id, false);
    }
  }

  // ===== UI =====
  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.center]}>
        <ActivityIndicator />
        <Text style={{ marginTop: 8 }}>Carregando feedbacks...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.h1}>Feedbacks</Text>
          <Text style={styles.subtitle}>Acompanhe e responda aos feedbacks das artes</Text>
        </View>
        <Pressable
          onPress={onRefresh}
          android_ripple={{ color: "#11182722" }}
          style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressedDark]}
        >
          <Feather name="refresh-ccw" size={16} color="#fff" />
          <Text style={styles.primaryBtnText}>Atualizar</Text>
        </Pressable>
      </View>

      {/* Filtros */}
      <View style={styles.filters}>
        <View style={{ flex: 1, position: "relative" }}>
          <Feather
            name="search"
            size={16}
            style={{ position: "absolute", left: 10, top: 12, opacity: 0.6 }}
          />
          <TextInput
            placeholder="Buscar por conteúdo, arte, autor, id..."
            value={search}
            onChangeText={setSearch}
            style={styles.input}
          />
        </View>

        <View style={styles.rowWrap}>
          {/* Status */}
          {(["todos", "ABERTO", "EM_ANALISE", "RESOLVIDO", "ARQUIVADO"] as const).map((s) => (
            <Pressable
              key={s}
              onPress={() => setStatusFilter(s as any)}
              android_ripple={{ color: "#E5E7EB" }}
              style={({ pressed }) => [
                styles.chip,
                statusFilter === s ? styles.chipActive : styles.chipInactive,
                pressed && styles.pressed,
              ]}
            >
              <Text
                style={[
                  styles.chipText,
                  statusFilter === s ? styles.chipTextActive : styles.chipTextInactive,
                ]}
              >
                {s === "todos" ? "Todos" : s.replace("_", " ")}
              </Text>
            </Pressable>
          ))}

          {/* Tipo */}
          {(["todos", "TEXTO", "AUDIO"] as const).map((tp) => (
            <Pressable
              key={tp}
              onPress={() => setTipoFilter(tp as any)}
              android_ripple={{ color: "#E5E7EB" }}
              style={({ pressed }) => [
                styles.chip,
                tipoFilter === tp ? styles.chipActive : styles.chipInactive,
                pressed && styles.pressed,
              ]}
            >
              <Text
                style={[
                  styles.chipText,
                  tipoFilter === tp ? styles.chipTextActive : styles.chipTextInactive,
                ]}
              >
                {tp[0].toUpperCase() + tp.slice(1).toLowerCase()}
              </Text>
            </Pressable>
          ))}

          {/* Ordenação */}
          {(["recentes", "antigos"] as const).map((k) => (
            <Pressable
              key={k}
              onPress={() => setSortBy(k)}
              android_ripple={{ color: "#E5E7EB" }}
              style={({ pressed }) => [
                styles.chip,
                sortBy === k ? styles.chipActive : styles.chipInactive,
                pressed && styles.pressed,
              ]}
            >
              <Text
                style={[
                  styles.chipText,
                  sortBy === k ? styles.chipTextActive : styles.chipTextInactive,
                ]}
              >
                {k === "recentes" ? "Mais recentes" : "Mais antigos"}
              </Text>
            </Pressable>
          ))}

          {/* Meus */}
          <View style={[styles.row, { marginLeft: 4 }]}>
            <Text style={styles.mutedSmall}>Meus</Text>
            <Switch value={!!onlyMine} onValueChange={setOnlyMine} />
          </View>
        </View>
      </View>

      {/* Lista */}
      <FlatList
        data={view}
        keyExtractor={(item) => item.id}
        refreshing={refreshing}
        onRefresh={onRefresh}
        contentContainerStyle={{ paddingBottom: 32 }}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        renderItem={({ item }) => {
          const busy = !!busyById[item.id];

          return (
            <View style={styles.card}>
              {/* Top row: autor + arte + status */}
              <View style={styles.rowBetween}>
                <View style={styles.row}>
                  <View style={styles.avatarSm}>
                    {item.autor?.avatar ? (
                      <Image source={{ uri: item.autor.avatar }} style={styles.avatarSmImg} />
                    ) : (
                      <Feather name="user" size={14} />
                    )}
                  </View>
                  <View>
                    <Text style={styles.itemTitle}>
                      {item.autor?.nome ?? "Autor desconhecido"}
                    </Text>
                    <Text style={styles.mutedSmall}>
                      {item.arte?.nome ? `Arte: ${item.arte?.nome}` : `Arte: ${item.arte_id}`}
                    </Text>
                  </View>
                </View>

                <View
                  style={[
                    styles.badge,
                    item.status === "ABERTO"
                      ? styles.badgeBlue
                      : item.status === "EM_ANALISE"
                      ? styles.badgeYellow
                      : item.status === "RESOLVIDO"
                      ? styles.badgeGreen
                      : styles.badgeGray,
                  ]}
                >
                  <Text style={styles.badgeText}>{item.status.replace("_", " ")}</Text>
                </View>
              </View>

              {/* Conteúdo */}
              <View style={{ marginTop: 8, gap: 4 }}>
                <View style={styles.row}>
                  <Feather name={item.tipo === "AUDIO" ? "mic" : "message-square"} size={14} />
                  <Text style={styles.mutedSmall}>
                    {item.tipo === "AUDIO"
                      ? (item.arquivo ? "Áudio anexado" : "Áudio (sem arquivo)") +
                        (item.conteudo ? ` — ${truncate(item.conteudo, 60)}` : "")
                      : item.conteudo || "(sem texto)"}
                  </Text>
                </View>
                {(item.posicao_x_abs != null || item.posicao_y_abs != null) && (
                  <Text style={styles.mutedSmall}>
                    Posição: x={item.posicao_x_abs ?? item.posicao_x} · y={item.posicao_y_abs ?? item.posicao_y}
                  </Text>
                )}
                <Text style={styles.mutedSmall}>Criado em: {formatDateBR(item.criado_em)}</Text>
                {item.arte_versao_id ? (
                  <Text style={styles.mutedSmall}>Versão da arte: {item.arte_versao_id}</Text>
                ) : null}
              </View>

              {/* Ações rápidas */}
              <View style={[styles.rowWrap, { marginTop: 10 }]}>
                {(["ABERTO", "EM_ANALISE", "RESOLVIDO", "ARQUIVADO"] as FeedbackStatus[]).map(
                  (st) => (
                    <Pressable
                      key={st}
                      disabled={busy || item.status === st}
                      onPress={() => updateStatus(item.id, st)}
                      android_ripple={{ color: "#E5E7EB" }}
                      style={({ pressed }) => [
                        styles.chip,
                        item.status === st ? styles.chipActive : styles.chipInactive,
                        (pressed || busy) && styles.pressed,
                        busy && { opacity: 0.6 },
                      ]}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          item.status === st ? styles.chipTextActive : styles.chipTextInactive,
                        ]}
                      >
                        {st.replace("_", " ")}
                      </Text>
                    </Pressable>
                  )
                )}

                {/* Criar tarefa */}
                <Pressable
                  disabled={busy || !!item.criar_tarefa}
                  onPress={() => createTaskFromFeedback(item)}
                  android_ripple={{ color: "#11182722" }}
                  style={({ pressed }) => [
                    styles.primaryBtn,
                    (pressed || busy) && styles.pressedDark,
                    !!item.criar_tarefa && styles.btnDisabled,
                  ]}
                >
                  <Feather name="check-square" size={16} color="#fff" />
                  <Text style={styles.primaryBtnText}>
                    {item.criar_tarefa ? "Tarefa criada" : "Criar tarefa"}
                  </Text>
                </Pressable>

                {/* Abrir resposta */}
                <Pressable
                  onPress={() =>
                    setReplyOpen((prev) => ({ ...prev, [item.id]: !prev[item.id] }))
                  }
                  android_ripple={{ color: "#E5E7EB" }}
                  style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}
                >
                  <Feather name="message-circle" size={16} />
                  <Text style={styles.secondaryBtnText}>
                    {replyOpen[item.id] ? "Cancelar" : "Responder"}
                  </Text>
                </Pressable>
              </View>

              {/* Caixa de resposta rápida */}
              {replyOpen[item.id] && (
                <View style={{ marginTop: 8 }}>
                  <TextInput
                    placeholder="Escreva sua resposta..."
                    value={replyText[item.id] ?? ""}
                    onChangeText={(v) => setReplyText((p) => ({ ...p, [item.id]: v }))}
                    style={styles.input}
                    multiline
                  />
                  <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
                    <Pressable
                      disabled={busy}
                      onPress={() => sendQuickReply(item)}
                      android_ripple={{ color: "#11182722" }}
                      style={({ pressed }) => [
                        styles.primaryBtn,
                        (pressed || busy) && styles.pressedDark,
                        busy && styles.btnDisabled,
                      ]}
                    >
                      <Feather name="send" size={16} color="#fff" />
                      <Text style={styles.primaryBtnText}>Enviar</Text>
                    </Pressable>
                    <Pressable
                      onPress={() =>
                        setReplyOpen((prev) => ({ ...prev, [item.id]: false }))
                      }
                      android_ripple={{ color: "#E5E7EB" }}
                      style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}
                    >
                      <Feather name="x" size={16} />
                      <Text style={styles.secondaryBtnText}>Cancelar</Text>
                    </Pressable>
                  </View>
                </View>
              )}
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={[styles.card, { alignItems: "center" }]}>
            <Feather name="message-square" size={32} style={{ opacity: 0.5, marginBottom: 6 }} />
            <Text style={styles.mutedSmall}>Nenhum feedback encontrado.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

// ===== Estilos =====
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 16 },
  center: { alignItems: "center", justifyContent: "center" },

  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  h1: { fontSize: 24, fontWeight: "700" },
  subtitle: { opacity: 0.7 },

  primaryBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "#0b0e11", paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10,
  },
  primaryBtnText: { color: "#fff", fontWeight: "700" },
  secondaryBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "#F3F4F6", paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10,
  },
  secondaryBtnText: { fontWeight: "700" },
  btnDisabled: { opacity: 0.5 },

  pressed: { opacity: Platform.OS === "ios" ? 0.6 : 0.9 },
  pressedDark: { opacity: 0.9 },

  filters: { gap: 10, marginBottom: 8 },
  input: {
    backgroundColor: "#fff", borderWidth: 1, borderColor: "#E5E7EB",
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
  },

  card: { backgroundColor: "#fff", borderRadius: 12, borderWidth: 1, borderColor: "#E5E7EB", padding: 12 },

  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  rowWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center" },

  itemTitle: { fontWeight: "600" },
  mutedSmall: { fontSize: 12, opacity: 0.7 },

  chip: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999, borderWidth: 1 },
  chipActive: { backgroundColor: "#0b0e11", borderColor: "#0b0e11" },
  chipInactive: { backgroundColor: "#fff", borderColor: "#E5E7EB" },
  chipText: { fontSize: 12, fontWeight: "600" },
  chipTextActive: { color: "#fff" },
  chipTextInactive: { color: "#0b0e11" },

  avatarSm: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: "#EEF2FF",
    alignItems: "center", justifyContent: "center", marginRight: 4,
  },
  avatarSmImg: { width: 28, height: 28, borderRadius: 14 },

  badge: { paddingVertical: 4, paddingHorizontal: 8, borderRadius: 999 },
  badgeText: { fontSize: 11, fontWeight: "700" },
  badgeBlue: { backgroundColor: "#DBEAFE" },
  badgeYellow: { backgroundColor: "#FEF3C7" },
  badgeGreen: { backgroundColor: "#DCFCE7" },
  badgeGray: { backgroundColor: "#E5E7EB" },
});
