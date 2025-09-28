// src/theme/skin.ts
import { StyleSheet, Platform } from "react-native";
import { Tokens } from "./tokens";

export const makeSkin = (t: Tokens) =>
  StyleSheet.create({
    // base
    screen: {
      flex: 1,
      backgroundColor: t.colors.background,
      padding: 24,
    },
    text: {
      color: t.colors.foreground,
    },
    h1: {
      color: t.colors.foreground,
      fontSize: 24,
      fontWeight: "700",
      marginBottom: 12,
    },

    h2: { color: t.colors.foreground, fontSize: 18, fontWeight: "700" as const, marginBottom: 4 },
    h3: { color: t.colors.foreground, fontSize: 16, fontWeight: "700" as const },

    // input
    input: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: t.colors.border,
      color: t.colors.foreground,
      paddingHorizontal: 12,
      paddingVertical: Platform.select({ ios: 14, android: 12 }),
      marginBottom: 12,
    },
    inputPlaceholder: {
      color: t.colors.mutedForeground,
    },

    // button (primary)
    btn: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: t.colors.border,
      backgroundColor: t.colors.primary,
      paddingVertical: 12,
      alignItems: "center",
      justifyContent: "center",
      // sombra suave
      ...Platform.select({
        ios: { shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 10, shadowOffset: { width: 0, height: 10 } },
        android: { elevation: 4 },
      }),
    },
    btnText: {
      color: t.colors.primaryForeground,
      fontWeight: "600",
    },

    // button (ghost)
    btnGhost: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: t.colors.foreground,
      paddingVertical: 12,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 8,
    },
    btnGhostText: {
      color: t.colors.foreground,
      fontWeight: "600",
    },

    // link
    link: {
      color: "#0b5cff",
      fontWeight: "600",
      textAlign: "center",
      marginTop: 8,
    },

    // card (com “moldura dupla” sutil + grid)
    card: {
      borderRadius: 16,
      backgroundColor: t.colors.card,
      borderWidth: 1,
      borderColor: t.colors.border,
      padding: 16,
      ...Platform.select({
        ios: { shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 10, shadowOffset: { width: 0, height: 10 } },
        android: { elevation: 3 },
      }),
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: t.colors.foreground,
      paddingVertical: 4,
      borderBottomWidth: 1,
      borderBottomColor: t.colors.primary, // gradiente não existe no StyleSheet puro
      marginBottom: 8,
    },
  });
