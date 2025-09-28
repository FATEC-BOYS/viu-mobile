// src/screens/OnboardingScreen.tsx
import React, { useRef, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Dimensions,
  Pressable,
  Image,
  StyleSheet,
  ListRenderItemInfo,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useTheme } from "../theme/ThemeProvider";
import { makeSkin } from "../theme/skin";
import { Button, ButtonGhost } from "../ui/Button";

const { width } = Dimensions.get("window");

type Slide = {
  key: string;
  title: string;
  desc: string;
  // você pode trocar por ilustras reais
  art?: any;
};

const SLIDES: Slide[] = [
  {
    key: "1",
    title: "Gerencie artes e feedbacks",
    desc:
      "Centralize versões, organize comentários e mantenha o histórico claro entre você e seu cliente.",
  },
  {
    key: "2",
    title: "Feedback por texto e áudio",
    desc:
      "Grave instruções rápidas ou escreva comentários. Tudo fica anexado à arte e à versão.",
  },
  {
    key: "3",
    title: "Aprovação segura por versão",
    desc:
      "Acompanhe status: Em análise, Revisão e Aprovado. Links compartilháveis só leitura.",
  },
];

export default function OnboardingScreen() {
  const nav = useNavigation<any>();
  const { t } = useTheme();
  const s = makeSkin(t);
  const [index, setIndex] = useState(0);
  const ref = useRef<FlatList<Slide>>(null);

  function onViewableItemsChanged({ viewableItems }: any) {
    if (viewableItems?.length > 0) {
      const i = viewableItems[0].index ?? 0;
      setIndex(i);
    }
  }

  const viewConfigRef = useRef({ viewAreaCoveragePercentThreshold: 50 });

  const goto = (i: number) => {
    ref.current?.scrollToIndex({ index: i, animated: true });
  };

  const renderItem = ({ item }: ListRenderItemInfo<Slide>) => (
    <View style={[styles.slide, { width }]}>
      {/* “Hero card” com borda + leve gradiente */}
      <View style={[s.card, styles.heroCard]}>
        <Text style={[s.h1, { marginBottom: 8 }]}>{item.title}</Text>
        <Text style={[s.text, { opacity: 0.85 }]}>{item.desc}</Text>

        {/* Placeholder de preview (trocar por imagem/ilustração) */}
        <View style={styles.previewBox}>
          <View style={[styles.previewSidebar, { borderColor: t.colors.border }]} />
          <View style={styles.previewMain}>
            <View style={[styles.previewBlock, { backgroundColor: withOpacity(t.colors.foreground, 0.1) }]} />
            <View style={[styles.previewBlock, { backgroundColor: withOpacity(t.colors.foreground, 0.1) }]} />
          </View>
        </View>
      </View>
    </View>
  );

  return (
    <View style={[s.screen, { paddingTop: 48 }]}>
      {/* Header simples */}
      <View style={styles.header}>
        <View style={[styles.brand, { backgroundColor: t.colors.primary }]}>
          <Text style={{ color: t.colors.primaryForeground, fontWeight: "800" }}>VIU</Text>
        </View>
        <Pressable onPress={() => nav.navigate("Login")}>
          <Text style={[s.text, { opacity: 0.8 }]}>Entrar</Text>
        </Pressable>
      </View>

      {/* Carrossel */}
      <FlatList
        ref={ref}
        data={SLIDES}
        keyExtractor={(it) => it.key}
        renderItem={renderItem}
        horizontal
        showsHorizontalScrollIndicator={false}
        pagingEnabled
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewConfigRef.current}
        contentContainerStyle={{ paddingVertical: 16 }}
      />

      {/* Indicadores */}
      <View style={styles.dots}>
        {SLIDES.map((_, i) => {
          const active = i === index;
          return (
            <View
              key={i}
              style={[
                styles.dot,
                {
                  backgroundColor: active ? t.colors.primary : withOpacity(t.colors.foreground, 0.15),
                  width: active ? 22 : 8,
                },
              ]}
            />
          );
        })}
      </View>

      {/* CTAs */}
      <View style={{ gap: 10, marginTop: 16 }}>
        <Button
          title="Começar agora"
          onPress={() => nav.navigate("Login", { mode: "signup" })}
        />
        <ButtonGhost
          title="Ver demonstração"
          onPress={() => nav.navigate("Login")}
        />
      </View>

      {/* Navegação entre slides (opcional) */}
      <View style={styles.navRow}>
        <Pressable onPress={() => goto(Math.max(index - 1, 0))}>
          <Text style={[s.text, { opacity: index === 0 ? 0.4 : 0.9 }]}>Voltar</Text>
        </Pressable>
        <Pressable onPress={() => goto(Math.min(index + 1, SLIDES.length - 1))}>
          <Text style={[s.text, { color: t.colors.primary }]}>
            {index === SLIDES.length - 1 ? "Concluir" : "Avançar"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function withOpacity(hex: string, alpha: number) {
  // aceita #RRGGBB ou rgba-ish do nosso tokens; fallback simples
  if (hex.startsWith("#") && hex.length === 7) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }
  // se vier rgba(...), apenas reduz a opacidade no “olhômetro”
  return hex;
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 4,
    paddingBottom: 12,
    marginBottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  brand: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  slide: {
    paddingHorizontal: 4,
  },
  heroCard: {
    padding: 16,
    minHeight: 320,
    justifyContent: "space-between",
  },
  previewBox: {
    marginTop: 16,
    height: 180,
    borderRadius: 12,
    overflow: "hidden",
    flexDirection: "row",
  },
  previewSidebar: {
    width: 100,
    borderRightWidth: 1,
    opacity: 0.6,
  },
  previewMain: {
    flex: 1,
    gap: 12,
    padding: 12,
  },
  previewBlock: {
    flex: 1,
    borderRadius: 10,
  },
  dots: {
    marginTop: 8,
    flexDirection: "row",
    gap: 8,
    alignSelf: "center",
  },
  dot: {
    height: 8,
    borderRadius: 999,
  },
  navRow: {
    marginTop: 12,
    flexDirection: "row",
    justifyContent: "space-between",
  },
});
