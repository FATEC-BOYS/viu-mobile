// src/ui/Button.tsx
import React from "react";
import {
  ActivityIndicator,
  Pressable,
  Text,
  PressableProps,
  StyleProp,
  ViewStyle,
} from "react-native";
import { useTheme } from "../theme/ThemeProvider";
import { makeSkin } from "../theme/skin";

type BtnProps = PressableProps & {
  title: string;
  loading?: boolean;           // ✅ agora existe
  style?: StyleProp<ViewStyle>;
};

export function Button({ title, loading, disabled, style, ...rest }: BtnProps) {
  const { t } = useTheme();
  const s = makeSkin(t);
  const isDisabled = !!disabled || !!loading;

  return (
    <Pressable
      style={[s.btn, isDisabled && { opacity: 0.6 }, style]}
      disabled={isDisabled}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={t.colors.primaryForeground} />
      ) : (
        <Text style={s.btnText}>{title}</Text>
      )}
    </Pressable>
  );
}

export function ButtonGhost({
  title,
  loading,
  disabled,
  style,
  ...rest
}: BtnProps) {
  const { t } = useTheme();
  const s = makeSkin(t);
  const isDisabled = !!disabled || !!loading;

  return (
    <Pressable
      style={[s.btnGhost, isDisabled && { opacity: 0.6 }, style]}
      disabled={isDisabled}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator />
      ) : (
        <Text style={s.btnGhostText}>{title}</Text>
      )}
    </Pressable>
  );
}
