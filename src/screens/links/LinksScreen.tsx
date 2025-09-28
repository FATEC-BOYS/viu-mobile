// src/screens/links/LinksScreen.tsx
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
} from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Random from "expo-random";
import * as Clipboard from "expo-clipboard";
import { supabase } from "../../lib/supabase"; // ajuste se necessário

type LinkCompartilhado = {
  id: string;
  token: string;
  tipo: string; // "ARTE" | "PROJETO" (ajuste conforme usa)
  arte_id: string | null;
  projeto_id: string | null;
  expira_em: string | null; // iso
  somente_leitura: boolean;
  can_comment: boolean;
  can_download: boolean;
  criado_em: string;
};

type NewLinkForm = {
  tipo: "ARTE" | "PROJETO";
  alvoId: string; // arte_id ou projeto_id
  expiraEm: string; // ISO ou vazio
  somenteLeitura: boolean;
  canComment: boolean;
  canDownload: boolean;
};

const PUBLIC_BASE_URL = "https://viu-frontend.vercel.app"; // << ajuste seu domínio
const LINK_PATH = "/link/"; // << ajuste a rota pública do link (ex: "/l/" ou "/share/")

function formatDateBR(date?: string | null) {
  if (!date) return "-";
  const d = new Date(date);
  return isNaN(d.getTime()) ? "-" : d.toLocaleDateString("pt-BR", { year: "numeric", month: "2-digit", day: "2-digit" });
}

function buildUrl(token: string) {
  return `${PUBLIC_BASE_URL}${LINK_PATH}${token}`;
}

function generateToken(len = 22) {
  // url-safe base64-ish
  const bytes = Random.getRandomBytes(16);
  const base = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  // reduz/troca pra url safe
  return base.slice(0, len);
}

export default function LinksScreen() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [links, setLinks] = useState<LinkCompartilhado[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // filtros
  const [search, setSearch] = useState("");
  const [filterTipo, setFilterTipo] = useState<"todos" | "ARTE" | "PROJETO">("todos");
  const [sortBy, setSortBy] = useState<"criado_desc" | "expira_asc">("criado_desc");

  // criação
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<NewLinkForm>({
    tipo: "ARTE",
    alvoId: "",
    expiraEm: "",
    somenteLeitura: true,
    canComment: false,
    canDownload: false,
  });

  async function fetchLinks() {
    try {
      const { data, error } = await supabase
        .from("link_compartilhado")
        .select("*")
        .order("criado_em", { ascending: false });
      if (error) throw error;
      setLinks((data as any) ?? []);
    } catch (e: any) {
      Alert.alert("Erro", e?.message ?? "Não foi possível carregar os links.");
    }
  }

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      await fetchLinks();
      if (mounted) setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  async function onRefresh() {
    setRefreshing(true);
    await fetchLinks();
    setRefreshing(false);
  }

  const view = useMemo(() => {
    let arr = [...links];

    if (filterTipo !== "todos") {
      arr = arr.filter((l) => l.tipo === filterTipo);
    }

    if (search) {
      const q = search.toLowerCase();
      arr = arr.filter(
        (l) =>
          l.token.toLowerCase().includes(q) ||
          (l.arte_id ?? "").toLowerCase().includes(q) ||
          (l.projeto_id ?? "").toLowerCase().includes(q)
      );
    }

    arr.sort((a, b) => {
      if (sortBy === "criado_desc") {
        return new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime();
      }
      // expira_asc
      const ea = a.expira_em ? new Date(a.expira_em).getTime() : Number.POSITIVE_INFINITY;
      const eb = b.expira_em ? new Date(b.expira_em).getTime() : Number.POSITIVE_INFINITY;
      return ea - eb;
    });

    return arr;
  }, [links, filterTipo, search, sortBy]);

  async function handleCopy(token: string) {
    try {
      const url = buildUrl(token);
      await Clipboard.setStringAsync(url);
      Alert.alert("Copiado!", "URL do link foi copiada para a área de transferência.");
    } catch {
      Alert.alert("Erro", "Não foi possível copiar o link.");
    }
  }

  async function handleToggle(link: LinkCompartilhado, field: "somente_leitura" | "can_comment" | "can_download") {
    try {
      const nextVal = !link[field];
      const { error } = await supabase
        .from("link_compartilhado")
        .update({ [field]: nextVal })
        .eq("id", link.id);
      if (error) throw error;
      setLinks((prev) => prev.map((l) => (l.id === link.id ? { ...l, [field]: nextVal } : l)));
    } catch (e: any) {
      Alert.alert("Erro", e?.message ?? "Não foi possível atualizar o link.");
    }
  }

  async function handleUpdateExpiry(link: LinkCompartilhado, iso: string | "") {
    try {
      const val = iso.trim() || null;
      const { error } = await supabase
        .from("link_compartilhado")
        .update({ expira_em: val })
        .eq("id", link.id);
      if (error) throw error;
      setLinks((prev) => prev.map((l) => (l.id === link.id ? { ...l, expira_em: val } : l)));
    } catch (e: any) {
      Alert.alert("Erro", e?.message ?? "Não foi possível alterar a expiração.");
    }
  }

  async function handleRevoke(id: string) {
    Alert.alert("Revogar link", "Tem certeza que deseja revogar (excluir) este link?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Revogar",
        style: "destructive",
        onPress: async () => {
          try {
            const { error } = await supabase.from("link_compartilhado").delete().eq("id", id);
            if (error) throw error;
            setLinks((prev) => prev.filter((l) => l.id !== id));
          } catch (e: any) {
            Alert.alert("Erro", e?.message ?? "Não foi possível revogar o link.");
          }
        },
      },
    ]);
  }

  async function handleCreate() {
    if (!form.alvoId.trim()) {
      Alert.alert("Atenção", `Informe o ${form.tipo === "ARTE" ? "ID da arte" : "ID do projeto"}.`);
      return;
    }
    setSaving(true);
    try {
      const token = generateToken(24);
      const payload: Partial<LinkCompartilhado> = {
        token,
        tipo: form.tipo,
        arte_id: form.tipo === "ARTE" ? form.alvoId.trim() : null,
        projeto_id: form.tipo === "PROJETO" ? form.alvoId.trim() : null,
        expira_em: form.expiraEm.trim() ? new Date(form.expiraEm.trim()).toISOString() : null,
        somente_leitura: form.somenteLeitura,
        can_comment: form.canComment,
        can_download: form.canDownload,
      };

      const { data, error } = await supabase
        .from("link_compartilhado")
        .insert(payload)
        .select("*")
        .single();

      if (error) throw error;

      setLinks((prev) => [data as any, ...prev]);
      setShowCreate(false);
      setForm({
        tipo: "ARTE",
        alvoId: "",
        expiraEm: "",
        somenteLeitura: true,
        canComment: false,
        canDownload: false,
      });
      Alert.alert("Pronto!", "Link criado com sucesso.");
    } catch (e: any) {
      Alert.alert("Erro", e?.message ?? "Não foi possível criar o link.");
    } finally {
      setSaving(false);
    }
  }

  // === UI ===

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.center]}>
        <ActivityIndicator />
        <Text style={{ marginTop: 8 }}>Carregando links...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.h1}>Links</Text>
          <Text style={styles.subtitle}>Gerencie os links compartilhados (arte e projeto)</Text>
        </View>
        <Pressable
          onPress={() => setShowCreate((v) => !v)}
          android_ripple={{ color: "#11182722" }}
          style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressedDark]}
        >
          <Feather name={showCreate ? "x" : "plus"} size={16} color="#fff" />
          <Text style={styles.primaryBtnText}>{showCreate ? "Fechar" : "Novo Link"}</Text>
        </Pressable>
      </View>

      {/* Criar novo */}
      {showCreate && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Criar Link</Text>

          <View style={styles.rowWrap}>
            {(["ARTE", "PROJETO"] as const).map((tp) => (
              <Pressable
                key={tp}
                onPress={() => setForm((f) => ({ ...f, tipo: tp }))}
                android_ripple={{ color: "#E5E7EB" }}
                style={({ pressed }) => [
                  styles.chip,
                  form.tipo === tp ? styles.chipActive : styles.chipInactive,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={[styles.chipText, form.tipo === tp ? styles.chipTextActive : styles.chipTextInactive]}>
                  {tp}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.label}>
            {form.tipo === "ARTE" ? "ID da Arte (arte_id)" : "ID do Projeto (projeto_id)"}
          </Text>
          <TextInput
            placeholder={form.tipo === "ARTE" ? "ex: 1c2b-..." : "ex: 9f8a-..."}
            value={form.alvoId}
            onChangeText={(v) => setForm((f) => ({ ...f, alvoId: v }))}
            style={styles.input}
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text style={styles.label}>Expira em (ISO opcional)</Text>
          <TextInput
            placeholder="YYYY-MM-DD ou ISO completo"
            value={form.expiraEm}
            onChangeText={(v) => setForm((f) => ({ ...f, expiraEm: v }))}
            style={styles.input}
            autoCapitalize="none"
            autoCorrect={false}
          />

          <View style={[styles.rowBetween, styles.itemLite]}>
            <Text style={styles.itemTitle}>Somente leitura</Text>
            <Switch
              value={form.somenteLeitura}
              onValueChange={(v) => setForm((f) => ({ ...f, somenteLeitura: v }))}
            />
          </View>
          <View style={[styles.rowBetween, styles.itemLite]}>
            <Text style={styles.itemTitle}>Permitir comentários</Text>
            <Switch
              value={form.canComment}
              onValueChange={(v) => setForm((f) => ({ ...f, canComment: v }))}
            />
          </View>
          <View style={[styles.rowBetween, styles.itemLite]}>
            <Text style={styles.itemTitle}>Permitir download</Text>
            <Switch
              value={form.canDownload}
              onValueChange={(v) => setForm((f) => ({ ...f, canDownload: v }))}
            />
          </View>

          <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
            <Pressable
              disabled={saving}
              onPress={handleCreate}
              android_ripple={{ color: "#11182722" }}
              style={({ pressed }) => [styles.primaryBtn, saving && styles.btnDisabled, pressed && styles.pressedDark]}
            >
              <Feather name="save" size={16} color="#fff" />
              <Text style={styles.primaryBtnText}>{saving ? "Criando..." : "Criar Link"}</Text>
            </Pressable>

            <Pressable
              disabled={saving}
              onPress={() => {
                setShowCreate(false);
                setForm({
                  tipo: "ARTE",
                  alvoId: "",
                  expiraEm: "",
                  somenteLeitura: true,
                  canComment: false,
                  canDownload: false,
                });
              }}
              android_ripple={{ color: "#E5E7EB" }}
              style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}
            >
              <Feather name="x" size={16} />
              <Text style={styles.secondaryBtnText}>Cancelar</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Filtros */}
      <View style={styles.filters}>
        <View style={{ flex: 1, position: "relative" }}>
          <Feather
            name="search"
            size={16}
            style={{ position: "absolute", left: 10, top: 12, opacity: 0.6 }}
          />
          <TextInput
            placeholder="Buscar por token, arte_id, projeto_id..."
            value={search}
            onChangeText={setSearch}
            style={styles.input}
          />
        </View>

        <View style={styles.rowWrap}>
          {(["todos", "ARTE", "PROJETO"] as const).map((v) => (
            <Pressable
              key={v}
              onPress={() => setFilterTipo(v)}
              android_ripple={{ color: "#E5E7EB" }}
              style={({ pressed }) => [
                styles.chip,
                filterTipo === v ? styles.chipActive : styles.chipInactive,
                pressed && styles.pressed,
              ]}
            >
              <Text
                style={[
                  styles.chipText,
                  filterTipo === v ? styles.chipTextActive : styles.chipTextInactive,
                ]}
              >
                {v[0].toUpperCase() + v.slice(1).toLowerCase()}
              </Text>
            </Pressable>
          ))}

          {(["criado_desc", "expira_asc"] as const).map((k) => (
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
                {k === "criado_desc" ? "Mais recentes" : "Expira primeiro"}
              </Text>
            </Pressable>
          ))}
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
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.rowBetween}>
              <View style={styles.row}>
                <View style={[styles.pillType, item.tipo === "ARTE" ? styles.pillArte : styles.pillProjeto]}>
                  <Text style={styles.pillTypeText}>{item.tipo}</Text>
                </View>
                <Text style={styles.itemTitle}>
                  {item.tipo === "ARTE" ? item.arte_id : item.projeto_id}
                </Text>
              </View>

              <Pressable
                onPress={() => handleCopy(item.token)}
                android_ripple={{ color: "#E5E7EB" }}
                style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
              >
                <Feather name="copy" size={16} />
              </Pressable>
            </View>

            <View style={{ marginTop: 6 }}>
              <Text style={styles.mutedSmall} numberOfLines={1}>
                Token: {item.token} — URL: {buildUrl(item.token)}
              </Text>
              <Text style={styles.mutedSmall}>
                Criado em: {formatDateBR(item.criado_em)} — Expira em: {formatDateBR(item.expira_em)}
              </Text>
            </View>

            <View style={[styles.rowBetween, styles.itemLite, { marginTop: 8 }]}>
              <Text style={styles.itemTitle}>Somente leitura</Text>
              <Switch
                value={item.somente_leitura}
                onValueChange={() => handleToggle(item, "somente_leitura")}
              />
            </View>
            <View style={[styles.rowBetween, styles.itemLite]}>
              <Text style={styles.itemTitle}>Permitir comentários</Text>
              <Switch value={item.can_comment} onValueChange={() => handleToggle(item, "can_comment")} />
            </View>
            <View style={[styles.rowBetween, styles.itemLite]}>
              <Text style={styles.itemTitle}>Permitir download</Text>
              <Switch value={item.can_download} onValueChange={() => handleToggle(item, "can_download")} />
            </View>

            <View style={[styles.rowBetween, { marginTop: 8, gap: 8 }]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Alterar expiração (ISO, vazio = sem expirar)</Text>
                <TextInput
                  defaultValue={item.expira_em ? new Date(item.expira_em).toISOString().slice(0, 16) : ""}
                  placeholder="YYYY-MM-DD ou ISO completo"
                  onSubmitEditing={(e) => handleUpdateExpiry(item, e.nativeEvent.text)}
                  onEndEditing={(e) => handleUpdateExpiry(item, e.nativeEvent.text)}
                  style={styles.input}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <Pressable
                onPress={() => handleRevoke(item.id)}
                android_ripple={{ color: "#FEE2E2" }}
                style={({ pressed }) => [styles.dangerBtn, pressed && styles.pressed]}
              >
                <Feather name="trash-2" size={16} color="#fff" />
                <Text style={styles.dangerBtnText}>Revogar</Text>
              </Pressable>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={[styles.card, { alignItems: "center" }]}>
            <Feather name="link-2" size={32} style={{ opacity: 0.5, marginBottom: 6 }} />
            <Text style={styles.mutedSmall}>Nenhum link encontrado.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

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
  rowWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center", marginVertical: 8 },

  itemLite: { paddingVertical: 8 },

  itemTitle: { fontWeight: "600" },
  label: { fontSize: 12, fontWeight: "600", opacity: 0.8, marginTop: 8 },
  mutedSmall: { fontSize: 12, opacity: 0.7 },

  chip: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999, borderWidth: 1 },
  chipActive: { backgroundColor: "#0b0e11", borderColor: "#0b0e11" },
  chipInactive: { backgroundColor: "#fff", borderColor: "#E5E7EB" },
  chipText: { fontSize: 12, fontWeight: "600" },
  chipTextActive: { color: "#fff" },
  chipTextInactive: { color: "#0b0e11" },

  pillType: { paddingVertical: 2, paddingHorizontal: 8, borderRadius: 999 },
  pillArte: { backgroundColor: "#DBEAFE" },
  pillProjeto: { backgroundColor: "#DCFCE7" },
  pillTypeText: { fontSize: 11, fontWeight: "700" },

  

  iconBtn: {
    padding: 8, borderRadius: 10, borderWidth: 1, borderColor: "#E5E7EB", backgroundColor: "#F9FAFB",
  },

  dangerBtn: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#DC2626", paddingVertical: 12, paddingHorizontal: 12, borderRadius: 10 },
  dangerBtnText: { color: "#fff", fontWeight: "700" },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 6,
  },
});
