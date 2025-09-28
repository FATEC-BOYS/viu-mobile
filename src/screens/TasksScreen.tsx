import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  Modal,
  ActivityIndicator,
} from "react-native";
import { supabase } from "../lib/supabase";
import { useTheme } from "../theme/ThemeProvider";
import { makeSkin } from "../theme/skin";
import { Card } from "../ui/Card";
import { Input } from "../ui/Input";
import { Button, ButtonGhost } from "../ui/Button";

/* ===================== Tipos ===================== */

interface Tarefa {
  id: string;
  titulo: string;
  descricao: string | null;
  status: "PENDENTE" | "EM_ANDAMENTO" | "CONCLUIDA" | "CANCELADA" | string;
  prioridade: "ALTA" | "MEDIA" | "BAIXA" | string;
  prazo: string | null; // ISO
  criado_em: string; // ISO
  atualizado_em: string; // ISO
  projeto: {
    nome: string;
    cliente: { nome: string };
  } | null;
  responsavel: { id: string; nome: string };
}

type SortKey = "prazo" | "prioridade" | "titulo" | "status" | "criado_em";

type MaybeArray<T> = T | T[] | null | undefined;
interface RawUsuario { id?: unknown; nome?: unknown; }
interface RawCliente { nome?: unknown; }
interface RawProjeto { nome?: unknown; cliente?: MaybeArray<RawCliente>; }
interface RawTarefaRow {
  id?: unknown;
  titulo?: unknown;
  descricao?: unknown;
  status?: unknown;
  prioridade?: unknown;
  prazo?: unknown;
  criado_em?: unknown;
  atualizado_em?: unknown;
  projeto?: MaybeArray<RawProjeto>;
  responsavel?: MaybeArray<RawUsuario>;
}
const toOne = <T,>(val: MaybeArray<T>): T | null => {
  if (Array.isArray(val)) return (val[0] ?? null) as T | null;
  return (val ?? null) as T | null;
};

/* ===================== Badges ===================== */

function StatusBadge({ status }: { status: string }) {
  const { t } = useTheme();
  const map = {
    PENDENTE: { label: "Pendente" },
    EM_ANDAMENTO: { label: "Em Andamento" },
    CONCLUIDA: { label: "Concluída" },
    CANCELADA: { label: "Cancelada" },
  } as const;
  const label = map[status as keyof typeof map]?.label ?? status;

  return (
    <View
      style={{
        alignSelf: "flex-start",
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: t.colors.border,
        backgroundColor: t.colors.secondary,
      }}
    >
      <Text style={{ color: t.colors.foreground, fontSize: 12, fontWeight: "600" }}>
        {label}
      </Text>
    </View>
  );
}

function PrioridadeBadge({ prioridade }: { prioridade: string }) {
  const { t } = useTheme();
  const label =
    prioridade === "ALTA" ? "Alta" :
    prioridade === "MEDIA" ? "Média" :
    prioridade === "BAIXA" ? "Baixa" : prioridade;

  return (
    <View
      style={{
        alignSelf: "flex-start",
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: t.colors.border,
        backgroundColor: t.colors.muted,
      }}
    >
      <Text style={{ color: t.colors.foreground, fontSize: 12, fontWeight: "600" }}>
        {label}
      </Text>
    </View>
  );
}

/* ===================== Select “simples” (Modal) ===================== */

type Option = { label: string; value: string };
function SelectModal({
  title,
  value,
  options,
  onChange,
  triggerLabel,
}: {
  title: string;
  value: string;
  options: Option[];
  onChange: (v: string) => void;
  triggerLabel?: string;
}) {
  const { t } = useTheme();
  const [open, setOpen] = useState(false);

  const current = options.find((o) => o.value === value)?.label ?? triggerLabel ?? title;

  return (
    <>
      <ButtonGhost title={current} onPress={() => setOpen(true)} />
      <Modal transparent visible={open} animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.2)", padding: 16, justifyContent: "center" }}
          onPress={() => setOpen(false)}
        >
          <View
            style={{
              backgroundColor: t.colors.card,
              borderWidth: 1,
              borderColor: t.colors.border,
              borderRadius: 14,
              overflow: "hidden",
            }}
          >
            <View style={{ padding: 12, borderBottomWidth: 1, borderColor: t.colors.border }}>
              <Text style={{ color: t.colors.foreground, fontWeight: "700" }}>{title}</Text>
            </View>
            {options.map((opt) => {
              const active = opt.value === value;
              return (
                <Pressable
                  key={opt.value}
                  onPress={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                  style={{
                    padding: 14,
                    backgroundColor: active ? t.colors.secondary : "transparent",
                    borderBottomWidth: 1,
                    borderColor: t.colors.border,
                  }}
                >
                  <Text style={{ color: t.colors.foreground, fontWeight: active ? "700" as const : "500" }}>
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

/* ===================== Card de tarefa ===================== */

function TarefaCard({ tarefa }: { tarefa: Tarefa }) {
  const { t } = useTheme();
  const s = makeSkin(t);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Sem prazo";
    const d = new Date(dateString);
    return d.toLocaleDateString("pt-BR");
  };
  const daysLeft = (() => {
    if (!tarefa.prazo) return null;
    const d = new Date(tarefa.prazo).getTime() - Date.now();
    return Math.ceil(d / (1000 * 60 * 60 * 24));
  })();
  const isOverdue = daysLeft !== null && daysLeft < 0;
  const isUrgent = daysLeft !== null && daysLeft >= 0 && daysLeft <= 3;

  return (
    <Card>
      <View style={{ gap: 8 }}>
        {/* título + badges */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Text style={[s.h3]} numberOfLines={2}>{tarefa.titulo}</Text>
            {tarefa.projeto && (
              <Text style={[s.text, { opacity: 0.7 }]} numberOfLines={2}>
                {tarefa.projeto.nome} • Cliente: {tarefa.projeto.cliente.nome}
              </Text>
            )}
          </View>
          <View style={{ alignItems: "flex-end", gap: 6 }}>
            <StatusBadge status={tarefa.status} />
            <PrioridadeBadge prioridade={tarefa.prioridade} />
          </View>
        </View>

        {/* descrição */}
        {tarefa.descricao ? (
          <Text style={[s.text, { opacity: 0.8 }]} numberOfLines={4}>
            {tarefa.descricao}
          </Text>
        ) : null}

        {/* grid info */}
        <View style={{ flexDirection: "row", gap: 14 }}>
          <View style={{ flex: 1 }}>
            <Text style={[s.text, { opacity: 0.6 }]}>Responsável</Text>
            <Text style={[s.text, { fontWeight: "600" }]} numberOfLines={1}>
              {tarefa.responsavel.nome}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[s.text, { opacity: 0.6 }]}>Prazo</Text>
            <Text
              style={[
                s.text,
                { fontWeight: "600", color: isOverdue ? t.colors.destructive : isUrgent ? "#b58900" : t.colors.foreground },
              ]}
              numberOfLines={1}
            >
              {formatDate(tarefa.prazo)}
              {isOverdue && daysLeft !== null && ` (${Math.abs(daysLeft)} dias atrasado)`}
              {!isOverdue && isUrgent && daysLeft !== null && ` (${daysLeft} dias)`}
            </Text>
          </View>
        </View>

        {/* aviso prazo */}
        {(isOverdue || isUrgent) && (
          <View
            style={{
              padding: 8,
              borderRadius: 10,
              backgroundColor: isOverdue ? "rgba(255,0,0,0.08)" : "rgba(255,215,0,0.10)",
            }}
          >
            <Text style={[s.text, { fontWeight: "600", color: isOverdue ? t.colors.destructive : "#b58900" }]}>
              {isOverdue ? "Tarefa atrasada" : "Prazo próximo"}
            </Text>
          </View>
        )}

        <View style={{ borderTopWidth: 1, borderColor: t.colors.border, paddingTop: 8 }}>
          <Text style={[s.text, { opacity: 0.6, fontSize: 12 }]}>
            Criada em {new Date(tarefa.criado_em).toLocaleDateString("pt-BR")}
          </Text>
        </View>
      </View>
    </Card>
  );
}

/* ===================== Tela principal ===================== */

export default function TaskScreen() {
  const { t } = useTheme();
  const s = makeSkin(t);

  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [filtered, setFiltered] = useState<Tarefa[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // filtros
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("todos");
  const [prio, setPrio] = useState<string>("todos");
  const [resp, setResp] = useState<string>("todos");
  const [sortBy, setSortBy] = useState<SortKey>("prazo");

  const [responsaveis, setResponsaveis] = useState<Array<{ id: string; nome: string }>>([]);

  useEffect(() => {
    let mounted = true;
    async function fetchTarefas() {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("tarefas")
          .select(`
            id,
            titulo,
            descricao,
            status,
            prioridade,
            prazo,
            criado_em,
            atualizado_em,
            projeto:projeto_id (
              nome,
              cliente:cliente_id (nome)
            ),
            responsavel:responsavel_id (id, nome)
          `)
          .order("criado_em", { ascending: false });

        if (error) throw error;

        const raw = (data ?? []) as RawTarefaRow[];
        const rows: Tarefa[] = raw.map((r) => {
          const projeto = toOne<RawProjeto>(r.projeto);
          const cliente = toOne<RawCliente>(projeto?.cliente ?? null);
          const resp = toOne<RawUsuario>(r.responsavel);
          return {
            id: String(r.id ?? ""),
            titulo: String(r.titulo ?? ""),
            descricao: r.descricao == null ? null : String(r.descricao),
            status: String(r.status ?? "") as Tarefa["status"],
            prioridade: String(r.prioridade ?? "") as Tarefa["prioridade"],
            prazo: r.prazo == null ? null : String(r.prazo),
            criado_em: String(r.criado_em ?? ""),
            atualizado_em: String(r.atualizado_em ?? ""),
            projeto: projeto
              ? {
                  nome: String(projeto.nome ?? ""),
                  cliente: { nome: String(cliente?.nome ?? "") },
                }
              : null,
            responsavel: { id: String(resp?.id ?? ""), nome: String(resp?.nome ?? "") },
          };
        });

        if (!mounted) return;
        setTarefas(rows);

        const unique = new Map<string, { id: string; nome: string }>();
        rows.forEach((t) => {
          if (t.responsavel.id && !unique.has(t.responsavel.id)) {
            unique.set(t.responsavel.id, { id: t.responsavel.id, nome: t.responsavel.nome });
          }
        });
        setResponsaveis(Array.from(unique.values()));
        setError(null);
      } catch (e) {
        if (!mounted) return;
        setError("Não foi possível carregar as tarefas.");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    fetchTarefas();
    return () => { mounted = false; };
  }, []);

  // filtros + ordenação
  useEffect(() => {
    let arr = tarefas;

    if (q) {
      const qq = q.toLowerCase();
      arr = arr.filter((t) => {
        const hitTitulo = t.titulo.toLowerCase().includes(qq);
        const hitDesc = t.descricao ? t.descricao.toLowerCase().includes(qq) : false;
        const hitProj = t.projeto ? t.projeto.nome.toLowerCase().includes(qq) : false;
        const hitResp = t.responsavel.nome.toLowerCase().includes(qq);
        return hitTitulo || hitDesc || hitProj || hitResp;
      });
    }

    if (status !== "todos") arr = arr.filter((t) => t.status === status);
    if (prio !== "todos") arr = arr.filter((t) => t.prioridade === prio);
    if (resp !== "todos") arr = arr.filter((t) => t.responsavel.id === resp);

    const ordered = [...arr].sort((a, b) => {
      switch (sortBy) {
        case "prazo": {
          const aTime = a.prazo ? new Date(a.prazo).getTime() : Infinity;
          const bTime = b.prazo ? new Date(b.prazo).getTime() : Infinity;
          return aTime - bTime;
        }
        case "prioridade": {
          const order = { ALTA: 3, MEDIA: 2, BAIXA: 1 } as const;
          const aVal = order[a.prioridade as keyof typeof order] ?? 0;
          const bVal = order[b.prioridade as keyof typeof order] ?? 0;
          return bVal - aVal;
        }
        case "titulo":
          return a.titulo.localeCompare(b.titulo);
        case "status": {
          const order = { PENDENTE: 1, EM_ANDAMENTO: 2, CONCLUIDA: 3, CANCELADA: 4 } as const;
          const aVal = order[a.status as keyof typeof order] ?? 0;
          const bVal = order[b.status as keyof typeof order] ?? 0;
          return aVal - bVal;
        }
        case "criado_em":
          return new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime();
        default:
          return 0;
      }
    });

    setFiltered(ordered);
  }, [tarefas, q, status, prio, resp, sortBy]);

  const stats = useMemo(() => {
    const atrasadas = tarefas.filter((t) => {
      if (!t.prazo) return false;
      const deadline = new Date(t.prazo);
      const today = new Date();
      return deadline < today && t.status !== "CONCLUIDA";
    }).length;
    return {
      total: tarefas.length,
      pendentes: tarefas.filter((t) => t.status === "PENDENTE").length,
      emAndamento: tarefas.filter((t) => t.status === "EM_ANDAMENTO").length,
      concluidas: tarefas.filter((t) => t.status === "CONCLUIDA").length,
      atrasadas,
    };
  }, [tarefas]);

  if (loading) {
    return (
      <View style={[s.screen, { alignItems: "center", justifyContent: "center", gap: 10 }]}>
        <ActivityIndicator />
        <Text style={[s.text, { opacity: 0.8 }]}>Carregando tarefas…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[s.screen, { alignItems: "center", justifyContent: "center" }]}>
        <Text style={{ color: t.colors.destructive }}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={s.screen}>
      {/* Header */}
      <View style={{ marginBottom: 12 }}>
        <Text style={s.h1}>Tarefas</Text>
        <Text style={[s.text, { opacity: 0.7 }]}>Gerencie todas as tarefas dos seus projetos</Text>
      </View>

      {/* Estatísticas */}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
        <StatCard label="Total" value={stats.total} />
        <StatCard label="Pendentes" value={stats.pendentes} tone="warn" />
        <StatCard label="Em Andamento" value={stats.emAndamento} tone="info" />
        <StatCard label="Concluídas" value={stats.concluidas} tone="ok" />
        <StatCard label="Atrasadas" value={stats.atrasadas} tone="error" />
      </View>

      {/* Filtros */}
      <Card>
        <View style={{ gap: 10 }}>
          <Input
            placeholder="Buscar por tarefa, projeto ou responsável…"
            value={q}
            onChangeText={setQ}
          />

          <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
            <SelectModal
              title="Status"
              value={status}
              onChange={setStatus}
              options={[
                { label: "Todos", value: "todos" },
                { label: "Pendente", value: "PENDENTE" },
                { label: "Em Andamento", value: "EM_ANDAMENTO" },
                { label: "Concluída", value: "CONCLUIDA" },
                { label: "Cancelada", value: "CANCELADA" },
              ]}
            />
            <SelectModal
              title="Prioridade"
              value={prio}
              onChange={setPrio}
              options={[
                { label: "Todas", value: "todos" },
                { label: "Alta", value: "ALTA" },
                { label: "Média", value: "MEDIA" },
                { label: "Baixa", value: "BAIXA" },
              ]}
            />
            <SelectModal
              title="Responsável"
              value={resp}
              onChange={setResp}
              options={[
                { label: "Todos", value: "todos" },
                ...responsaveis.map((r) => ({ label: r.nome, value: r.id })),
              ]}
            />
            <SelectModal
              title="Ordenar"
              value={sortBy}
              onChange={(v) => setSortBy(v as SortKey)}
              options={[
                { label: "Prazo", value: "prazo" },
                { label: "Prioridade", value: "prioridade" },
                { label: "Título", value: "titulo" },
                { label: "Status", value: "status" },
                { label: "Mais Recente", value: "criado_em" },
              ]}
            />
          </View>

          <Button title="Nova tarefa" onPress={() => { /* TODO: abrir modal/criar */ }} />
        </View>
      </Card>

      {/* Lista */}
      {filtered.length > 0 ? (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingTop: 8, paddingBottom: 24, gap: 12 }}
          renderItem={({ item }) => <TarefaCard tarefa={item} />}
        />
      ) : (
        <Card>
          <View style={{ alignItems: "center", paddingVertical: 24, gap: 8 }}>
            <Text style={[s.h3, { textAlign: "center" }]}>Nenhuma tarefa encontrada</Text>
            <Text style={[s.text, { opacity: 0.7, textAlign: "center" }]}>
              {q || status !== "todos" || prio !== "todos" || resp !== "todos"
                ? "Tente ajustar os filtros de busca."
                : "Comece criando sua primeira tarefa."}
            </Text>
            {!(q || status !== "todos" || prio !== "todos" || resp !== "todos") && (
              <Button title="Criar primeira tarefa" onPress={() => { /* TODO */ }} />
            )}
          </View>
        </Card>
      )}
    </View>
  );
}

/* ===================== UI helpers ===================== */

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "ok" | "warn" | "error" | "info";
}) {
  const { t } = useTheme();
  const bg =
    tone === "ok" ? "rgba(16,185,129,0.12)" :
    tone === "warn" ? "rgba(234,179,8,0.12)" :
    tone === "error" ? "rgba(239,68,68,0.12)" :
    tone === "info" ? "rgba(59,130,246,0.12)" :
    t.colors.secondary;

  return (
    <View
      style={{
        flexGrow: 1,
        minWidth: 120,
        backgroundColor: bg,
        borderWidth: 1,
        borderColor: t.colors.border,
        borderRadius: 12,
        padding: 12,
      }}
    >
      <Text style={{ color: t.colors.foreground, fontWeight: "800", fontSize: 18 }}>
        {value}
      </Text>
      <Text style={{ color: t.colors.mutedForeground, fontSize: 12 }}>{label}</Text>
    </View>
  );
}
