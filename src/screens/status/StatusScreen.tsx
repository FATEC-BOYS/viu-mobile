// src/screens/status/StatusScreen.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { supabase } from "../../lib/supabase"; // ajuste o caminho se necessário

type KPI = {
  projetosAtivos: number;
  projetosConcluidos: number;
  tarefasPendentes: number;
  tarefasEmAndamento: number;
  artesEmAnalise: number;
  feedbacksAbertos: number;
  notificacoesNaoLidas: number;
};

type Projeto = {
  id: string;
  nome: string;
  status: "EM_ANDAMENTO" | "CONCLUIDO" | "PAUSADO";
  prazo?: string | null;
  cliente_id: string;
  designer_id: string;
};

type Tarefa = {
  id: string;
  titulo: string;
  status: "PENDENTE" | "EM_ANDAMENTO" | "CONCLUIDA" | "CANCELADA";
  prioridade: "ALTA" | "MEDIA" | "BAIXA";
  prazo?: string | null;
  projeto_id?: string | null;
};

type Feedback = {
  id: string;
  status: "ABERTO" | "EM_ANALISE" | "RESOLVIDO" | "ARQUIVADO";
  conteudo: string;
  arte_id: string;
  criado_em: string;
};

function formatDateBR(date?: string | null) {
  if (!date) return "-";
  const d = new Date(date);
  return isNaN(d.getTime()) ? "-" : d.toLocaleDateString("pt-BR");
}
function pct(n: number, d: number) {
  if (!d) return 0;
  return Math.round((n / d) * 100);
}

export default function StatusScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [usuarioId, setUsuarioId] = useState<string | null>(null);
  const [perfil, setPerfil] = useState<"DESIGNER" | "CLIENTE" | "TODOS">("TODOS");

  // KPIs
  const [kpi, setKpi] = useState<KPI>({
    projetosAtivos: 0,
    projetosConcluidos: 0,
    tarefasPendentes: 0,
    tarefasEmAndamento: 0,
    artesEmAnalise: 0,
    feedbacksAbertos: 0,
    notificacoesNaoLidas: 0,
  });

  // listas
  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [projetos, setProjetos] = useState<Projeto[]>([]);
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);

  // ===== Auth → usuario_id + tipo =====
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
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

        const uid = link?.usuario_id as string;
        if (mounted) setUsuarioId(uid ?? null);

        // descobre tipo do usuário
        const { data: u } = await supabase
          .from("usuarios")
          .select("tipo")
          .eq("id", uid)
          .single();

        if (u?.tipo === "DESIGNER") setPerfil("DESIGNER");
        else if (u?.tipo === "CLIENTE") setPerfil("CLIENTE");
        else setPerfil("TODOS");
      } catch (e) {
        console.warn("auth/status", e);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // ===== Fetch KPIs e listas =====
  const fetchAll = useCallback(async () => {
    if (!usuarioId) return;

    try {
      setLoading(true);

      // Filtros por perfil (para RLS/escopo)
      // - Designer: projetos onde designer_id = usuarioId; tarefas onde responsavel_id = usuarioId; artes autor_id = usuarioId; feedbacks do autor ou da arte vinculada aos seus projetos/arts se RLS permitir.
      // - Cliente: projetos onde cliente_id = usuarioId; tarefas do projeto do cliente (se quiser afunilar) — aqui manteremos só tarefas do responsável = usuarioId para simplificar; feedbacks do autor = usuarioId.
      // - Todos: combina os dois. (usamos OR em alguns selects)

      // KPIs (count head)
      const [
        projAtivosDesigner,
        projAtivosCliente,
        projConclDesigner,
        projConclCliente,
        tPend,
        tEmAnd,
        artesAnalise,
        fbsAbertosAutor,
        notis,
      ] = await Promise.all([
        supabase
          .from("projetos")
          .select("id", { count: "exact", head: true })
          .eq("status", "EM_ANDAMENTO")
          .eq("designer_id", usuarioId),
        supabase
          .from("projetos")
          .select("id", { count: "exact", head: true })
          .eq("status", "EM_ANDAMENTO")
          .eq("cliente_id", usuarioId),
        supabase
          .from("projetos")
          .select("id", { count: "exact", head: true })
          .eq("status", "CONCLUIDO")
          .eq("designer_id", usuarioId),
        supabase
          .from("projetos")
          .select("id", { count: "exact", head: true })
          .eq("status", "CONCLUIDO")
          .eq("cliente_id", usuarioId),
        supabase
          .from("tarefas")
          .select("id", { count: "exact", head: true })
          .eq("responsavel_id", usuarioId)
          .eq("status", "PENDENTE"),
        supabase
          .from("tarefas")
          .select("id", { count: "exact", head: true })
          .eq("responsavel_id", usuarioId)
          .eq("status", "EM_ANDAMENTO"),
        supabase
          .from("artes")
          .select("id", { count: "exact", head: true })
          .eq("autor_id", usuarioId)
          .eq("status", "EM_ANALISE"),
        supabase
          .from("feedbacks")
          .select("id", { count: "exact", head: true })
          .eq("autor_id", usuarioId)
          .eq("status", "ABERTO"),
        supabase
          .from("notificacoes")
          .select("id", { count: "exact", head: true })
          .eq("usuario_id", usuarioId)
          .eq("lida", false),
      ]);

      const projetosAtivos =
        (perfil !== "CLIENTE" ? projAtivosDesigner.count ?? 0 : 0) +
        (perfil !== "DESIGNER" ? projAtivosCliente.count ?? 0 : 0);
      const projetosConcluidos =
        (perfil !== "CLIENTE" ? projConclDesigner.count ?? 0 : 0) +
        (perfil !== "DESIGNER" ? projConclCliente.count ?? 0 : 0);

      setKpi({
        projetosAtivos,
        projetosConcluidos,
        tarefasPendentes: tPend.count ?? 0,
        tarefasEmAndamento: tEmAnd.count ?? 0,
        artesEmAnalise: artesAnalise.count ?? 0,
        feedbacksAbertos: fbsAbertosAutor.count ?? 0,
        notificacoesNaoLidas: notis.count ?? 0,
      });

      // listas curtas
      const [tPendentes, projAndamento, fbsAbertos] = await Promise.all([
        supabase
          .from("tarefas")
          .select("id, titulo, status, prioridade, prazo, projeto_id")
          .eq("responsavel_id", usuarioId)
          .in("status", ["PENDENTE", "EM_ANDAMENTO"])
          .order("prazo", { ascending: true, nullsFirst: true })
          .limit(10),
        (async () => {
          // combinando designer/cliente dependendo do perfil
          const base = supabase
            .from("projetos")
            .select("id, nome, status, prazo, cliente_id, designer_id")
            .eq("status", "EM_ANDAMENTO")
            .order("prazo", { ascending: true, nullsFirst: true })
            .limit(10);
          if (perfil === "DESIGNER") return base.eq("designer_id", usuarioId);
          if (perfil === "CLIENTE") return base.eq("cliente_id", usuarioId);
          // TODOS: buscar os dois e mesclar (mantendo únicos)
          const [d, c] = await Promise.all([
            base.eq("designer_id", usuarioId),
            supabase
              .from("projetos")
              .select("id, nome, status, prazo, cliente_id, designer_id")
              .eq("status", "EM_ANDAMENTO")
              .eq("cliente_id", usuarioId)
              .order("prazo", { ascending: true, nullsFirst: true })
              .limit(10),
          ]);
          const set = new Map<string, Projeto>();
          (d.data ?? []).forEach((p: any) => set.set(p.id, p));
          (c.data ?? []).forEach((p: any) => set.set(p.id, p));
          return { data: Array.from(set.values()), error: d.error ?? c.error };
        })(),
        supabase
          .from("feedbacks")
          .select("id, status, conteudo, arte_id, criado_em")
          .eq("autor_id", usuarioId)
          .eq("status", "ABERTO")
          .order("criado_em", { ascending: false })
          .limit(10),
      ]);

      if (tPendentes.error) throw tPendentes.error;
      if ((projAndamento as any).error) throw (projAndamento as any).error;
      if (fbsAbertos.error) throw fbsAbertos.error;

      setTarefas((tPendentes.data as any) ?? []);
      setProjetos((((projAndamento as any).data as any) ?? []) as Projeto[]);
      setFeedbacks((fbsAbertos.data as any) ?? []);
    } catch (e: any) {
      Alert.alert("Erro", e?.message ?? "Não foi possível carregar o status.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [usuarioId, perfil]);

  useEffect(() => {
    if (usuarioId) fetchAll();
  }, [usuarioId, perfil, fetchAll]);

  async function onRefresh() {
    setRefreshing(true);
    await fetchAll();
  }

  const totalProjetos = useMemo(
    () => kpi.projetosAtivos + kpi.projetosConcluidos,
    [kpi.projetosAtivos, kpi.projetosConcluidos]
  );

  if (loading && !usuarioId) {
    return (
      <SafeAreaView style={[styles.container, styles.center]}>
        <ActivityIndicator />
        <Text style={{ marginTop: 8 }}>Carregando...</Text>
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
          <View>
            <Text style={styles.h1}>Status</Text>
            <Text style={styles.subtitle}>Visão geral do seu trabalho</Text>
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

        {/* Filtro de perfil */}
        <View style={styles.rowWrap}>
          {(["TODOS", "DESIGNER", "CLIENTE"] as const).map((p) => (
            <Pressable
              key={p}
              onPress={() => setPerfil(p)}
              android_ripple={{ color: "#E5E7EB" }}
              style={({ pressed }) => [
                styles.chip,
                perfil === p ? styles.chipActive : styles.chipInactive,
                pressed && styles.pressed,
              ]}
            >
              <Text
                style={[
                  styles.chipText,
                  perfil === p ? styles.chipTextActive : styles.chipTextInactive,
                ]}
              >
                {p}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* KPIs */}
        <View style={styles.kpiGrid}>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiNumber}>{kpi.projetosAtivos}</Text>
            <Text style={styles.kpiLabel}>Projetos Ativos</Text>
            <Text style={styles.kpiSub}>
              {totalProjetos ? `${pct(kpi.projetosAtivos, totalProjetos)}% do total` : "—"}
            </Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiNumber}>{kpi.projetosConcluidos}</Text>
            <Text style={styles.kpiLabel}>Projetos Concluídos</Text>
            <Text style={styles.kpiSub}>
              {totalProjetos ? `${pct(kpi.projetosConcluidos, totalProjetos)}% do total` : "—"}
            </Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiNumber}>{kpi.tarefasPendentes}</Text>
            <Text style={styles.kpiLabel}>Tarefas Pendentes</Text>
            <Text style={styles.kpiSub}>+ {kpi.tarefasEmAndamento} em andamento</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiNumber}>{kpi.artesEmAnalise}</Text>
            <Text style={styles.kpiLabel}>Artes em Análise</Text>
            <Text style={styles.kpiSub}>
              {kpi.feedbacksAbertos} feedback{ kpi.feedbacksAbertos === 1 ? "" : "s"} aberto{ kpi.feedbacksAbertos === 1 ? "" : "s"}
            </Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiNumber}>{kpi.notificacoesNaoLidas}</Text>
            <Text style={styles.kpiLabel}>Notificações</Text>
            <Text style={styles.kpiSub}>não lidas</Text>
          </View>
        </View>

        {/* Seções de listas */}
        {/* Tarefas pendentes */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.row}>
              <Feather name="check-square" size={16} />
              <Text style={styles.sectionTitle}>Tarefas pendentes</Text>
            </View>
            <Text style={styles.mutedSmall}>{tarefas.length} itens</Text>
          </View>

          {tarefas.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.mutedSmall}>Sem tarefas pendentes.</Text>
            </View>
          ) : (
            <FlatList
              data={tarefas}
              keyExtractor={(i) => i.id}
              scrollEnabled={false}
              ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
              renderItem={({ item }) => (
                <View style={styles.itemCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemTitle}>{item.titulo}</Text>
                    <Text style={styles.mutedSmall}>
                      {item.prioridade} · {item.status}
                      {item.prazo ? ` · prazo ${formatDateBR(item.prazo)}` : ""}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.pill,
                      item.status === "PENDENTE" ? styles.pillAmber : styles.pillBlue,
                    ]}
                  >
                    <Text style={styles.pillText}>
                      {item.status === "PENDENTE" ? "Pendente" : "Em andamento"}
                    </Text>
                  </View>
                </View>
              )}
            />
          )}
        </View>

        {/* Projetos em andamento */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.row}>
              <Feather name="folder" size={16} />
              <Text style={styles.sectionTitle}>Projetos em andamento</Text>
            </View>
            <Text style={styles.mutedSmall}>{projetos.length} itens</Text>
          </View>

          {projetos.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.mutedSmall}>Sem projetos ativos.</Text>
            </View>
          ) : (
            <FlatList
              data={projetos}
              keyExtractor={(i) => i.id}
              scrollEnabled={false}
              ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
              renderItem={({ item }) => (
                <View style={styles.itemCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemTitle}>{item.nome}</Text>
                    <Text style={styles.mutedSmall}>
                      {item.status.replace("_", " ")}
                      {item.prazo ? ` · prazo ${formatDateBR(item.prazo)}` : ""}
                    </Text>
                  </View>
                  <View style={[styles.pill, styles.pillBlue]}>
                    <Text style={styles.pillText}>Ativo</Text>
                  </View>
                </View>
              )}
            />
          )}
        </View>

        {/* Feedbacks abertos */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.row}>
              <Feather name="message-square" size={16} />
              <Text style={styles.sectionTitle}>Feedbacks abertos</Text>
            </View>
            <Text style={styles.mutedSmall}>{feedbacks.length} itens</Text>
          </View>

          {feedbacks.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.mutedSmall}>Sem feedbacks abertos.</Text>
            </View>
          ) : (
            <FlatList
              data={feedbacks}
              keyExtractor={(i) => i.id}
              scrollEnabled={false}
              ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
              renderItem={({ item }) => (
                <View style={styles.itemCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemTitle} numberOfLines={1}>
                      {item.conteudo || "(sem texto)"}
                    </Text>
                    <Text style={styles.mutedSmall}>
                      {item.status.replace("_", " ")} · {formatDateBR(item.criado_em)}
                    </Text>
                  </View>
                  <View style={[styles.pill, styles.pillAmber]}>
                    <Text style={styles.pillText}>Aberto</Text>
                  </View>
                </View>
              )}
            />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ===== estilos =====
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  center: { alignItems: "center", justifyContent: "center", padding: 16 },

  headerRow: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  h1: { fontSize: 22, fontWeight: "800" },
  subtitle: { opacity: 0.7, marginTop: 2 },

  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#0b0e11",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  primaryBtnText: { color: "#fff", fontWeight: "700" },
  pressed: { opacity: Platform.OS === "ios" ? 0.6 : 0.9 },
  pressedDark: { opacity: 0.9 },

  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  rowWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 6,
  },

  chip: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999, borderWidth: 1 },
  chipActive: { backgroundColor: "#0b0e11", borderColor: "#0b0e11" },
  chipInactive: { backgroundColor: "#fff", borderColor: "#E5E7EB" },
  chipText: { fontSize: 12, fontWeight: "600" },
  chipTextActive: { color: "#fff" },
  chipTextInactive: { color: "#0b0e11" },

  kpiGrid: { paddingHorizontal: 16, marginTop: 8, flexDirection: "row", flexWrap: "wrap", gap: 8 },
  kpiCard: { flexBasis: "48%", flexGrow: 1, backgroundColor: "#F4F4F5", borderRadius: 12, padding: 12 },
  kpiNumber: { fontSize: 20, fontWeight: "800" },
  kpiLabel: { fontSize: 12, opacity: 0.8, marginTop: 2 },
  kpiSub: { fontSize: 11, opacity: 0.7, marginTop: 2 },

  section: { paddingHorizontal: 16, marginTop: 16 },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  sectionTitle: { fontSize: 16, fontWeight: "700" },

  emptyCard: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
  },

  itemCard: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  itemTitle: { fontWeight: "700" },
  mutedSmall: { fontSize: 12, opacity: 0.7 },

  pill: { paddingVertical: 4, paddingHorizontal: 8, borderRadius: 999 },
  pillText: { fontSize: 11, fontWeight: "700" },
  pillBlue: { backgroundColor: "#DBEAFE" },
  pillAmber: { backgroundColor: "#FEF3C7" },
});
