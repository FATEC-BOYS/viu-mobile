// src/ui/Input.tsx
import React from "react";
import { TextInput, TextInputProps } from "react-native";
import { useTheme } from "../theme/ThemeProvider";
import { makeSkin } from "../theme/skin";

export function Input(props: TextInputProps) {
  const { t } = useTheme();
  const s = makeSkin(t);
  return (
    <TextInput
      placeholderTextColor={t.colors.mutedForeground}
      style={s.input}
      {...props}
    />
  );
}
