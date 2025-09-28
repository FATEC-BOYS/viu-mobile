// src/theme/ThemeProvider.tsx
import React, { createContext, useContext, useMemo, useState, useEffect } from "react";
import { useColorScheme } from "react-native";
import { palettes, Tokens, Mode } from "./tokens";

type Ctx = { mode: Mode; t: Tokens; setMode: (m: Mode)=>void; toggleMode: ()=>void };
const ThemeCtx = createContext<Ctx>({} as any);

export function useTheme() { return useContext(ThemeCtx); }

export function ThemeProvider({ children, forcedMode }:{ children: React.ReactNode; forcedMode?: Mode; }) {
  const system = useColorScheme() ?? "light";
  const [mode, setMode] = useState<Mode>(forcedMode ?? (system === "dark" ? "dark" : "light"));

  // se forcedMode mudar, respeita
  useEffect(() => {
    if (forcedMode) setMode(forcedMode);
  }, [forcedMode]);

  const t = useMemo(()=> palettes[mode], [mode]);
  const toggleMode = () => setMode(prev => prev === "light" ? "dark" : "light");

  return <ThemeCtx.Provider value={{ mode, t, setMode, toggleMode }}>{children}</ThemeCtx.Provider>;
}
