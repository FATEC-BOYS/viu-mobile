// src/ui/Card.tsx
import React from "react";
import { View, ViewProps } from "react-native";
import { useTheme } from "../theme/ThemeProvider";
import { makeSkin } from "../theme/skin";

export function Card({ style, ...rest }: ViewProps) {
  const { t } = useTheme();
  const s = makeSkin(t);
  return <View style={[s.card, style]} {...rest} />;
}
