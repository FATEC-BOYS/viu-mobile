// src/theme/tokens.ts
export type Mode = "light" | "dark";

const light = {
  radius: 10, // ~0.625rem
  colors: {
    background: "#FCFCFD",
    foreground: "#1C1C21",

    card: "#FCFCFD",
    cardForeground: "#1C1C21",

    popover: "#FCFCFD",
    popoverForeground: "#1C1C21",

    primary: "#F28C2E", // laranja
    primaryForeground: "#FCFCFD",

    secondary: "#FEFEFF",
    secondaryForeground: "#1C1C21",

    muted: "#F3F4F6",
    mutedForeground: "#5E6472",

    accent: "#F3F4F6",
    accentForeground: "#1C1C21",

    destructive: "#D6512B",

    border: "#E6E8EB",
    input: "#E6E8EB",
    ring: "#F28C2E",

    // charts
    chart1: "#F28C2E",
    chart2: "#1C1C21",
    chart3: "#D6DEE7",
    chart4: "#8AA1B2",
    chart5: "#BFC7D1",

    // sidebar
    sidebar: "#FCFCFD",
    sidebarForeground: "#1C1C21",
    sidebarPrimary: "#F28C2E",
    sidebarPrimaryForeground: "#FCFCFD",
    sidebarAccent: "#FEFEFF",
    sidebarAccentForeground: "#1C1C21",
    sidebarBorder: "#E6E8EB",
    sidebarRing: "#F28C2E",
  },
  shadow: {
    soft: "0px 10px 30px rgba(28,28,33,0.10)",
    neonPrimary: "0px 0px 24px rgba(242,140,46,0.55)",
  },
};

const dark = {
  ...light,
  colors: {
    ...light.colors,
    background: "#232329",
    foreground: "#F2F3F5",

    card: "#2B2B32",
    cardForeground: "#F2F3F5",

    popover: "#2B2B32",
    popoverForeground: "#F2F3F5",

    primary: "#FFA249",
    primaryForeground: "#232329",

    secondary: "#2D2D35",
    secondaryForeground: "#F2F3F5",

    muted: "#2D2D35",
    mutedForeground: "#BAC1CC",

    accent: "#2D2D35",
    accentForeground: "#F2F3F5",

    destructive: "#E0603A",

    border: "rgba(255,255,255,0.12)",
    input: "rgba(255,255,255,0.16)",
    ring: "#FFA249",

    chart1: "#FFA249",
    chart2: "#F2F3F5",
    chart3: "#8AA1B2",
    chart4: "#BFC7D1",
    chart5: "#7C7F8A",

    sidebar: "#2A2A31",
    sidebarForeground: "#F2F3F5",
    sidebarPrimary: "#FFA249",
    sidebarPrimaryForeground: "#232329",
    sidebarAccent: "#2D2D35",
    sidebarAccentForeground: "#F2F3F5",
    sidebarBorder: "rgba(255,255,255,0.12)",
    sidebarRing: "#FFA249",
  },
};

export const palettes = { light, dark };
export type Tokens = typeof light;
