import React from "react";
import { View, Text, Pressable } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../theme/ThemeProvider";
import { makeSkin } from "../theme/skin";
import { Card } from "../ui/Card";
import { Button, ButtonGhost } from "../ui/Button";
// opcional: contadores para destacar pendências
import { useCounters } from "../hooks/useCounters";

export default function HomeScreen() {
  const nav = useNavigation<any>();
  const { user } = useAuth();
  const { t } = useTheme();
  const s = makeSkin(t);
  const c = useCounters(); // { tarefasPendentes, feedbacksPendentes, ... }

  return (
    <View style={s.screen}>
      {/* título/boas-vindas */}
      <Text style={s.h1}>Olá, {user?.email ?? "usuário"} 👋</Text>
      <Text style={[s.text, { opacity: 0.75, marginBottom: 12 }]}>
        Bem-vindo ao seu painel. Aqui você acompanha projetos, artes e tarefas.
      </Text>

      {/* cards de atalho */}
      <View style={{ gap: 12 }}>
        <Card>
          <View style={{ gap: 8 }}>
            <Text style={[s.text, { fontWeight: "700" }]}>Resumo rápido</Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Pill label="Projetos vencendo" value={c.projetsVencendo} />
              <Pill label="Tarefas pendentes" value={c.tarefasPendentes} />
              <Pill label="Feedbacks novos" value={c.feedbacksPendentes} />
            </View>
          </View>
        </Card>

        <Card>
          <View style={{ gap: 10 }}>
            <Text style={[s.text, { fontWeight: "700" }]}>Ações rápidas</Text>
            <View style={{ gap: 8 }}>
              <Button
                title="Criar projeto"
                onPress={() => nav.navigate("Projetos" as never)}
              />
              <ButtonGhost
                title="Upload de arte"
                onPress={() => nav.navigate("Artes" as never)}
              />
            </View>
          </View>
        </Card>

        {/* dicas / links úteis */}
        <Card>
          <View style={{ gap: 6 }}>
            <Text style={[s.text, { fontWeight: "700" }]}>Dicas</Text>
            <Pressable onPress={() => nav.navigate("Tarefas" as never)}>
              <Text style={[s.text, { color: t.colors.primary }]}>
                Ver tarefas ({c.tarefasPendentes || 0})
              </Text>
            </Pressable>
            <Pressable onPress={() => nav.navigate("Notificações" as never)}>
              <Text style={[s.text, { color: t.colors.primary }]}>
                Notificações não lidas ({c.notificacoesNaoLidas || 0})
              </Text>
            </Pressable>
          </View>
        </Card>
      </View>

      {/* observação: o botão "Sair" agora fica no menu do AppHeader */}
    </View>
  );
}

function Pill({ label, value }: { label: string; value?: number | null }) {
  const { t } = useTheme();
  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: t.colors.border,
        backgroundColor: t.colors.secondary,
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 999,
      }}
    >
      <Text style={{ color: t.colors.foreground, fontWeight: "600" }}>
        {label}: {value ?? 0}
      </Text>
    </View>
  );
}
