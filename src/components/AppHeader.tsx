// src/components/AppHeader.tsx
import React, { useState } from "react";
import { View, Text, Pressable, Modal } from "react-native";
import { useTheme } from "../theme/ThemeProvider";
import { makeSkin } from "../theme/skin";
import { useAuth } from "../contexts/AuthContext";

export function AppHeader({ title = "VIU" }: { title?: string }) {
  const { t, toggleMode, mode } = useTheme();
  const s = makeSkin(t);
  const { signOut, user } = useAuth();
  const [open, setOpen] = useState(false);

  return (
    <View style={{ paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderColor: t.colors.border, backgroundColor: t.colors.background, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
      <Text style={[s.text, { fontWeight: "700", fontSize: 18 }]}>{title}</Text>

      <Pressable onPress={() => setOpen(true)} hitSlop={10}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: t.colors.primary, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ color: t.colors.primaryForeground, fontWeight: "800" }}>
              {(user?.email?.[0] ?? "U").toUpperCase()}
            </Text>
          </View>
          <Text style={[s.text, { opacity: 0.8 }]}>{user?.email ?? "Usuário"}</Text>
        </View>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.2)" }} onPress={() => setOpen(false)}>
          <View style={{ position: "absolute", right: 12, top: 56, minWidth: 220, backgroundColor: t.colors.card, borderColor: t.colors.border, borderWidth: 1, borderRadius: 12, overflow: "hidden" }}>
            <Pressable onPress={toggleMode} style={{ padding: 12 }}>
              <Text style={[s.text]}>{mode === "light" ? "Modo escuro" : "Modo claro"}</Text>
            </Pressable>
            <Pressable onPress={() => { setOpen(false); }} style={{ padding: 12 }}>
              <Text style={[s.text]}>Perfil</Text>
            </Pressable>
            <Pressable onPress={() => { setOpen(false); }} style={{ padding: 12 }}>
              <Text style={[s.text]}>Configurações</Text>
            </Pressable>
            <View style={{ height: 1, backgroundColor: t.colors.border }} />
            <Pressable onPress={() => { setOpen(false); signOut(); }} style={{ padding: 12 }}>
              <Text style={[s.text, { color: t.colors.destructive, fontWeight: "700" }]}>Sair</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}
