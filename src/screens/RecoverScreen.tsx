import React, { useState } from "react";
import { View, Text, Pressable } from "react-native";
import { useNavigation } from "@react-navigation/native";
import * as Linking from "expo-linking";

import { supabase } from "../lib/supabase";
import { useTheme } from "../theme/ThemeProvider";
import { makeSkin } from "../theme/skin";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";

export default function RecoverScreen() {
  const nav = useNavigation<any>();
  const { t } = useTheme();
  const s = makeSkin(t);

  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  function goBack() {
    if (nav.canGoBack()) nav.goBack();
    else nav.navigate("Login");
  }

  async function handleSubmit() {
    if (!email.trim()) {
      setMsg("Informe um e-mail válido.");
      return;
    }

    setSending(true);
    setMsg(null);

    try {
      // com.viu.app://auth/callback?type=recovery&next=/reset
      const redirectTo = Linking.createURL("auth/callback?type=recovery&next=/reset");

      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo,
      });

      if (error) {
        setMsg("Não foi possível enviar o e-mail de recuperação.");
      } else {
        setMsg("Se este e-mail existir, você receberá um link para redefinir a senha.");
      }
    } catch {
      setMsg("Ocorreu um erro ao solicitar a recuperação.");
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
              Esqueci minha senha
            </Text>
            <Text style={[s.text, { opacity: 0.7, textAlign: "center" }]}>
              Informe seu e-mail para receber o link de redefinição.
            </Text>
          </View>

          <View style={{ marginTop: 8 }}>
            <Text style={[s.text, { marginBottom: 6, fontWeight: "600" }]}>E-mail</Text>
            <Input
              placeholder="seu@email.com"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
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
              title={sending ? "Enviando..." : "Enviar link de recuperação"}
              onPress={handleSubmit}
              loading={sending}
              style={{ marginTop: 12 }}
            />
          </View>

          <View style={{ marginTop: 16, alignItems: "center" }}>
            <Text style={[s.text]} onPress={goBack}>
              Voltar para o login
            </Text>
          </View>
        </View>
      </Card>
    </View>
  );
}
