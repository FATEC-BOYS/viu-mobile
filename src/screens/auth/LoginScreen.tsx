import React, { useState } from "react";
import { View, Text, Pressable } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import * as AuthSession from "expo-auth-session";

import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../lib/supabase";
import { useTheme } from "../../theme/ThemeProvider";
import { makeSkin } from "../../theme/skin";
import { Input } from "../../ui/Input";
import { Button, ButtonGhost } from "../../ui/Button";
import { Card } from "../../ui/Card";

export default function LoginScreen() {
  const nav = useNavigation<any>();
  const route = useRoute<any>();
  const { t } = useTheme();
  const s = makeSkin(t);

  const { signIn } = useAuth();
  const defaultToSignup = route.params?.mode === "signup";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  function goBack() {
    if (nav.canGoBack()) nav.goBack();
    else nav.navigate("Onboarding");
  }

  async function handleLogin() {
    if (!email.trim() || !password) {
      setMsg("Preencha e-mail e senha.");
      return;
    }
    setSending(true);
    setMsg(null);
    try {
      const { error } = await signIn(email.trim(), password);
      if (error) {
        setMsg("E-mail ou senha inválidos.");
        return;
      }
      nav.reset({ index: 0, routes: [{ name: "Home" }] });
    } catch {
      setMsg("Erro inesperado ao fazer login.");
    } finally {
      setSending(false);
    }
  }

  async function handleGoogle() {
    try {
      setSending(true);
      setMsg(null);

      // 🔑 Sem useProxy na v7 — gera o deep link pelo scheme+path
      const redirectTo = AuthSession.makeRedirectUri({
        scheme: "com.viu.app", // CONFIRA com seu app.json/app.config.ts
        path: "auth/callback",  // e com o Redirect URL no Supabase
      });

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo },
      });

      if (error) setMsg(`Erro ao redirecionar: ${error.message}`);
      // Após concluir o OAuth, o app retorna ao deep link e o AuthContext capta a sessão.
    } catch {
      setMsg("Não foi possível iniciar o login com Google.");
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
              Bem-vindo de volta!
            </Text>
            <Text style={[s.text, { opacity: 0.7, textAlign: "center" }]}>
              Entre para acessar sua conta.
            </Text>
          </View>

          {/* Form */}
          <View style={{ marginTop: 8 }}>
            <Text style={[s.text, { marginBottom: 6, fontWeight: "600" }]}>
              E-mail
            </Text>
            <Input
              placeholder="seu@email.com"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
              editable={!sending}
            />

            <Text
              style={[s.text, { marginTop: 6, marginBottom: 6, fontWeight: "600" }]}
            >
              Senha
            </Text>
            <View style={{ position: "relative" }}>
              <Input
                placeholder="••••••••"
                secureTextEntry={!showPass}
                value={password}
                onChangeText={setPassword}
                editable={!sending}
              />
              <Pressable
                onPress={() => setShowPass((v) => !v)}
                style={{ position: "absolute", right: 12, top: 12, padding: 6 }}
                hitSlop={8}
              >
                <Text style={[s.text, { opacity: 0.7 }]}>
                  {showPass ? "Ocultar" : "Mostrar"}
                </Text>
              </Pressable>
            </View>

            {!!msg && (
              <Text
                style={{
                  color: t.colors.destructive,
                  textAlign: "center",
                  marginTop: 8,
                  fontSize: 12,
                }}
                accessibilityLiveRegion="polite"
              >
                {msg}
              </Text>
            )}

            <Button
              title={sending ? "Entrando..." : "Entrar"}
              onPress={handleLogin}
              loading={sending}
              style={{ marginTop: 12 }}
            />

            {/* divisor */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginVertical: 12,
              }}
            >
              <View style={{ flex: 1, height: 1, backgroundColor: t.colors.border }} />
              <Text
                style={[s.text, { opacity: 0.6, fontSize: 12, marginHorizontal: 8 }]}
              >
                ou
              </Text>
              <View style={{ flex: 1, height: 1, backgroundColor: t.colors.border }} />
            </View>

            <ButtonGhost
              title={sending ? "Conectando..." : "Entrar com Google"}
              onPress={handleGoogle}
              disabled={sending}
            />
          </View>

          {/* Footer */}
          <View
            style={{
              marginTop: 16,
              flexDirection: "row",
              justifyContent: "space-between",
            }}
          >
            <Pressable onPress={() => nav.navigate("Recover")}>
              <Text style={[s.text, { opacity: 0.75 }]}>Esqueci minha senha</Text>
            </Pressable>
            <Pressable onPress={() => nav.navigate("Signup")}>
              <Text style={[s.text, { color: t.colors.primary, fontWeight: "700" }]}>
                Criar conta
              </Text>
            </Pressable>
          </View>
        </View>
      </Card>
    </View>
  );
}
