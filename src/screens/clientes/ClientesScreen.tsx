// src/screens/clientes/ClientesScreen.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { supabase } from "../../lib/supabase"; // ajuste se necessário
import { useTheme } from "../../theme/ThemeProvider";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { ClientesStackParamList } from "../../Root/AppShell"; // ajuste o path se necessário

// ===== Tipos =====
type Arte = { id: string; status: string };
type Projeto = {
  id: string;
  nome: string;
  status: string;
  orcamento: number | null;
  prazo: string | null;
  artes: Arte[];
};
export interface Cliente {
  id: string;
  email: string;
  nome: string;
  telefone: string | null;
  avatar: string | null;
  ativo: boolean;
  criado_em: string;
  atualizado_em: string;
  projetos: Projeto[];
}

// ===== Helpers =====
function formatDateISO(date: string) {
  const d = new Date(date);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("pt-BR");
}
function formatBRL(centsOrReal: number) {
  const value = (centsOrReal ?? 0) / 100;
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}
function initialsOf(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .map((n) => n[0]?.toUpperCase() ?? "")
    .join("")
    .slice(0, 2);
}

// ===== Chip =====
function Chip({
  active,
  onPress,
  children,
}: {
  active?: boolean;
  onPress?: () => void;
  children: React.ReactNode;
}) {
  return (
    <Pressable
      onPress={onPress}
      android_ripple={{ color: "#E5E7EB", borderless: false }}
      style={({ pressed }) => [
        styles.chip,
        active ? styles.chipActive : styles.chipInactive,
        pressed && styles.pressed,
      ]}
    >
      <Text style={[styles.chipText, active ? styles.chipTextActive : styles.chipTextInactive]}>
        {children as any}
      </Text>
    </Pressable>
  );
}

// ===== Card de Cliente =====
function ClienteCard({
  cliente,
  onPress,
}: {
  cliente: Cliente;
  onPress?: () => void;
}) {
  const totalProjetos = cliente.projetos.length;
  const projetosAtivos = cliente.projetos.filter((p) => p.status === "EM_ANDAMENTO").length;
  const projetosConcluidos = cliente.projetos.filter((p) => p.status === "CONCLUIDO").length;

  const totalArtes = cliente.projetos.reduce((acc, p) => acc + (p.artes?.length || 0), 0);
  const artesAprovadas = cliente.projetos.reduce(
    (acc, p) => acc + (p.artes?.filter((a) => a.status === "APROVADO").length || 0),
    0
  );

  const orcamentoTotal = cliente.projetos.reduce((acc, p) => acc + (p.orcamento || 0), 0);

  const proximoPrazo = [...cliente.projetos]
    .filter((p) => p.prazo && p.status === "EM_ANDAMENTO")
    .sort((a, b) => new Date(a.prazo!).getTime() - new Date(b.prazo!).getTime())[0];

  return (
    <Pressable
      onPress={onPress}
      android_ripple={{ color: "#E5E7EB" }}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.cardHeader}>
        <View style={{ flexDirection: "row", gap: 12, alignItems: "center", flex: 1 }}>
          <View style={styles.avatar}>
            {cliente.avatar ? (
              <Image source={{ uri: cliente.avatar }} style={styles.avatarImg} />
            ) : (
              <Text style={styles.avatarInitials}>{initialsOf(cliente.nome)}</Text>
            )}
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>{cliente.nome}</Text>
            <View style={styles.rowSm}>
              <Feather name="mail" size={14} />
              <Text style={styles.muted}>{cliente.email}</Text>
            </View>
            {cliente.telefone ? (
              <View style={styles.rowSm}>
                <Feather name="phone" size={14} />
                <Text style={styles.muted}>{cliente.telefone}</Text>
              </View>
            ) : null}
          </View>
        </View>

        <View style={[styles.badge, cliente.ativo ? styles.badgeOk : styles.badgeMuted]}>
          <Feather name={cliente.ativo ? "check-circle" : "clock"} size={12} />
          <Text style={[styles.badgeText, { marginLeft: 4 }]}>
            {cliente.ativo ? "Ativo" : "Inativo"}
          </Text>
        </View>
      </View>

      <View style={styles.cardBody}>
        {/* Estatísticas */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{totalProjetos}</Text>
            <Text style={styles.statLabel}>Projetos</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{projetosConcluidos}</Text>
            <Text style={styles.statLabel}>Concluídos</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{projetosAtivos}</Text>
            <Text style={styles.statLabel}>Ativos</Text>
          </View>
        </View>

        {/* Progresso de artes */}
        {totalArtes > 0 && (
          <View style={{ gap: 6 }}>
            <View style={styles.rowBetween}>
              <View style={styles.rowSm}>
                <Feather name="check-circle" size={14} />
                <Text style={styles.small}>Artes Aprovadas</Text>
              </View>
              <Text style={styles.small}>
                {artesAprovadas}/{totalArtes}
              </Text>
            </View>
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${(artesAprovadas / totalArtes) * 100}%` },
                ]}
              />
            </View>
          </View>
        )}

        {/* Infos adicionais */}
        <View style={{ gap: 6, marginTop: 6 }}>
          {orcamentoTotal > 0 ? (
            <View style={styles.rowBetween}>
              <View style={styles.rowSm}>
                <Feather name="dollar-sign" size={14} />
                <Text style={styles.muted}>Orçamento Total</Text>
              </View>
              <Text style={styles.boldGreen}>{formatBRL(orcamentoTotal)}</Text>
            </View>
          ) : null}

          {proximoPrazo ? (
            <View style={styles.rowBetween}>
              <View style={styles.rowSm}>
                <Feather name="calendar" size={14} />
                <Text style={styles.muted}>Próximo Prazo</Text>
              </View>
              <Text style={styles.small}>{formatDateISO(proximoPrazo.prazo!)}</Text>
            </View>
          ) : null}
        </View>

        {/* Projetos recentes */}
        {cliente.projetos.length > 0 && (
          <View style={{ marginTop: 10, gap: 6 }}>
            <View style={styles.rowSm}>
              <Feather name="folder" size={14} />
              <Text style={styles.smallBold}>Projetos Recentes</Text>
            </View>

            <View style={{ gap: 4 }}>
              {cliente.projetos.slice(0, 2).map((p) => (
                <View key={p.id} style={styles.rowBetween}>
                  <Text style={[styles.small, { flex: 1 }]} numberOfLines={1}>
                    {p.nome}
                  </Text>
                  <View
                    style={[
                      styles.pill,
                      p.status === "EM_ANDAMENTO" ? styles.pillOk : styles.pillMuted,
                    ]}
                  >
                    <Text style={styles.pillText}>
                      {p.status === "EM_ANDAMENTO"
                        ? "Ativo"
                        : p.status === "CONCLUIDO"
                        ? "Concluído"
                        : p.status}
                    </Text>
                  </View>
                </View>
              ))}
              {cliente.projetos.length > 2 ? (
                <Text style={styles.mutedSmall}>+{cliente.projetos.length - 2} outros projetos</Text>
              ) : null}
            </View>
          </View>
        )}

        <View style={styles.separator} />
        <Text style={styles.mutedSmall}>Cliente desde {formatDateISO(cliente.criado_em)}</Text>
      </View>
    </Pressable>
  );
}

// ===== Tela Principal =====
export default function ClientesScreen() {
  const { t } = useTheme();
  const nav = useNavigation<NativeStackNavigationProp<ClientesStackParamList>>();

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"todos" | "ativo" | "inativo">("todos");
  const [sortBy, setSortBy] = useState<"nome" | "email" | "projetos" | "orcamento" | "criado_em">(
    "nome"
  );

  // fetch
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data, error } = await supabase
          .from("usuarios")
          .select(
            `
            id,
            email,
            nome,
            telefone,
            avatar,
            ativo,
            criado_em,
            atualizado_em,
            projetos:projetos!cliente_id (
              id,
              nome,
              status,
              orcamento,
              prazo,
              artes ( id, status )
            )
          `
          )
          .eq("tipo", "CLIENTE")
          .order("nome", { ascending: true });

        if (error) throw error;
        if (!mounted) return;

        setClientes((data as any) ?? []);
      } catch (e: any) {
        console.error(e);
        setError("Não foi possível carregar os clientes.");
      } finally {
        setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  // derivados
  const filteredClientes = useMemo(() => {
    let arr = [...clientes];

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      arr = arr.filter(
        (c) =>
          c.nome.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q) ||
          (c.telefone && c.telefone.includes(searchTerm)) ||
          c.projetos.some((p) => p.nome.toLowerCase().includes(q))
      );
    }

    if (statusFilter !== "todos") {
      arr = arr.filter((c) => (statusFilter === "ativo" ? c.ativo : !c.ativo));
    }

    arr.sort((a, b) => {
      switch (sortBy) {
        case "nome":
          return a.nome.localeCompare(b.nome);
        case "email":
          return a.email.localeCompare(b.email);
        case "projetos":
          return b.projetos.length - a.projetos.length;
        case "orcamento": {
          const oa = a.projetos.reduce((acc, p) => acc + (p.orcamento || 0), 0);
          const ob = b.projetos.reduce((acc, p) => acc + (p.orcamento || 0), 0);
          return ob - oa;
        }
        case "criado_em":
          return new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime();
        default:
          return 0;
      }
    });

    return arr;
  }, [clientes, searchTerm, statusFilter, sortBy]);

  const stats = useMemo(() => {
    const total = clientes.length;
    const ativos = clientes.filter((c) => c.ativo).length;
    const inativos = total - ativos;
    const comProjetos = clientes.filter((c) => c.projetos.length > 0).length;
    const semProjetos = total - comProjetos;
    return { total, ativos, inativos, comProjetos, semProjetos };
  }, [clientes]);

  // UI states
  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.center]}>
        <ActivityIndicator />
        <Text style={{ marginTop: 8 }}>Carregando clientes...</Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={[styles.container, styles.center]}>
        <Text style={styles.error}>{error}</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.h1}>Clientes</Text>
          <Text style={styles.subtitle}>Gerencie todos os seus clientes e relacionamentos</Text>
        </View>
        <Pressable
          onPress={() => {}}
          android_ripple={{ color: "#11182722" }}
          style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressedDark]}
        >
          <Feather name="user-plus" size={16} color="#fff" />
          <Text style={styles.primaryBtnText}>Novo Cliente</Text>
        </Pressable>
      </View>

      {/* Estatísticas */}
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statBig}>{stats.total}</Text>
          <Text style={styles.mutedSmall}>Total de Clientes</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statBig}>{stats.ativos}</Text>
          <Text style={styles.mutedSmall}>Ativos</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statBig}>{stats.inativos}</Text>
          <Text style={styles.mutedSmall}>Inativos</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statBig}>{stats.comProjetos}</Text>
          <Text style={styles.mutedSmall}>Com Projetos</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statBig}>{stats.semProjetos}</Text>
          <Text style={styles.mutedSmall}>Sem Projetos</Text>
        </View>
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
            placeholder="Buscar por nome, email, telefone ou projeto..."
            value={searchTerm}
            onChangeText={setSearchTerm}
            style={styles.input}
          />
        </View>

        <View style={styles.row}>
          <Chip active={statusFilter === "todos"} onPress={() => setStatusFilter("todos")}>
            Todos
          </Chip>
          <Chip active={statusFilter === "ativo"} onPress={() => setStatusFilter("ativo")}>
            Ativos
          </Chip>
          <Chip active={statusFilter === "inativo"} onPress={() => setStatusFilter("inativo")}>
            Inativos
          </Chip>
        </View>

        <View style={styles.rowWrap}>
          <Text style={styles.mutedSmall}>Ordenar por:</Text>
          {(["nome", "email", "projetos", "orcamento", "criado_em"] as const).map((k) => (
            <Chip key={k} active={sortBy === k} onPress={() => setSortBy(k)}>
              {k === "criado_em" ? "Mais Recente" : k[0].toUpperCase() + k.slice(1)}
            </Chip>
          ))}
        </View>
      </View>

      {/* Lista */}
      {filteredClientes.length > 0 ? (
        <FlatList
          data={filteredClientes}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 48 }}
          renderItem={({ item }) => (
            <ClienteCard
              cliente={item}
              onPress={() => nav.navigate("ClienteDetails", { id: item.id })}
            />
          )}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        />
      ) : (
        <View style={styles.emptyCard}>
          <Feather name="users" size={40} style={{ opacity: 0.5, marginBottom: 8 }} />
          <Text style={styles.emptyTitle}>Nenhum cliente encontrado</Text>
          <Text style={styles.muted}>
            {searchTerm || statusFilter !== "todos"
              ? "Tente ajustar os filtros de busca."
              : "Comece adicionando seu primeiro cliente."}
          </Text>
          {!searchTerm && statusFilter === "todos" && (
            <Pressable
              onPress={() => {}}
              android_ripple={{ color: "#11182722" }}
              style={({ pressed }) => [styles.primaryBtn, { marginTop: 12 }, pressed && styles.pressedDark]}
            >
              <Feather name="user-plus" size={16} color="#fff" />
              <Text style={styles.primaryBtnText}>Adicionar Primeiro Cliente</Text>
            </Pressable>
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

// ===== Estilos =====
const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#FFFFFF" },
  center: { alignItems: "center", justifyContent: "center" },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  h1: { fontSize: 24, fontWeight: "700" },
  subtitle: { opacity: 0.7 },

  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#0b0e11",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  primaryBtnText: { color: "white", fontWeight: "600", marginLeft: 6 },

  pressed: { opacity: Platform.OS === "ios" ? 0.6 : 0.9 },
  pressedDark: { opacity: 0.9 },

  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 },
  statCard: {
    flexBasis: "19%",
    flexGrow: 1,
    padding: 12,
    backgroundColor: "#F4F4F5",
    borderRadius: 10,
  },
  statBig: { fontSize: 18, fontWeight: "700", marginBottom: 2 },
  mutedSmall: { fontSize: 12, opacity: 0.7 },

  filters: { gap: 10, marginBottom: 8 },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingHorizontal: 32,
    paddingVertical: 8,
  },
  row: { flexDirection: "row", gap: 8, alignItems: "center" },
  rowWrap: { flexDirection: "row", gap: 8, flexWrap: "wrap", alignItems: "center" },

  chip: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999, borderWidth: 1 },
  chipActive: { backgroundColor: "#0b0e11", borderColor: "#0b0e11" },
  chipInactive: { backgroundColor: "#fff", borderColor: "#E5E7EB" },
  chipText: { fontSize: 12, fontWeight: "600" },
  chipTextActive: { color: "#fff" },
  chipTextInactive: { color: "#0b0e11" },

  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    overflow: "hidden",
  },
  cardHeader: {
    padding: 12,
    paddingBottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardBody: { padding: 12, gap: 10 },
  cardTitle: { fontSize: 16, fontWeight: "700" },
  muted: { opacity: 0.75 },
  boldGreen: { color: "#059669", fontWeight: "700" },

  rowSm: { flexDirection: "row", alignItems: "center", gap: 6 },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },

  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarImg: { width: 48, height: 48, borderRadius: 24 },
  avatarInitials: { fontWeight: "700", color: "#4338CA" },

  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 999,
  },
  badgeOk: { backgroundColor: "#DCFCE7" },
  badgeMuted: { backgroundColor: "#E5E7EB" },
  badgeText: { fontSize: 12, fontWeight: "700" },

  statsRow: { flexDirection: "row", gap: 8 },
  statBox: { flex: 1, alignItems: "center", paddingVertical: 8, backgroundColor: "#F9FAFB", borderRadius: 10 },
  statNumber: { fontSize: 18, fontWeight: "700" },
  statLabel: { fontSize: 12, opacity: 0.7 },

  progressTrack: { height: 8, borderRadius: 999, backgroundColor: "#E5E7EB", overflow: "hidden" },
  progressFill: { height: 8, borderRadius: 999, backgroundColor: "#16A34A" },

  pill: { paddingVertical: 2, paddingHorizontal: 8, borderRadius: 999 },
  pillOk: { backgroundColor: "#0EA5E9" },
  pillMuted: { backgroundColor: "#E5E7EB" },
  pillText: { fontSize: 11, fontWeight: "700", color: "#fff" },

  separator: { height: 1, backgroundColor: "#E5E7EB", marginTop: 8 },

  emptyCard: {
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginTop: 16,
  },
  emptyTitle: { fontSize: 16, fontWeight: "700", marginBottom: 6 },

  error: { color: "#DC2626", fontWeight: "700" },

  // text-utils usados no card
  small: { fontSize: 12 },
  smallBold: { fontSize: 12, fontWeight: "700" },
});
