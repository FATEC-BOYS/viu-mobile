import { supabase } from "./supabase";

export function publicUrl(bucket: string, path: string | null | undefined) {
  if (!path) return null;
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl ?? null;
}
