import { supabase } from "../lib/supabase";
import { Projeto, Arte, Feedback } from "../types";

export async function listProjetos(): Promise<Projeto[]> {
  const { data, error } = await supabase
    .from("projetos")
    .select("id,nome,created_at")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function listArtesByProjeto(projetoId: string): Promise<Arte[]> {
  const { data, error } = await supabase
    .from("artes")
    .select("id,projeto_id,titulo,versao,arquivo_url,created_at")
    .eq("projeto_id", projetoId)
    .order("versao", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function listFeedbacks(arteId: string): Promise<Feedback[]> {
  const { data, error } = await supabase
    .from("feedbacks")
    .select("id,arte_id,author_id,tipo,texto,audio_url,created_at")
    .eq("arte_id", arteId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createTextFeedback(arteId: string, texto: string) {
  const { data, error } = await supabase
    .from("feedbacks")
    .insert({ arte_id: arteId, tipo: "text", texto })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function uploadAudioAndCreateFeedback(
  arteId: string,
  fileUri: string
) {
  // Gera um path de upload: feedback-audio/{arteId}/{timestamp}.m4a
  const ts = Date.now();
  const path = `${arteId}/${ts}.m4a`;
  const bucket = "feedback-audio";

  const file = await fetch(fileUri);
  const blob = await file.blob();

  const { error: upErr } = await supabase.storage
    .from(bucket)
    .upload(path, blob, { contentType: "audio/m4a", upsert: false });
  if (upErr) throw upErr;

  const { data: pub } = supabase.storage.from(bucket).getPublicUrl(path);
  const audio_url = pub.publicUrl;

  const { data, error } = await supabase
    .from("feedbacks")
    .insert({ arte_id: arteId, tipo: "audio", audio_url })
    .select()
    .single();

  if (error) throw error;
  return data;
}
