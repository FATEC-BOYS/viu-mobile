// src/Root/AppShell.tsx
import React from "react";
import { View } from "react-native";
import { useTheme } from "../theme/ThemeProvider";
import { makeSkin } from "../theme/skin";
import { AppHeader } from "../components/AppHeader";
import Tabs from "./Tabs";

export default function AppShell() {
  const { t } = useTheme();
  const s = makeSkin(t);

  return (
    <View style={[s.screen, { padding: 0 }]}>
      <AppHeader title="VIU" />
      <View style={{ flex: 1 }}>
        <Tabs />
      </View>
    </View>
  );
}
