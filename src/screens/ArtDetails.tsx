// src/screens/ArtDetails.tsx
import React, { useEffect, useRef, useState } from "react";
import { View, Text, Image, FlatList, TextInput, Pressable, Alert } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Audio } from "expo-av";

import { ArtsStackParamList } from "../Root/ArtsStack";
import { listFeedbacks, createTextFeedback, uploadAudioAndCreateFeedback } from "../api";
import { Feedback, Arte } from "../types";
import { supabase } from "../lib/supabase";
import { publicUrl } from "../lib/storage";

type Props = NativeStackScreenProps<ArtsStackParamList, "Art">;

export default function ArtDetails({ route }: Props) {
  const { arteId } = route.params;

  const [arte, setArte] = useState<Arte | null>(null);
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [texto, setTexto] = useState("");
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    supabase
      .from("artes")
      .select("id,projeto_id,titulo,versao,arquivo_url,created_at")
      .eq("id", arteId)
      .single()
      .then(({ data, error }) => {
        if (error) Alert.alert("Erro", error.message);
        setArte(data ?? null);
      });
  }, [arteId]);

  const loadFeedbacks = async () => {
    const rows = await listFeedbacks(arteId);
    setFeedbacks(rows);
  };
  useEffect(() => { loadFeedbacks(); }, [arteId]);

  const onSendText = async () => {
    if (!texto.trim()) return;
    try {
      await createTextFeedback(arteId, texto.trim());
      setTexto("");
      await loadFeedbacks();
    } catch (e: any) {
      Alert.alert("Erro", e.message ?? "Falha ao enviar feedback");
    }
  };

  const onStartRecording = async () => {
    const { status } = await Audio.requestPermissionsAsync();
    if (status !== "granted") {
      return Alert.alert("Permissão", "Conceda acesso ao microfone.");
    }
    await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
    const rec = new Audio.Recording();
    await rec.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
    await rec.startAsync();
    setRecording(rec);
  };

  const onStopRecording = async () => {
    if (!recording) return;
    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();
    setRecording(null);
    if (!uri) return;

    try {
      setUploading(true);
      await uploadAudioAndCreateFeedback(arteId, uri);
      await loadFeedbacks();
    } catch (e: any) {
      Alert.alert("Erro", e.message ?? "Falha no upload do áudio");
    } finally {
      setUploading(false);
    }
  };

  const imgUrl =
    arte?.arquivo_url?.startsWith("http")
      ? arte.arquivo_url
      : publicUrl("uploads", arte?.arquivo_url);

  return (
    <View style={{ flex: 1 }}>
      {/* Preview */}
      {imgUrl ? (
        <Image
          source={{ uri: imgUrl }}
          style={{ width: "100%", aspectRatio: 16 / 9, backgroundColor: "#f3f4f6" }}
          resizeMode="contain"
        />
      ) : (
        <View style={{ height: 200, alignItems: "center", justifyContent: "center", backgroundColor: "#f3f4f6" }}>
          <Text style={{ opacity: 0.6 }}>Sem preview</Text>
        </View>
      )}

      {/* Feedbacks */}
      <FlatList
        style={{ flex: 1, padding: 16 }}
        data={feedbacks}
        keyExtractor={(it) => String(it.id)}
        ListEmptyComponent={<Text style={{ opacity: 0.6 }}>Sem feedbacks ainda.</Text>}
        renderItem={({ item }) => (
          <View
            style={{
              padding: 12,
              borderWidth: 1,
              borderColor: "#e5e7eb",
              borderRadius: 10,
              marginBottom: 10,
              backgroundColor: "#fff",
            }}
          >
            <Text style={{ fontWeight: "600", marginBottom: 6 }}>
              {item.tipo === "text" ? "Texto" : "Áudio"} • {new Date(item.created_at).toLocaleString()}
            </Text>
            {item.tipo === "text" ? (
              <Text>{item.texto}</Text>
            ) : item.audio_url ? (
              <Text
                style={{ color: "#2563eb" }}
                onPress={async () => {
                  const { sound } = await Audio.Sound.createAsync({ uri: item.audio_url });
                  await sound.playAsync();
                }}
              >
                ▶️ Reproduzir áudio
              </Text>
            ) : (
              <Text style={{ opacity: 0.6 }}>Sem URL de áudio</Text>
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
          <Pressable onPress={onSendText} style={{ flex: 1, backgroundColor: "#111", padding: 12, borderRadius: 10 }}>
            <Text style={{ color: "#fff", textAlign: "center", fontWeight: "600" }}>Enviar texto</Text>
          </Pressable>

          {recording ? (
            <Pressable
              onPress={onStopRecording}
              style={{ padding: 12, borderRadius: 10, borderWidth: 1, borderColor: "#ef4444", minWidth: 120 }}
            >
              <Text style={{ textAlign: "center", fontWeight: "700", color: "#ef4444" }}>■ Parar</Text>
            </Pressable>
          ) : (
            <Pressable
              disabled={uploading}
              onPress={onStartRecording}
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
