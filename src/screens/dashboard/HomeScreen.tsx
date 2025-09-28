import React from "react";
import { View, Text, Pressable } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "../../contexts/AuthContext";
import { useTheme } from "../../theme/ThemeProvider";
import { makeSkin } from "../../theme/skin";
import { Card } from "../../ui/Card";
import { Button, ButtonGhost } from "../../ui/Button";
import { useCounters } from "../../hooks/useCounters";

export default function HomeScreen() {
  const nav = useNavigation<any>();
  const { user } = useAuth();
  const { t } = useTheme();
  const s = makeSkin(t);
  const c = useCounters(); // { projetosVencendo, tarefasPendentes, feedbacksPendentes, notificacoesNaoLidas }

  // helpers de navegação (vai pra aba certa e opcionalmente uma tela do stack)
  const goProjetos = () => nav.navigate("ProjetosTab", { screen: "ProjectsList" });
  const goArtes = () => nav.navigate("ArtesTab", { screen: "Artes" });
  const goTarefas = () => nav.navigate("ProjetosTab", { screen: "Tarefas" });
  const goNotificacoes = () => nav.navigate("NotificacoesTab", { screen: "Notificacoes" });

  return (
    <View style={s.screen}>
      {/* título/boas-vindas */}
      <Text style={s.h1}>Olá, {user?.email ?? "usuário"} 👋</Text>
      <Text style={[s.text, { opacity: 0.75, marginBottom: 12 }]}>
        Bem-vindo ao seu painel. Aqui você acompanha projetos, artes e tarefas.
      </Text>

      {/* cards */}
      <View>
        {/* Resumo rápido */}
        <Card style={{ marginBottom: 12 }}>
          <View>
            <Text style={[s.text, { fontWeight: "700", marginBottom: 8 }]}>Resumo rápido</Text>

            {/* 🔥 wrap com espaçamento controlado */}
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                marginRight: -8, // compensa a última coluna
                marginBottom: -8, // compensa a última linha
              }}
            >
              <Pill label="Projetos vencendo" value={c.projetsVencendo} style={{ marginRight: 8, marginBottom: 8 }} />
              <Pill label="Tarefas pendentes" value={c.tarefasPendentes} style={{ marginRight: 8, marginBottom: 8 }} />
              <Pill label="Feedbacks novos" value={c.feedbacksPendentes} style={{ marginRight: 8, marginBottom: 8 }} />
            </View>
          </View>
        </Card>

        {/* Ações rápidas */}
        <Card style={{ marginBottom: 12 }}>
          <View>
            <Text style={[s.text, { fontWeight: "700", marginBottom: 10 }]}>Ações rápidas</Text>
            <View>
              <Button title="Criar projeto" onPress={goProjetos} />
              <View style={{ height: 8 }} />
              <ButtonGhost title="Upload de arte" onPress={goArtes} />
            </View>
          </View>
        </Card>

        {/* Dicas */}
        <Card>
          <View>
            <Text style={[s.text, { fontWeight: "700", marginBottom: 6 }]}>Dicas</Text>

            <Pressable onPress={goTarefas} android_ripple={{ color: "#E5E7EB" }}>
              <Text style={[s.text, { color: t.colors.primary, paddingVertical: 6 }]}>
                Ver tarefas ({c.tarefasPendentes || 0})
              </Text>
            </Pressable>

            <Pressable onPress={goNotificacoes} android_ripple={{ color: "#E5E7EB" }}>
              <Text style={[s.text, { color: t.colors.primary, paddingVertical: 6 }]}>
                Notificações não lidas ({c.notificacoesNaoLidas || 0})
              </Text>
            </Pressable>
          </View>
        </Card>
      </View>
    </View>
  );
}

function Pill({
  label,
  value,
  style,
}: {
  label: string;
  value?: number | null;
  style?: any;
}) {
  const { t } = useTheme();
  return (
    <View
      style={[
        {
          borderWidth: 1,
          borderColor: t.colors.border,
          backgroundColor: t.colors.secondary,
          paddingVertical: 8,
          paddingHorizontal: 12,
          borderRadius: 999,
          flexShrink: 1, // evita estourar em telas estreitas
        },
        style,
      ]}
    >
      <Text style={{ color: t.colors.foreground, fontWeight: "600" }} numberOfLines={1}>
        {label}: {value ?? 0}
      </Text>
    </View>
  );
}
