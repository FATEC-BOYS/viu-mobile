import React, { useEffect, useMemo, useState } from "react";
import { View, Text, Image, FlatList, TextInput, Pressable, Alert, ActivityIndicator } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Audio } from "expo-av";
import { Feather } from "@expo/vector-icons";

import { ArtesStackParamList } from "../../Root/AppShell";
import { supabase } from "../../lib/supabase";

type Props = NativeStackScreenProps<ArtesStackParamList, "ArteDetails">;

// ===== Tipos alinhados ao seu schema =====
type Arte = {
  id: string;
  nome: string;
  descricao?: string | null;
  arquivo: string;                     // pode ser URL ou path
  tipo: string;
  versao_atual?: number | null;
  status_atual?: string | null;
  projeto_id: string;
  criado_em: string;
};

type Feedback = {
  id: string;
  conteudo: string;
  tipo: "TEXTO" | "AUDIO";
  arquivo?: string | null;             // para áudio (ou anexo)
  autor_id: string;
  criado_em: string;
};

type Preview = {
  arquivo: string;
  versao: number;
  kind: "PREVIEW" | "FONTE" | "ANEXO";
};

// helper: public URL de um arquivo do storage
function getPublicUrl(bucket: string, path?: string | null): string | null {
  if (!path) return null;
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data?.publicUrl ?? null;
}

export default function ArtDetails({ route }: Props) {
  const { id } = route.params;

  const [loading, setLoading] = useState(true);
  const [arte, setArte] = useState<Arte | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);

  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [texto, setTexto] = useState("");
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [uploading, setUploading] = useState(false);

  // ===== Carregar arte + preview =====
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const { data: a, error: aErr } = await supabase
          .from("artes")
          .select(`
            id, nome, descricao, arquivo, tipo, versao_atual, status_atual, projeto_id, criado_em
          `)
          .eq("id", id)
          .single();
        if (aErr) throw aErr;
        if (!mounted) return;
        setArte(a as any);

        // preview mais recente
        const { data: p, error: pErr } = await supabase
          .from("arte_arquivos")
          .select(`arquivo, versao, kind`)
          .eq("arte_id", id)
          .eq("kind", "PREVIEW")
          .order("versao", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (pErr) {
          // ok ignorar caso não haja registro
          console.warn("preview", pErr.message);
        }
        if (!mounted) return;
        setPreview((p as any) ?? null);
      } catch (e: any) {
        Alert.alert("Erro", e?.message ?? "Falha ao carregar a arte.");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [id]);

  // ===== Carregar feedbacks =====
  async function loadFeedbacks() {
    const { data, error } = await supabase
      .from("feedbacks")
      .select(`id, conteudo, tipo, arquivo, autor_id, criado_em`)
      .eq("arte_id", id)
      .order("criado_em", { ascending: false });
    if (error) throw error;
    setFeedbacks((data as any) ?? []);
  }
  useEffect(() => {
    loadFeedbacks().catch((e) =>
      Alert.alert("Erro", e?.message ?? "Falha ao carregar feedbacks.")
    );
  }, [id]);

  // ===== Enviar feedback de TEXTO =====
  async function onSendText() {
    const value = texto.trim();
    if (!value) return;
    try {
      const { error } = await supabase.from("feedbacks").insert({
        arte_id: id,
        conteudo: value,
        tipo: "TEXTO",
      });
      if (error) throw error;
      setTexto("");
      await loadFeedbacks();
    } catch (e: any) {
      Alert.alert("Erro", e?.message ?? "Falha ao enviar feedback.");
    }
  }

  // ===== Gravação ÁUDIO =====
  async function onStartRecording() {
    const { status } = await Audio.requestPermissionsAsync();
    if (status !== "granted") {
      return Alert.alert("Permissão", "Conceda acesso ao microfone.");
    }
    await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
    const rec = new Audio.Recording();
    await rec.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
    await rec.startAsync();
    setRecording(rec);
  }

  async function onStopRecording() {
    if (!recording) return;
    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();
    setRecording(null);
    if (!uri) return;

    try {
      setUploading(true);

      // 1) sobe o arquivo pro bucket "audios" (crie esse bucket público no Supabase)
      const fileName = `feedbacks/${id}/${Date.now()}.m4a`;
      const res = await fetch(uri);
      const blob = await res.blob();

      const { error: upErr } = await supabase.storage
        .from("audios")
        .upload(fileName, blob, {
          contentType: "audio/m4a",
          upsert: false,
        });
      if (upErr) throw upErr;

      const audioUrl = getPublicUrl("audios", fileName);
      if (!audioUrl) throw new Error("Não foi possível gerar URL pública do áudio.");

      // 2) cria feedback tipo ÁUDIO com o link
      const { error: fbErr } = await supabase.from("feedbacks").insert({
        arte_id: id,
        tipo: "AUDIO",
        arquivo: audioUrl,
        conteudo: "", // opcional
      });
      if (fbErr) throw fbErr;

      await loadFeedbacks();
    } catch (e: any) {
      Alert.alert("Erro", e?.message ?? "Falha no upload do áudio.");
    } finally {
      setUploading(false);
    }
  }

  // ===== URLs de imagem =====
  const displayImage = useMemo(() => {
    // prioridade ao preview; senão tenta o campo "arquivo" da própria arte
    const previewUrl = preview?.arquivo?.startsWith("http")
      ? preview.arquivo
      : getPublicUrl("uploads", preview?.arquivo ?? "") || preview?.arquivo;

    const arteUrl = arte?.arquivo?.startsWith("http")
      ? arte.arquivo
      : getPublicUrl("uploads", arte?.arquivo ?? "") || arte?.arquivo;

    return previewUrl || arteUrl || null;
  }, [preview, arte]);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
        <Text style={{ marginTop: 8 }}>Carregando...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {/* Preview */}
      {displayImage ? (
        <Image
          source={{ uri: displayImage }}
          style={{ width: "100%", aspectRatio: 16 / 9, backgroundColor: "#f3f4f6" }}
          resizeMode="contain"
        />
      ) : (
        <View
          style={{
            height: 200,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#f3f4f6",
          }}
        >
          <Text style={{ opacity: 0.6 }}>Sem preview</Text>
        </View>
      )}

      {/* Header */}
      <View style={{ padding: 16, paddingBottom: 8 }}>
        <Text style={{ fontSize: 18, fontWeight: "700" }}>{arte?.nome ?? "(sem nome)"}</Text>
        <Text style={{ opacity: 0.7, marginTop: 2 }}>
          {arte?.status_atual ?? "—"} {arte?.versao_atual ? `· v${arte.versao_atual}` : ""}
        </Text>
      </View>

      {/* Feedbacks */}
      <FlatList
        style={{ flex: 1, padding: 16, paddingTop: 8 }}
        data={feedbacks}
        keyExtractor={(it) => it.id}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        ListEmptyComponent={<Text style={{ opacity: 0.6 }}>Sem feedbacks ainda.</Text>}
        renderItem={({ item }) => (
          <View
            style={{
              padding: 12,
              borderWidth: 1,
              borderColor: "#e5e7eb",
              borderRadius: 10,
              backgroundColor: "#fff",
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Text style={{ fontWeight: "600" }}>
                {item.tipo === "TEXTO" ? "Texto" : "Áudio"}
              </Text>
              <Text style={{ opacity: 0.6 }}>{new Date(item.criado_em).toLocaleString()}</Text>
            </View>

            {item.tipo === "TEXTO" ? (
              <Text style={{ marginTop: 6 }}>{item.conteudo}</Text>
            ) : item.arquivo ? (
              <Pressable
                onPress={async () => {
                  try {
                    const { sound } = await Audio.Sound.createAsync({ uri: item.arquivo! });
                    await sound.playAsync();
                  } catch (e) {
                    Alert.alert("Erro", "Não foi possível tocar o áudio.");
                  }
                }}
                android_ripple={{ color: "#E5E7EB" }}
                style={{
                  marginTop: 8,
                  borderWidth: 1,
                  borderColor: "#d1d5db",
                  padding: 10,
                  borderRadius: 10,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <Feather name="play" size={16} />
                <Text style={{ color: "#111827" }}>Reproduzir áudio</Text>
              </Pressable>
            ) : (
              <Text style={{ opacity: 0.6, marginTop: 6 }}>Sem URL de áudio</Text>
            )}
          </View>
        )}
      />

      {/* Composer */}
      <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: "#e5e7eb", gap: 8 }}>
        <TextInput
          placeholder="Escreva um feedback…"
          value={texto}
          onChangeText={setTexto}
          style={{ borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 10, padding: 12 }}
        />
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Pressable
            onPress={onSendText}
            android_ripple={{ color: "#11182722" }}
            style={{ flex: 1, backgroundColor: "#111", padding: 12, borderRadius: 10 }}
          >
            <Text style={{ color: "#fff", textAlign: "center", fontWeight: "600" }}>Enviar texto</Text>
          </Pressable>

          {recording ? (
            <Pressable
              onPress={onStopRecording}
              android_ripple={{ color: "#ef444422" }}
              style={{
                padding: 12,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: "#ef4444",
                minWidth: 120,
              }}
            >
              <Text style={{ textAlign: "center", fontWeight: "700", color: "#ef4444" }}>■ Parar</Text>
            </Pressable>
          ) : (
            <Pressable
              disabled={uploading}
              onPress={onStartRecording}
              android_ripple={{ color: "#11182722" }}
              style={{
                padding: 12,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: "#111",
                minWidth: 120,
                opacity: uploading ? 0.6 : 1,
              }}
            >
              <Text style={{ textAlign: "center", fontWeight: "600" }}>🎙️ Gravar</Text>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}
