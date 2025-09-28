import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  Pressable,
  ActivityIndicator,
  Linking as RNLinking,
} from "react-native";
import * as Linking from "expo-linking";
import { useNavigation } from "@react-navigation/native";

import { supabase } from "../lib/supabase";
import { useTheme } from "../theme/ThemeProvider";
import { makeSkin } from "../theme/skin";
import { Card } from "../ui/Card";
import { Button, ButtonGhost } from "../ui/Button";

type Notificacao = {
  id: string;
  titulo: string | null;
  mensagem: string | null;
  criado_em: string;        // ISO
  lida: boolean;
  tipo?: string | null;     // opcional
  link?: string | null;     // pode ser "/dashboard" ou "https://..."
};

const PAGE_SIZE = 20;

export default function NotificationScreen() {
  const nav = useNavigation<any>();
  const { t } = useTheme();
  const s = makeSkin(t);

  const [items, setItems] = useState<Notificacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [onlyUnread, setOnlyUnread] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0); // 0-based

  const totalUnread = useMemo(() => items.filter((n) => !n.lida).length, [items]);

  const mapInternalRoute = useCallback((path: string): string | null => {
    const map: Record<string, string> = {
      "/dashboard": "Dashboard",
      "/projetos": "Projetos",
      "/artes": "Artes",
      "/tarefas": "Tarefas",
      "/notificacoes": "Notificações",
      "/links": "Links",
    };
    return map[path] || null;
  }, []);

  const openLink = useCallback(
    async (link?: string | null) => {
      if (!link) return;

      // interno (começa com "/") → navegação
      if (link.startsWith("/")) {
        const route = mapInternalRoute(link);
        if (route) {
          nav.navigate(route as never);
          return;
        }
      }

      // deep link do próprio app (com.viu.app://...) ou URL externa
      try {
        const can = await RNLinking.canOpenURL(link);
        if (can) RNLinking.openURL(link);
        else {
          // tenta construir deep link com base no esquema
          const url = Linking.createURL(link);
          RNLinking.openURL(url);
        }
      } catch {/* noop */}
    },
    [mapInternalRoute, nav]
  );

  const fetchPage = useCallback(
    async (pageIndex: number, replace = false) => {
      try {
        const from = pageIndex * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;

        const query = supabase
          .from("notificacoes")
          .select("id, titulo, mensagem, criado_em, lida, tipo, link")
          .order("criado_em", { ascending: false })
          .range(from, to);

        const finalQuery = onlyUnread ? query.eq("lida", false) : query;

        const { data, error } = await finalQuery;
        if (error) throw error;

        const rows = (data ?? []).map((r) => ({
          id: String(r.id),
          titulo: r.titulo ?? null,
          mensagem: r.mensagem ?? null,
          criado_em: String(r.criado_em),
          lida: !!r.lida,
          tipo: r.tipo ?? null,
          link: r.link ?? null,
        })) as Notificacao[];

        setHasMore((data?.length ?? 0) === PAGE_SIZE);
        setPage(pageIndex);
        setItems((prev) => (replace ? rows : [...prev, ...rows]));
        setError(null);
      } catch {
        setError("Não foi possível carregar as notificações.");
      }
    },
    [onlyUnread]
  );

  const initialLoad = useCallback(async () => {
    setLoading(true);
    setItems([]);
    await fetchPage(0, true);
    setLoading(false);
  }, [fetchPage]);

  useEffect(() => {
    initialLoad();
  }, [onlyUnread, initialLoad]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchPage(0, true);
    setRefreshing(false);
  }, [fetchPage]);

  const onEndReached = useCallback(() => {
    if (!loading && hasMore) {
      fetchPage(page + 1, false);
    }
  }, [fetchPage, hasMore, loading, page]);

  const formatDateTime = (iso: string) => {
    try {
      const d = new Date(iso);
      return `${d.toLocaleDateString("pt-BR")} ${d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
    } catch {
      return iso;
    }
  };

  const toggleRead = async (id: string, current: boolean) => {
    // otimista
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, lida: !current } : n)));
    try {
      const { error } = await supabase
        .from("notificacoes")
        .update({ lida: !current })
        .eq("id", id);
      if (error) throw error;
    } catch {
      // rollback
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, lida: current } : n)));
    }
  };

  const markAllRead = async () => {
    if (totalUnread === 0) return;
    // otimista
    const snapshot = items;
    setItems((prev) => prev.map((n) => ({ ...n, lida: true })));
    try {
      const { error } = await supabase
        .from("notificacoes")
        .update({ lida: true })
        .eq("lida", false);
      if (error) throw error;
    } catch {
      setItems(snapshot); // rollback em caso de falha
    }
  };

  if (loading) {
    return (
      <View style={[s.screen, { alignItems: "center", justifyContent: "center", gap: 10 }]}>
        <ActivityIndicator />
        <Text style={[s.text, { opacity: 0.8 }]}>Carregando notificações…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[s.screen, { alignItems: "center", justifyContent: "center", gap: 8 }]}>
        <Text style={{ color: t.colors.destructive }}>{error}</Text>
        <Button title="Tentar novamente" onPress={initialLoad} />
      </View>
    );
  }

  return (
    <View style={s.screen}>
      {/* Header */}
      <View style={{ marginBottom: 12, gap: 4, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <View>
          <Text style={s.h1}>Notificações</Text>
          <Text style={[s.text, { opacity: 0.7 }]}>
            {onlyUnread ? `${totalUnread} não lida(s)` : `${items.length} no total`}
          </Text>
        </View>
        <ButtonGhost title={onlyUnread ? "Ver todas" : "Só não lidas"} onPress={() => setOnlyUnread((v) => !v)} />
      </View>

      {/* Ações rápidas */}
      <View style={{ flexDirection: "row", gap: 8, marginBottom: 8 }}>
        <Button title="Marcar todas como lidas" onPress={markAllRead} />
        <ButtonGhost title="Atualizar" onPress={onRefresh} />
      </View>

      {/* Lista */}
      {items.length > 0 ? (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 24, gap: 10 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[t.colors.primary]}
              tintColor={t.colors.mutedForeground}
            />
          }
          onEndReachedThreshold={0.4}
          onEndReached={onEndReached}
          renderItem={({ item }) => (
            <Card>
              <View style={{ gap: 8 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.h3]} numberOfLines={2}>
                      {item.titulo || "Notificação"}
                    </Text>
                    <Text style={[s.text, { opacity: 0.75 }]} numberOfLines={4}>
                      {item.mensagem || "—"}
                    </Text>
                    <Text style={[s.text, { opacity: 0.6, fontSize: 12, marginTop: 6 }]}>
                      {formatDateTime(item.criado_em)} {item.tipo ? `• ${item.tipo}` : ""}
                    </Text>
                  </View>
                  <View style={{ alignItems: "flex-end", gap: 8 }}>
                    <Pressable
                      onPress={() => toggleRead(item.id, item.lida)}
                      style={{
                        paddingVertical: 8,
                        paddingHorizontal: 12,
                        borderRadius: 999,
                        borderWidth: 1,
                        borderColor: t.colors.border,
                        backgroundColor: item.lida ? t.colors.secondary : t.colors.card,
                      }}
                    >
                      <Text style={[s.text, { fontWeight: "700" }]}>
                        {item.lida ? "Lida" : "Marcar como lida"}
                      </Text>
                    </Pressable>

                    {!!item.link && (
                      <Pressable
                        onPress={() => openLink(item.link!)}
                        style={{
                          paddingVertical: 8,
                          paddingHorizontal: 12,
                          borderRadius: 10,
                          backgroundColor: t.colors.primary,
                        }}
                      >
                        <Text style={{ color: t.colors.primaryForeground, fontWeight: "700" }}>
                          Abrir
                        </Text>
                      </Pressable>
                    )}
                  </View>
                </View>
              </View>
            </Card>
          )}
          ListFooterComponent={
            hasMore ? (
              <View style={{ paddingVertical: 12, alignItems: "center" }}>
                <ActivityIndicator />
              </View>
            ) : null
          }
          ListEmptyComponent={
            <Card>
              <View style={{ alignItems: "center", paddingVertical: 24, gap: 6 }}>
                <Text style={[s.h3]}>Nada por aqui</Text>
                <Text style={[s.text, { opacity: 0.7, textAlign: "center" }]}>
                  {onlyUnread ? "Você não tem notificações não lidas." : "Sem notificações no momento."}
                </Text>
              </View>
            </Card>
          }
        />
      ) : (
        <Card>
          <View style={{ alignItems: "center", paddingVertical: 24, gap: 6 }}>
            <Text style={[s.h3]}>Nada por aqui</Text>
            <Text style={[s.text, { opacity: 0.7, textAlign: "center" }]}>
              {onlyUnread ? "Você não tem notificações não lidas." : "Sem notificações no momento."}
            </Text>
          </View>
        </Card>
      )}
    </View>
  );
}
