import React, { useState } from "react";
import { View, Text, Pressable } from "react-native";
import { useNavigation } from "@react-navigation/native";
import * as AuthSession from "expo-auth-session";

import { supabase } from "../lib/supabase";
import { useTheme } from "../theme/ThemeProvider";
import { makeSkin } from "../theme/skin";
import { Input } from "../ui/Input";
import { Button, ButtonGhost } from "../ui/Button";
import { Card } from "../ui/Card";

type TipoUsuario = "DESIGNER" | "CLIENTE";

export default function SignupScreen() {
  const nav = useNavigation<any>();
  const { t } = useTheme();
  const s = makeSkin(t);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [tipo, setTipo] = useState<TipoUsuario>("DESIGNER");
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  function goBack() {
    if (nav.canGoBack()) nav.goBack();
    else nav.navigate("Onboarding");
  }

  async function handleSignup() {
    setMsg(null);

    if (!email.trim()) {
      setMsg("Informe um e-mail válido.");
      return;
    }
    if (password.length < 8) {
      setMsg("A senha deve ter pelo menos 8 caracteres.");
      return;
    }

    setSending(true);
    try {
      // Redireciono para o deep link do app após confirmar e-mail (ou criar sessão)
      const redirectTo = AuthSession.makeRedirectUri({
        scheme: "com.viu.app",   // confirme com seu app.config/app.json
        path: "auth/callback",
      });

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectTo,
          data: { tipo }, // salva no user_metadata já no signup
        },
      });

      if (error) {
        setMsg(`Erro ao cadastrar: ${error.message}`);
        return;
      }

      // Se a confirmação de e-mail estiver habilitada:
      if (data?.user && !data.user.confirmed_at) {
        setMsg("Conta criada! Verifique seu e-mail e clique no link de confirmação.");
        return;
      }

      // Caso a sessão venha criada (dependendo das políticas), vai para Home.
      if (data?.session) {
        nav.reset({ index: 0, routes: [{ name: "Home" }] });
      } else {
        // fallback: manda para uma tela de callback (se você tiver)
        nav.navigate("Login");
      }
    } catch (err) {
      setMsg("Erro inesperado ao cadastrar.");
    } finally {
      setSending(false);
    }
  }

  async function handleGoogle() {
    try {
      setSending(true);
      setMsg(null);

      // Anexamos ?tipo= no redirect; no seu callback você pode ler isso e fazer:
      // supabase.auth.updateUser({ data: { tipo } })
      const base = AuthSession.makeRedirectUri({
        scheme: "com.viu.app",
        path: "auth/callback",
      });
      const redirectTo = `${base}?tipo=${encodeURIComponent(tipo)}`;

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo },
      });

      if (error) setMsg(`Erro ao redirecionar para o Google: ${error.message}`);
    } catch (err) {
      setMsg("Não foi possível iniciar o cadastro com Google.");
      setSending(false);
    }
  }

  const isDesigner = tipo === "DESIGNER";
  const isCliente = tipo === "CLIENTE";

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
          {/* Título/descrição */}
          <View style={{ alignItems: "center", marginBottom: 12 }}>
            <Text style={[s.h1, { marginBottom: 4, textAlign: "center" }]}>
              Criar conta
            </Text>
            <Text style={[s.text, { opacity: 0.7, textAlign: "center" }]}>
              Use e-mail e senha ou entre com Google.
            </Text>
          </View>

          {/* Formulário */}
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

            <Text style={[s.text, { marginTop: 6, marginBottom: 6, fontWeight: "600" }]}>
              Senha
            </Text>
            <Input
              placeholder="••••••••"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              editable={!sending}
            />
            <Text style={[s.text, { opacity: 0.6, fontSize: 12, marginTop: 6 }]}>
              Mínimo de 8 caracteres.
            </Text>

            {/* Tipo de usuário */}
            <Text style={[s.text, { marginTop: 14, marginBottom: 6, fontWeight: "600" }]}>
              Você é?
            </Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Pressable
                onPress={() => setTipo("DESIGNER")}
                disabled={sending}
                style={{
                  flex: 1,
                  borderWidth: 1,
                  borderColor: isDesigner ? t.colors.ring : t.colors.border,
                  borderRadius: 12,
                  paddingVertical: 10,
                  alignItems: "center",
                }}
              >
                <Text style={[s.text, { fontWeight: "600" }]}>Designer</Text>
              </Pressable>
              <Pressable
                onPress={() => setTipo("CLIENTE")}
                disabled={sending}
                style={{
                  flex: 1,
                  borderWidth: 1,
                  borderColor: isCliente ? t.colors.ring : t.colors.border,
                  borderRadius: 12,
                  paddingVertical: 10,
                  alignItems: "center",
                }}
              >
                <Text style={[s.text, { fontWeight: "600" }]}>Cliente</Text>
              </Pressable>
            </View>
            <Text style={[s.text, { opacity: 0.6, fontSize: 12, marginTop: 6 }]}>
              Clientes não têm dashboard; acessam os materiais via links compartilhados.
            </Text>

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
              title={sending ? "Criando..." : "Criar conta"}
              onPress={handleSignup}
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
              title={sending ? "Conectando..." : "Continuar com Google"}
              onPress={handleGoogle}
              disabled={sending}
            />
          </View>

          {/* Footer */}
          <View style={{ marginTop: 16, alignItems: "center" }}>
            <Text style={[s.text]}>
              Já tem uma conta?{" "}
              <Text
                onPress={() => nav.navigate("Login")}
                style={{ color: t.colors.primary, fontWeight: "700" }}
              >
                Entrar
              </Text>
            </Text>
          </View>
        </View>
      </Card>
    </View>
  );
}
