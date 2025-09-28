import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { supabase } from "../../lib/supabase";
import { RouteProp, useRoute } from "@react-navigation/native";
import type { ClientesStackParamList } from "../../Root/AppShell"; // ajuste o path

type Arte = { id: string; status: string };
type Projeto = {
  id: string;
  nome: string;
  status: string;
  orcamento: number | null;
  prazo: string | null;
  artes: Arte[];
};
type Cliente = {
  id: string;
  email: string;
  nome: string;
  telefone: string | null;
  avatar: string | null;
  ativo: boolean;
  criado_em: string;
  atualizado_em: string;
  projetos: Projeto[];
};

type DetailsRoute = RouteProp<ClientesStackParamList, "ClienteDetails">;

function formatBRL(centsOrReal: number) {
  const value = (centsOrReal ?? 0) / 100;
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}
function formatDateISO(date?: string | null) {
  if (!date) return "-";
  const d = new Date(date);
  return isNaN(d.getTime()) ? "-" : d.toLocaleDateString("pt-BR");
}

export default function ClienteDetailsScreen() {
  const { params } = useRoute<DetailsRoute>();
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data, error } = await supabase
          .from("usuarios")
          .select(`
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
          `)
          .eq("id", params.id)
          .single();

        if (error) throw error;
        if (!mounted) return;
        setCliente(data as any);
      } catch (e: any) {
        console.error(e);
        setError("Não foi possível carregar o cliente.");
      } finally {
        setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [params.id]);

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.center]}>
        <ActivityIndicator />
        <Text style={{ marginTop: 8 }}>Carregando cliente...</Text>
      </SafeAreaView>
    );
  }
  if (error || !cliente) {
    return (
      <SafeAreaView style={[styles.container, styles.center]}>
        <Text style={styles.error}>{error ?? "Cliente não encontrado."}</Text>
      </SafeAreaView>
    );
  }

  const orcamentoTotal = cliente.projetos.reduce((acc, p) => acc + (p.orcamento || 0), 0);
  const aprovadas = cliente.projetos.reduce(
    (acc, p) => acc + (p.artes?.filter((a) => a.status === "APROVADO").length || 0),
    0
  );
  const totalArtes = cliente.projetos.reduce((acc, p) => acc + (p.artes?.length || 0), 0);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={styles.avatarLg}>
          {cliente.avatar ? (
            <Image source={{ uri: cliente.avatar }} style={styles.avatarLgImg} />
          ) : (
            <Feather name="user" size={28} />
          )}
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.title}>{cliente.nome}</Text>
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
        <View style={[styles.badge, cliente.ativo ? styles.badgeOk : styles.badgeMuted]}>
          <Feather name={cliente.ativo ? "check-circle" : "clock"} size={12} />
          <Text style={[styles.badgeText, { marginLeft: 4 }]}>
            {cliente.ativo ? "Ativo" : "Inativo"}
          </Text>
        </View>
      </View>

      {/* Resumo */}
      <View style={styles.summaryGrid}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryBig}>{cliente.projetos.length}</Text>
          <Text style={styles.mutedSmall}>Projetos</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryBig}>{totalArtes}</Text>
          <Text style={styles.mutedSmall}>Artes</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryBig}>{aprovadas}</Text>
          <Text style={styles.mutedSmall}>Aprovadas</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryBig}>{formatBRL(orcamentoTotal)}</Text>
          <Text style={styles.mutedSmall}>Orçamento Total</Text>
        </View>
      </View>

      {/* Projetos */}
      <Text style={[styles.sectionTitle, { marginTop: 16 }]}>Projetos</Text>
      <FlatList
        data={cliente.projetos}
        keyExtractor={(p) => p.id}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        renderItem={({ item }) => (
          <View style={styles.projectCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.projectName} numberOfLines={1}>
                {item.nome}
              </Text>
              <View style={styles.rowSm}>
                <Feather name="calendar" size={14} />
                <Text style={styles.muted}>Prazo: {formatDateISO(item.prazo)}</Text>
              </View>
            </View>
            <View
              style={[
                styles.pill,
                item.status === "EM_ANDAMENTO" ? styles.pillOk : styles.pillMuted,
              ]}
            >
              <Text style={styles.pillText}>
                {item.status === "EM_ANDAMENTO"
                  ? "Ativo"
                  : item.status === "CONCLUIDO"
                  ? "Concluído"
                  : item.status}
              </Text>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={[styles.projectCard, { justifyContent: "center", alignItems: "center" }]}>
            <Text style={styles.muted}>Nenhum projeto</Text>
          </View>
        }
        contentContainerStyle={{ paddingBottom: 24 }}
      />

      <Text style={styles.mutedSmall}>Cliente desde {formatDateISO(cliente.criado_em)}</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  center: { alignItems: "center", justifyContent: "center" },
  error: { color: "#DC2626", fontWeight: "700" },

  headerRow: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  avatarLg: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: "#EEF2FF",
    alignItems: "center", justifyContent: "center",
  },
  avatarLgImg: { width: 56, height: 56, borderRadius: 28 },
  title: { fontSize: 20, fontWeight: "700" },
  rowSm: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 },
  muted: { opacity: 0.75 },

  badge: { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 4, paddingHorizontal: 8, borderRadius: 999, marginLeft: 12 },
  badgeOk: { backgroundColor: "#DCFCE7" },
  badgeMuted: { backgroundColor: "#E5E7EB" },
  badgeText: { fontSize: 12, fontWeight: "700" },

  summaryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 4 },
  summaryCard: { flexBasis: "24%", flexGrow: 1, padding: 12, backgroundColor: "#F4F4F5", borderRadius: 10 },
  summaryBig: { fontSize: 16, fontWeight: "700" },
  mutedSmall: { fontSize: 12, opacity: 0.7 },

  sectionTitle: { fontSize: 16, fontWeight: "700" },

  projectCard: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, backgroundColor: "#fff", borderRadius: 12, borderWidth: 1, borderColor: "#E5E7EB" },
  projectName: { fontSize: 14, fontWeight: "700" },

  pill: { paddingVertical: 2, paddingHorizontal: 8, borderRadius: 999 },
  pillOk: { backgroundColor: "#0EA5E9" },
  pillMuted: { backgroundColor: "#E5E7EB" },
  pillText: { fontSize: 11, fontWeight: "700", color: "#fff" },
});
