// src/hooks/useCounters.ts
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export type Counters = {
  tarefasPendentes: number;
  feedbacksPendentes: number;
  notificacoesNaoLidas: number;
  projetsVencendo: number;
};

export function useCounters(pollMs = 5 * 60 * 1000) {
  const [c, setC] = useState<Counters>({
    tarefasPendentes: 0,
    feedbacksPendentes: 0,
    notificacoesNaoLidas: 0,
    projetsVencendo: 0,
  });

  useEffect(() => {
    let mounted = true;
    async function fetchCounters() {
      try {
        const now = new Date();
        const past7 = new Date(now); past7.setDate(past7.getDate() - 7);
        const in7  = new Date(now); in7.setDate(in7.getDate() + 7);

        const [{ count: tarefas }, { count: feedbacks }, { count: notifs }, { count: projetos }] =
          await Promise.all([
            supabase.from("tarefas").select("*", { count: "exact", head: true }).in("status", ["PENDENTE","EM_ANDAMENTO"]),
            supabase.from("feedbacks").select("*", { count: "exact", head: true }).gte("criado_em", past7.toISOString()),
            supabase.from("notificacoes").select("*", { count: "exact", head: true }).eq("lida", false),
            supabase.from("projetos").select("*", { count: "exact", head: true }).eq("status","EM_ANDAMENTO").lte("prazo", in7.toISOString()),
          ]);

        if (!mounted) return;
        setC({
          tarefasPendentes: tarefas ?? 0,
          feedbacksPendentes: feedbacks ?? 0,
          notificacoesNaoLidas: notifs ?? 0,
          projetsVencendo: projetos ?? 0,
        });
      } catch {}
    }
    fetchCounters();
    const id = setInterval(fetchCounters, pollMs);
    return () => { mounted = false; clearInterval(id); };
  }, [pollMs]);

  return c;
}
