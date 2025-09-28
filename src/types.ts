export type Projeto = { id: string; nome: string; created_at?: string };
export type Arte = {
  id: string;
  projeto_id: string;
  titulo?: string;
  versao?: number;
  arquivo_url?: string; // URL pública (ou path do storage)
  created_at?: string;
};
export type Feedback = {
  id: string;
  arte_id: string;
  author_id?: string;
  tipo: "text" | "audio";
  texto?: string;
  audio_url?: string; // URL pública do áudio
  created_at: string;
};
