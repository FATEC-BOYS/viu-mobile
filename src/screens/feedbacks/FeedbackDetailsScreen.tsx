import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  RefreshControl,
} from "react-native";
import { useRoute, RouteProp, useNavigation } from "@react-navigation/native";
import type { NavigationProp } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import { supabase } from "../../lib/supabase"; // ajuste se necessário

// ===== Tipagem de navegação (ajuste para a sua pilha) =====
type FeedbacksStackParamList = {
  FeedbackDetails: { id: string };
};
type FeedbackDetailsRouteProp = RouteProp<FeedbacksStackParamList, "FeedbackDetails">;

// ===== Tipos =====
type FeedbackStatus = "ABERTO" | "EM_ANALISE" | "RESOLVIDO" | "ARQUIVADO";
type FeedbackTipo = "TEXTO" | "AUDIO";

type UsuarioLite = { id: string; nome: string; avatar?: string | null };
type ArteLite = { id: string; nome: string; tipo?: string | null };

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

type Resposta = {
  id: string;
  conteudo: string;
  tipo: "TEXTO" | "AUDIO";
  arquivo?: string | null;
  autor_id: string;
  autor?: UsuarioLite | null;
  criado_em: string;
};

type Preview = {
  arquivo: string;
  versao: number;
  kind: "PREVIEW" | "FONTE" | "ANEXO";
};

function formatDateBR(date?: string | null) {
  if (!date) return "-";
  const d = new Date(date);
  return isNaN(d.getTime()) ? "-" : d.toLocaleDateString("pt-BR");
}
function truncate(s = "", n = 80) {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

export default function FeedbackDetailsScreen() {
  const route = useRoute<FeedbackDetailsRouteProp>();
  const nav = useNavigation<NavigationProp<any>>();
  const { id } = route.params;

  // estado base
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);

  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [respostas, setRespostas] = useState<Resposta[]>([]);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [usuarioId, setUsuarioId] = useState<string | null>(null);

  // resposta rápida
  const [reply, setReply] = useState("");

  // ===== Carregar auth =====
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data: authData, error: authErr } = await supabase.auth.getUser();
        if (authErr) throw authErr;
        const authUser = authData.user;
        if (!authUser) throw new Error("Usuário não autenticado.");
        const { data: link } = await supabase
          .from("usuario_auth")
          .select("usuario_id")
          .eq("auth_user_id", authUser.id)
          .single();
        if (mounted) setUsuarioId(link?.usuario_id ?? null);
      } catch (e) {
        console.warn("auth", e);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // ===== Fetch principal =====
  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      // feedback + joins de autor/arte
      const { data: fb, error: fbErr } = await supabase
        .from("feedbacks")
        .select(`
          id, conteudo, tipo, arquivo, posicao_x, posicao_y, posicao_x_abs, posicao_y_abs,
          arte_id, autor_id, criado_em, status, arte_versao_id, criar_tarefa,
          arte:artes(id, nome, tipo),
          autor:usuarios(id, nome, avatar)
        `)
        .eq("id", id)
        .single();
      if (fbErr) throw fbErr;

      setFeedback(fb as any);

      // respostas do feedback (com autor)
      const { data: reps, error: rErr } = await supabase
        .from("feedback_respostas")
        .select(`
          id, conteudo, tipo, arquivo, autor_id, criado_em,
          autor:usuarios(id, nome, avatar)
        `)
        .eq("feedback_id", id)
        .order("criado_em", { ascending: true });
      if (rErr) throw rErr;
      setRespostas((reps as any) ?? []);

      // preview da arte (opcional)
      if (fb?.arte_id) {
        const { data: prev, error: pErr } = await supabase
          .from("arte_arquivos")
          .select("arquivo, versao, kind")
          .eq("arte_id", fb.arte_id)
          .eq("kind", "PREVIEW")
          .order("versao", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (pErr) {
          // se o schema proíbe maybeSingle, ignore
          console.warn("preview", pErr.message);
        }
        setPreview((prev as any) ?? null);
      } else {
        setPreview(null);
      }
    } catch (e: any) {
      Alert.alert("Erro", e?.message ?? "Não foi possível carregar o feedback.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  async function onRefresh() {
    setRefreshing(true);
    await fetchAll();
  }

  // ===== Ações =====
  async function updateStatus(status: FeedbackStatus) {
    if (!feedback) return;
    try {
      setBusy(true);
      const { error } = await supabase.from("feedbacks").update({ status }).eq("id", feedback.id);
      if (error) throw error;
      setFeedback({ ...feedback, status });
    } catch (e: any) {
      Alert.alert("Erro", e?.message ?? "Não foi possível alterar o status.");
    } finally {
      setBusy(false);
    }
  }

  async function createTaskFromFeedback() {
    if (!feedback) return;
    if (!usuarioId) {
      Alert.alert("Atenção", "Usuário não autenticado.");
      return;
    }
    try {
      setBusy(true);
      const titulo =
        truncate(feedback.conteudo || "Feedback", 60) || `Feedback ${feedback.id.slice(0, 6)}`;
      const { data: tarefa, error: tErr } = await supabase
        .from("tarefas")
        .insert({
          titulo,
          descricao: `Criado a partir do feedback ${feedback.id}`,
          status: "PENDENTE",
          prioridade: "MEDIA",
          responsavel_id: usuarioId,
          arte_id: feedback.arte_id,
        })
        .select("id")
        .single();
      if (tErr) throw tErr;

      const { error: jErr } = await supabase
        .from("tarefa_feedbacks")
        .insert({ tarefa_id: tarefa.id, feedback_id: feedback.id });
      if (jErr) throw jErr;

      const { error: fErr } = await supabase
        .from("feedbacks")
        .update({ criar_tarefa: true })
        .eq("id", feedback.id);
      if (fErr) throw fErr;

      setFeedback({ ...feedback, criar_tarefa: true });
      Alert.alert("Pronto!", "Tarefa criada a partir do feedback.");
    } catch (e: any) {
      Alert.alert("Erro", e?.message ?? "Não foi possível criar a tarefa.");
    } finally {
      setBusy(false);
    }
  }

  async function sendReply() {
    if (!feedback) return;
    const text = reply.trim();
    if (!text) {
      Alert.alert("Atenção", "Escreva uma resposta antes de enviar.");
      return;
    }
    if (!usuarioId) {
      Alert.alert("Atenção", "Usuário não autenticado.");
      return;
    }
    try {
      setBusy(true);
      const { data, error } = await supabase
        .from("feedback_respostas")
        .insert({
          feedback_id: feedback.id,
          autor_id: usuarioId,
          conteudo: text,
          tipo: "TEXTO",
        })
        .select(`
          id, conteudo, tipo, arquivo, autor_id, criado_em,
          autor:usuarios(id, nome, avatar)
        `)
        .single();
      if (error) throw error;
      setRespostas((prev) => [...prev, data as any]);
      setReply("");
    } catch (e: any) {
      Alert.alert("Erro", e?.message ?? "Não foi possível enviar a resposta.");
    } finally {
      setBusy(false);
    }
  }

  const statusChips: FeedbackStatus[] = ["ABERTO", "EM_ANALISE", "RESOLVIDO", "ARQUIVADO"];

  // ===== UI =====
  if (loading && !feedback) {
    return (
      <SafeAreaView style={[styles.container, styles.center]}>
        <ActivityIndicator />
        <Text style={{ marginTop: 8 }}>Carregando...</Text>
      </SafeAreaView>
    );
  }
  if (!feedback) {
    return (
      <SafeAreaView style={[styles.container, styles.center]}>
        <Text style={styles.error}>Feedback não encontrado.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <Pressable
            onPress={() => nav.goBack()}
            android_ripple={{ color: "#E5E7EB", borderless: true }}
            style={({ pressed }) => [styles.iconCircle, pressed && styles.pressed]}
          >
            <Feather name="chevron-left" size={18} />
          </Pressable>

          <Text style={styles.h1}>Detalhes do Feedback</Text>

          <View style={{ width: 32 }} />{/* placeholder para alinhar o título */}
        </View>

        {/* Card principal */}
        <View style={styles.card}>
          {/* topo: autor + status */}
          <View style={styles.rowBetween}>
            <View style={styles.row}>
              <View style={styles.avatarSm}>
                {feedback.autor?.avatar ? (
                  <Image source={{ uri: feedback.autor.avatar }} style={styles.avatarSmImg} />
                ) : (
                  <Feather name="user" size={14} />
                )}
              </View>
              <View>
                <Text style={styles.itemTitle}>{feedback.autor?.nome ?? "Autor"}</Text>
                <Text style={styles.mutedSmall}>
                  Criado em {formatDateBR(feedback.criado_em)}
                </Text>
              </View>
            </View>

            <View
              style={[
                styles.badge,
                feedback.status === "ABERTO"
                  ? styles.badgeBlue
                  : feedback.status === "EM_ANALISE"
                  ? styles.badgeYellow
                  : feedback.status === "RESOLVIDO"
                  ? styles.badgeGreen
                  : styles.badgeGray,
              ]}
            >
              <Text style={styles.badgeText}>{feedback.status.replace("_", " ")}</Text>
            </View>
          </View>

          {/* arte + preview */}
          <View style={{ marginTop: 8 }}>
            <Text style={styles.mutedSmall}>
              Arte: {feedback.arte?.nome ?? feedback.arte_id}
              {feedback.arte_versao_id ? ` · Versão: ${feedback.arte_versao_id}` : ""}
            </Text>
            {(feedback.posicao_x_abs != null || feedback.posicao_y_abs != null) && (
              <Text style={styles.mutedSmall}>
                Posição: x={feedback.posicao_x_abs ?? feedback.posicao_x} · y=
                {feedback.posicao_y_abs ?? feedback.posicao_y}
              </Text>
            )}

            {preview?.arquivo ? (
              <View style={{ marginTop: 8 }}>
                <Image
                  source={{ uri: preview.arquivo }}
                  style={styles.preview}
                  resizeMode="cover"
                />
                <Text style={styles.mutedSmall}>Preview v{preview.versao}</Text>
              </View>
            ) : null}
          </View>

          {/* conteúdo */}
          <View style={{ marginTop: 10 }}>
            <View style={styles.row}>
              <Feather name={feedback.tipo === "AUDIO" ? "mic" : "message-square"} size={14} />
              <Text style={styles.itemTitle}>
                {feedback.tipo === "AUDIO" ? "Feedback (áudio)" : "Feedback"}
              </Text>
            </View>
            <Text style={[styles.body, { marginTop: 6 }]}>
              {feedback.tipo === "AUDIO"
                ? (feedback.arquivo ? `Áudio anexado: ${feedback.arquivo}` : "Sem arquivo de áudio.") +
                  (feedback.conteudo ? `\n\n${feedback.conteudo}` : "")
                : feedback.conteudo || "(sem texto)"}
            </Text>
          </View>

          {/* ações rápidas */}
          <View style={[styles.rowWrap, { marginTop: 12 }]}>
            {statusChips.map((st) => (
              <Pressable
                key={st}
                disabled={busy || feedback.status === st}
                onPress={() => updateStatus(st)}
                android_ripple={{ color: "#E5E7EB" }}
                style={({ pressed }) => [
                  styles.chip,
                  feedback.status === st ? styles.chipActive : styles.chipInactive,
                  (pressed || busy) && styles.pressed,
                  busy && { opacity: 0.6 },
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    feedback.status === st ? styles.chipTextActive : styles.chipTextInactive,
                  ]}
                >
                  {st.replace("_", " ")}
                </Text>
              </Pressable>
            ))}

            <Pressable
              disabled={busy || !!feedback.criar_tarefa}
              onPress={createTaskFromFeedback}
              android_ripple={{ color: "#11182722" }}
              style={({ pressed }) => [
                styles.primaryBtn,
                (pressed || busy) && styles.pressedDark,
                !!feedback.criar_tarefa && styles.btnDisabled,
              ]}
            >
              <Feather name="check-square" size={16} color="#fff" />
              <Text style={styles.primaryBtnText}>
                {feedback.criar_tarefa ? "Tarefa criada" : "Criar tarefa"}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Respostas */}
        <View style={[styles.card, { marginTop: 12 }]}>
          <Text style={styles.sectionTitle}>Respostas</Text>

          {respostas.length > 0 ? (
            <View style={{ marginTop: 8, gap: 10 }}>
              {respostas.map((r) => (
                <View key={r.id} style={styles.replyRow}>
                  <View style={styles.avatarXs}>
                    {r.autor?.avatar ? (
                      <Image source={{ uri: r.autor.avatar }} style={styles.avatarXsImg} />
                    ) : (
                      <Feather name="user" size={12} />
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={styles.rowBetween}>
                      <Text style={styles.itemTitle}>{r.autor?.nome ?? "Autor"}</Text>
                      <Text style={styles.mutedSmall}>{formatDateBR(r.criado_em)}</Text>
                    </View>
                    <Text style={styles.body}>
                      {r.tipo === "AUDIO"
                        ? (r.arquivo ? `Áudio: ${r.arquivo}` : "Resposta em áudio") +
                          (r.conteudo ? `\n\n${r.conteudo}` : "")
                        : r.conteudo}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.mutedSmall}>Nenhuma resposta ainda.</Text>
          )}

          {/* responder */}
          <View style={{ marginTop: 12 }}>
            <TextInput
              placeholder="Escreva uma resposta..."
              value={reply}
              onChangeText={setReply}
              style={styles.input}
              multiline
            />
            <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
              <Pressable
                disabled={busy}
                onPress={sendReply}
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
                onPress={() => setReply("")}
                android_ripple={{ color: "#E5E7EB" }}
                style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}
              >
                <Feather name="x" size={16} />
                <Text style={styles.secondaryBtnText}>Limpar</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ===== Estilos =====
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  center: { alignItems: "center", justifyContent: "center", padding: 16 },
  error: { color: "#DC2626", fontWeight: "700" },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  iconCircle: {
    width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: "#E5E7EB", backgroundColor: "#F9FAFB",
  },
  h1: { fontSize: 18, fontWeight: "700" },

  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 12,
    marginHorizontal: 12,
  },

  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  rowWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center" },

  avatarSm: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: "#EEF2FF",
    alignItems: "center", justifyContent: "center", marginRight: 4,
  },
  avatarSmImg: { width: 28, height: 28, borderRadius: 14 },

  avatarXs: {
    width: 22, height: 22, borderRadius: 11, backgroundColor: "#EEF2FF",
    alignItems: "center", justifyContent: "center", marginRight: 8,
  },
  avatarXsImg: { width: 22, height: 22, borderRadius: 11 },

  badge: { paddingVertical: 4, paddingHorizontal: 8, borderRadius: 999 },
  badgeText: { fontSize: 11, fontWeight: "700" },
  badgeBlue: { backgroundColor: "#DBEAFE" },
  badgeYellow: { backgroundColor: "#FEF3C7" },
  badgeGreen: { backgroundColor: "#DCFCE7" },
  badgeGray: { backgroundColor: "#E5E7EB" },

  sectionTitle: { fontSize: 16, fontWeight: "700" },

  itemTitle: { fontWeight: "600" },
  mutedSmall: { fontSize: 12, opacity: 0.7 },
  body: { fontSize: 14, lineHeight: 20 },

  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },

  chip: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999, borderWidth: 1 },
  chipActive: { backgroundColor: "#0b0e11", borderColor: "#0b0e11" },
  chipInactive: { backgroundColor: "#fff", borderColor: "#E5E7EB" },
  chipText: { fontSize: 12, fontWeight: "600" },
  chipTextActive: { color: "#fff" },
  chipTextInactive: { color: "#0b0e11" },

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

  preview: {
    width: "100%",
    aspectRatio: 16 / 9,
    borderRadius: 10,
    backgroundColor: "#F3F4F6",
  },

    replyRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,               
    paddingVertical: 6,
  },
});
