import React from "react";
import { View, Text, Pressable } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ArtsStackParamList } from "../Root/ArtsStack";

type Props = NativeStackScreenProps<ArtsStackParamList, "ArtsList">;

export default function ArtsList({ navigation }: Props) {
  // TODO: Liste suas artes de verdade; por enquanto, só um item fake
  return (
    <View style={{ flex: 1, padding: 16, gap: 12 }}>
      <Text style={{ fontSize: 18, fontWeight: "700" }}>Minhas Artes</Text>
      <Pressable
        onPress={() => navigation.navigate("Art", { arteId: "demo-1", titulo: "Arte de Exemplo" })}
        style={{ padding: 14, borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 12, backgroundColor: "#fff" }}
      >
        <Text style={{ fontWeight: "600" }}>Arte de Exemplo</Text>
        <Text style={{ opacity: 0.6, marginTop: 4 }}>Toque para abrir</Text>
      </Pressable>
    </View>
  );
}
