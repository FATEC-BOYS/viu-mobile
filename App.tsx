// App.tsx
import React from "react";
import { StatusBar } from "react-native";
import { AuthProvider } from "./src/contexts/AuthContext";
import { ThemeProvider } from "./src/theme/ThemeProvider";
import Root from "./src/Root/Root";

export default function App() {
  return (
    // forcedMode="dark" para testar o tema escuro; remova para seguir o sistema
    <ThemeProvider /* forcedMode="dark" */>
      <AuthProvider>
        <StatusBar
          barStyle="dark-content" // troca para "light-content" se for forçar dark
          backgroundColor="transparent"
          translucent
        />
        <Root />
      </AuthProvider>
    </ThemeProvider>
  );
}
