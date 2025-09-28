import React from "react";
import { View, Text, Pressable, FlatList } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ArtesStackParamList } from "../../Root/AppShell";

// ajuste para seus dados reais; por enquanto um mock
type ArteLite = { id: string; nome: string };

type Props = NativeStackScreenProps<ArtesStackParamList, "Artes">;

export default function ArtsList({ navigation }: Props) {
  const data: ArteLite[] = [
    { id: "demo-1", nome: "Banner Lançamento" },
    { id: "demo-2", nome: "Post Instagram" },
  ];

  return (
    <View style={{ flex: 1, padding: 16, gap: 12 }}>
      <Text style={{ fontSize: 18, fontWeight: "700" }}>Minhas Artes</Text>

      <FlatList
        data={data}
        keyExtractor={(it) => it.id}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => navigation.navigate("ArteDetails", { id: item.id })}
            style={{
              padding: 14,
              borderWidth: 1,
              borderColor: "#e5e7eb",
              borderRadius: 12,
              backgroundColor: "#fff",
            }}
            android_ripple={{ color: "#E5E7EB" }}
          >
            <Text style={{ fontWeight: "600" }}>{item.nome}</Text>
            <Text style={{ opacity: 0.6, marginTop: 4 }}>Toque para abrir</Text>
          </Pressable>
        )}
        ListEmptyComponent={<Text style={{ opacity: 0.6 }}>Sem artes ainda.</Text>}
      />
    </View>
  );
}
