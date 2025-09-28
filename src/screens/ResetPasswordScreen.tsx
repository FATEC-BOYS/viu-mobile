import React, { useState } from "react";
import { View, Text, Pressable } from "react-native";
import { useNavigation } from "@react-navigation/native";

import { supabase } from "../lib/supabase";
import { useTheme } from "../theme/ThemeProvider";
import { makeSkin } from "../theme/skin";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";

export default function ResetPasswordScreen() {
  const nav = useNavigation<any>();
  const { t } = useTheme();
  const s = makeSkin(t);

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  function goBack() {
    if (nav.canGoBack()) nav.goBack();
    else nav.navigate("Login");
  }

  async function onSubmit() {
    setMsg(null);

    if (password.length < 8) {
      setMsg("A senha deve ter pelo menos 8 caracteres.");
      return;
    }
    if (password !== confirm) {
      setMsg("As senhas não conferem.");
      return;
    }

    try {
      setSending(true);
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setMsg("Não foi possível atualizar a senha.");
        return;
      }
      setMsg("Senha atualizada com sucesso. Redirecionando…");
      setTimeout(() => nav.replace("Login", { reset: "ok" }), 900);
    } catch {
      setMsg("Erro inesperado ao atualizar a senha.");
    } finally {
      setSending(false);
    }
  }

  return (
    <View style={[s.screen, { justifyContent: "center" }]}>
      {/* Header com Voltar */}
      <View
        style={{
          position: "absolute",
          top: 12,
          left: 16,
          right: 16,
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Pressable onPress={goBack} hitSlop={10}>
          <Text style={[s.text, { opacity: 0.9 }]}>← Voltar</Text>
        </Pressable>
      </View>

      <Card style={{ alignSelf: "center", width: "100%", maxWidth: 460 }}>
        <View style={{ padding: 20 }}>
          <View style={{ alignItems: "center", marginBottom: 12 }}>
            <Text style={[s.h1, { marginBottom: 4, textAlign: "center" }]}>
              Definir nova senha
            </Text>
            <Text style={[s.text, { opacity: 0.7, textAlign: "center" }]}>
              Crie uma nova senha para sua conta.
            </Text>
          </View>

          <View style={{ marginTop: 8 }}>
            <Text style={[s.text, { marginBottom: 6, fontWeight: "600" }]}>
              Nova senha
            </Text>
            <Input
              placeholder="••••••••"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              editable={!sending}
            />

            <Text style={[s.text, { marginTop: 6, marginBottom: 6, fontWeight: "600" }]}>
              Confirmar senha
            </Text>
            <Input
              placeholder="••••••••"
              secureTextEntry
              value={confirm}
              onChangeText={setConfirm}
              editable={!sending}
            />

            {!!msg && (
              <Text
                style={{
                  color: t.colors.mutedForeground,
                  textAlign: "center",
                  marginTop: 10,
                  fontSize: 13,
                }}
                accessibilityLiveRegion="polite"
              >
                {msg}
              </Text>
            )}

            <Button
              title={sending ? "Salvando…" : "Salvar nova senha"}
              onPress={onSubmit}
              loading={sending}
              style={{ marginTop: 12 }}
            />
          </View>

          <View style={{ marginTop: 16, alignItems: "center" }}>
            <Text style={[s.text]} onPress={goBack}>
              Voltar
            </Text>
          </View>
        </View>
      </Card>
    </View>
  );
}
