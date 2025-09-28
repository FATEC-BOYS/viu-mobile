import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, ActivityIndicator } from "react-native";
import * as Linking from "expo-linking";
import { useNavigation } from "@react-navigation/native";

import { supabase } from "../../lib/supabase";
import { useTheme } from "../../theme/ThemeProvider";
import { makeSkin } from "../../theme/skin";

type Tipo = "DESIGNER" | "CLIENTE";

function safeNext(path: unknown): string | null {
  if (typeof path !== "string") return null;
  if (!path.startsWith("/")) return null;
  if (path.startsWith("//")) return null;
  return path;
}

export default function AuthCallbackScreen() {
  const nav = useNavigation<any>();
  const { t } = useTheme();
  const s = makeSkin(t);

  const [msg, setMsg] = useState<string>("Conectando sua conta…");
  const handledOnce = useRef(false);

  const handleUrl = useCallback(async (incomingUrl: string) => {
    if (!incomingUrl || handledOnce.current) return;
    handledOnce.current = true;

    try {
      const parsed = Linking.parse(incomingUrl);
      
      const qp = parsed.queryParams || {};
      const token_hash = (qp["token_hash"] as string) || null;
      const typeParam = (qp["type"] as string) || null;
      const code = (qp["code"] as string) || null;
      const nextParam = safeNext((qp["next"] as string) || null);
      const tipoFromQuery = (qp["tipo"] as Tipo | null) ?? null;

      // 1) Fluxo Magic Link / OTP
      if (token_hash && typeParam) {
        setMsg("Confirmando e-mail…");
        const { error: otpErr } = await supabase.auth.verifyOtp({
          token_hash,
          type: typeParam as any,
        });
        if (otpErr) {
          setMsg("Falha ao confirmar seu e-mail.");
          // volta para Login com erro
          nav.reset({ index: 0, routes: [{ name: "Login", params: { error: "confirmation_failed" } }] });
          return;
        }
      }

      // 2) Fluxo OAuth (PKCE): troca o code pela sessão
      if (code) {
        setMsg("Finalizando login…");
        const { error: exErr } = await supabase.auth.exchangeCodeForSession(incomingUrl);
        if (exErr) {
          nav.reset({ index: 0, routes: [{ name: "Login", params: { error: "oauth_exchange_failed" } }] });
          return;
        }
      }

      // 3) Garantir sessão válida
      const { data: { session }, error: sessErr } = await supabase.auth.getSession();
      if (sessErr || !session?.user) {
        nav.reset({ index: 0, routes: [{ name: "Login", params: { error: "no_session" } }] });
        return;
      }

      // 4) Resolver destino (next interno > regra por tipo)
      const user = session.user;
      const tipo: Tipo =
        tipoFromQuery ??
        ((user.user_metadata?.tipo as Tipo | undefined) ?? "DESIGNER");

      // Se veio tipo pela query (cadastro via Google), garanta que persiste no metadata
      if (tipoFromQuery && user) {
        // tentativa “best-effort”; se falhar, só segue
        try {
          await supabase.auth.updateUser({ data: { tipo: tipoFromQuery } });
        } catch {}
      }

      const fallback = tipo === "CLIENTE" ? "Links" : "Home";
      const routeNameFromNext: Record<string, string> = {
        "/dashboard": "Home",
        "/links": "Links",
      };
      const nextRoute = nextParam ? routeNameFromNext[nextParam] : null;

      const finalRoute = nextRoute || fallback;

      nav.reset({ index: 0, routes: [{ name: finalRoute }] });
    } catch (e) {
      nav.reset({ index: 0, routes: [{ name: "Login", params: { error: "callback_unexpected" } }] });
    }
  }, [nav]);

  useEffect(() => {
    // 1) trata URL inicial (quando o app é aberto pelo link)
    Linking.getInitialURL().then((u) => {
      if (u) handleUrl(u);
    });

    // 2) trata URL recebida com o app já aberto
    const sub = Linking.addEventListener("url", (ev) => {
      handleUrl(ev.url);
    });

    return () => sub.remove();
  }, [handleUrl]);

  return (
    <View style={[s.screen, { alignItems: "center", justifyContent: "center", gap: 12 }]}>
      <ActivityIndicator />
      <Text style={[s.text, { opacity: 0.75 }]}>{msg}</Text>
    </View>
  );
}
